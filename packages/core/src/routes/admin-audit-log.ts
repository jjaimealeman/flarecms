/**
 * Admin Audit Log Routes
 *
 * GET /admin/audit-log — filterable audit log page
 * GET /admin/audit-log/api/entries — JSON API for HTMX/fetch
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import { queryAuditLog } from '../services/audit-log'
import { renderAdminLayoutCatalyst } from '../templates/layouts/admin-layout-catalyst.template'
import type { Bindings, Variables } from '../app'

const adminAuditLogRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminAuditLogRoutes.use('/*', requireAuth())
adminAuditLogRoutes.use('/*', requireRole('admin'))

// Audit log page
adminAuditLogRoutes.get('/', async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const url = new URL(c.req.url)

  const filter = {
    userId: url.searchParams.get('user') || undefined,
    action: url.searchParams.get('action') || undefined,
    resourceType: url.searchParams.get('type') || undefined,
    limit: parseInt(url.searchParams.get('limit') || '50', 10),
    offset: parseInt(url.searchParams.get('offset') || '0', 10),
  }

  const { rows, total } = await queryAuditLog(db, filter)

  // Get unique users and actions for filter dropdowns
  const usersResult = await db.prepare('SELECT DISTINCT user_email FROM audit_log ORDER BY user_email').all()
  const actionsResult = await db.prepare('SELECT DISTINCT action FROM audit_log ORDER BY action').all()
  const typesResult = await db.prepare('SELECT DISTINCT resource_type FROM audit_log ORDER BY resource_type').all()

  const users = (usersResult.results || []).map((r: any) => r.user_email)
  const actions = (actionsResult.results || []).map((r: any) => r.action)
  const types = (typesResult.results || []).map((r: any) => r.resource_type)

  const currentPage = Math.floor(filter.offset / filter.limit) + 1
  const totalPages = Math.ceil(total / filter.limit)

  const actionLabels: Record<string, string> = {
    'content.create': 'Created',
    'content.update': 'Updated',
    'content.delete': 'Deleted',
    'content.restore': 'Restored',
    'content.publish': 'Published',
    'content.unpublish': 'Unpublished',
    'content.sync_approve': 'Sync Approved',
    'content.sync_reject': 'Sync Rejected',
    'media.upload': 'Uploaded',
    'media.delete': 'Deleted',
    'user.login': 'Logged in',
    'user.logout': 'Logged out',
    'user.login_failed': 'Login failed',
    'user.create': 'Created',
    'user.update': 'Updated',
    'user.delete': 'Deleted',
    'settings.update': 'Updated',
    'collection.create': 'Created',
    'collection.update': 'Updated',
    'collection.delete': 'Deleted',
  }

  const actionColors: Record<string, string> = {
    'create': 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
    'upload': 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
    'update': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10',
    'publish': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10',
    'sync_approve': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10',
    'delete': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10',
    'sync_reject': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
    'login': 'text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-500/10',
    'logout': 'text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-500/10',
    'login_failed': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10',
    'restore': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
    'unpublish': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
  }

  function getActionColor(action: string): string {
    const verb = action.split('.')[1] || ''
    return actionColors[verb] || 'text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-500/10'
  }

  function formatTime(ts: number): string {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  function timeAgo(ts: number): string {
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return mins + 'm ago'
    const hours = Math.floor(mins / 60)
    if (hours < 24) return hours + 'h ago'
    const days = Math.floor(hours / 24)
    return days + 'd ago'
  }

  const filterSelect = (name: string, label: string, options: string[], current?: string) => `
    <div>
      <label class="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">${label}</label>
      <select name="${name}" onchange="this.form.submit()"
        class="rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 w-full">
        <option value="">All</option>
        ${options.map(o => `<option value="${o}" ${o === current ? 'selected' : ''}>${o}</option>`).join('')}
      </select>
    </div>
  `

  const rowsHtml = rows.length === 0
    ? `<tr><td colspan="5" class="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">No audit entries found.</td></tr>`
    : rows.map(row => {
        const actionVerb = row.action.split('.')[1] || row.action
        const colorClass = getActionColor(row.action)
        const label = actionLabels[row.action] || actionVerb
        const resourceLink = row.resource_type === 'content' && row.resource_id
          ? `<a href="/admin/content/${row.resource_id}/edit" class="hover:text-blue-600 dark:hover:text-blue-400">${row.resource_title || row.resource_id}</a>`
          : (row.resource_title || row.resource_id || '-')
        let detailsText = ''
        if (row.details) {
          try {
            const d = JSON.parse(row.details)
            if (typeof d === 'object') {
              detailsText = Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', ')
            } else {
              detailsText = String(d)
            }
          } catch {
            detailsText = row.details
          }
          if (detailsText.length > 80) detailsText = detailsText.substring(0, 80) + '...'
        }

        return `
          <tr class="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
            <td class="px-4 py-3 text-sm">
              <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${colorClass}">
                ${label}
              </span>
            </td>
            <td class="px-4 py-3 text-sm text-zinc-950 dark:text-white">
              <span class="text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500">${row.resource_type}</span>
              <div>${resourceLink}</div>
              ${detailsText ? `<div class="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">${detailsText}</div>` : ''}
            </td>
            <td class="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">${row.user_email}</td>
            <td class="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400" title="${formatTime(row.created_at)}">${timeAgo(row.created_at)}</td>
            <td class="px-4 py-3 text-xs text-zinc-400 dark:text-zinc-500">${row.ip_address || ''}</td>
          </tr>
        `
      }).join('')

  const prevOffset = Math.max(0, filter.offset - filter.limit)
  const nextOffset = filter.offset + filter.limit
  const buildUrl = (params: Record<string, string | number>) => {
    const u = new URL(c.req.url)
    for (const [k, v] of Object.entries(params)) {
      if (v) u.searchParams.set(k, String(v))
      else u.searchParams.delete(k)
    }
    return u.pathname + u.search
  }

  const content = `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-zinc-950 dark:text-white">Audit Log</h1>
          <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">${total} total entries</p>
        </div>
      </div>

      <form method="get" action="/admin/audit-log" class="grid grid-cols-3 gap-4">
        ${filterSelect('user', 'User', users, filter.userId)}
        ${filterSelect('action', 'Action', actions, filter.action)}
        ${filterSelect('type', 'Resource Type', types, filter.resourceType)}
      </form>

      <div class="rounded-xl ring-1 ring-zinc-950/5 dark:ring-white/10 overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="bg-zinc-50 dark:bg-zinc-800/50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <th class="px-4 py-3">Action</th>
              <th class="px-4 py-3">Resource</th>
              <th class="px-4 py-3">User</th>
              <th class="px-4 py-3">When</th>
              <th class="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-zinc-900">
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      ${totalPages > 1 ? `
        <div class="flex items-center justify-between text-sm">
          <span class="text-zinc-500 dark:text-zinc-400">Page ${currentPage} of ${totalPages}</span>
          <div class="flex gap-2">
            ${currentPage > 1 ? `<a href="${buildUrl({ offset: prevOffset })}" class="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Previous</a>` : ''}
            ${currentPage < totalPages ? `<a href="${buildUrl({ offset: nextOffset })}" class="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Next</a>` : ''}
          </div>
        </div>
      ` : ''}
    </div>
  `

  return c.html(renderAdminLayoutCatalyst({
    title: 'Audit Log',
    currentPath: '/admin/audit-log',
    content,
    user: user ? {
      email: user.email,
      role: user.role,
      name: user.email,
    } : undefined,
  }))
})

export { adminAuditLogRoutes }
