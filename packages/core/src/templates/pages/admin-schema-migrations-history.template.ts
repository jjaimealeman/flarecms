import { renderAdminLayoutCatalyst, AdminLayoutCatalystData } from '../layouts/admin-layout-catalyst.template'

// ── Types ────────────────────────────────────────────────────────────

export interface SchemaMigrationsPageData {
  migrations: Array<{
    id: string
    collectionId: string
    collectionName: string
    description: string
    changes: Array<{
      type: string
      fieldName: string
      fieldLabel?: string
      fieldType?: string
    }>
    status: string
    appliedBy: string | null
    appliedAt: number
    rolledBackAt: number | null
    rolledBackBy: string | null
  }>
  total: number
  page: number
  pageSize: number
  collectionFilter?: string
  collectionName?: string
  collections: Array<{ id: string, name: string, display_name: string }>
  latestAppliedIds?: Set<string>
  user?: { name: string, email: string, role: string }
  version?: string
}

// ── Helpers ──────────────────────────────────────────────────────────

function relativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  return `${months} month${months === 1 ? '' : 's'} ago`
}

function statusBadge(status: string): string {
  switch (status) {
    case 'applied':
      return `<span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset bg-emerald-400/10 text-emerald-400 ring-emerald-400/30">Applied</span>`
    case 'rolled_back':
      return `<span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset bg-amber-400/10 text-amber-400 ring-amber-400/30">Rolled Back</span>`
    case 'failed':
      return `<span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset bg-red-400/10 text-red-400 ring-red-400/30">Failed</span>`
    default:
      return `<span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset bg-zinc-400/10 text-zinc-400 ring-zinc-400/30">${escapeHtml(status)}</span>`
  }
}

function changeTypeBadge(type: string): string {
  switch (type) {
    case 'add_field':
      return `<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-400/10 text-emerald-400 ring-1 ring-inset ring-emerald-400/30">Added</span>`
    case 'modify_field':
      return `<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-400/10 text-blue-400 ring-1 ring-inset ring-blue-400/30">Modified</span>`
    case 'remove_field':
      return `<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-400/10 text-red-400 ring-1 ring-inset ring-red-400/30">Removed</span>`
    default:
      return `<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-400/10 text-zinc-400 ring-1 ring-inset ring-zinc-400/30">${escapeHtml(type)}</span>`
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

// ── Template ─────────────────────────────────────────────────────────

export function renderSchemaMigrationsHistoryPage(data: SchemaMigrationsPageData): string {
  const { migrations, total, page, pageSize, collectionFilter, collectionName, collections, latestAppliedIds, user, version } = data
  const rollbackableIds = latestAppliedIds || new Set<string>()

  const totalPages = Math.ceil(total / pageSize)
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  const pageTitle = collectionName
    ? `Schema Migrations: ${escapeHtml(collectionName)}`
    : 'Schema Migrations'

  // Build filter query params (preserving collection filter in pagination)
  const filterParams: Record<string, string | undefined> = {}
  if (collectionFilter) filterParams.collection = collectionFilter

  const content = `
    <div>
      <!-- Header -->
      <div class="sm:flex sm:items-center sm:justify-between mb-6">
        <div class="sm:flex-auto">
          <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">${pageTitle}</h1>
          <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">
            Track all field changes across your collections.
          </p>
        </div>
      </div>

      <!-- Collection Filter -->
      <div class="mb-6">
        <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 px-6 py-4">
          <div class="flex items-center gap-4">
            <label for="collection-filter" class="text-sm font-medium text-zinc-950 dark:text-white whitespace-nowrap">Filter by collection</label>
            <select
              id="collection-filter"
              onchange="window.location.href = this.value ? '/admin/schema-migrations?collection=' + encodeURIComponent(this.value) : '/admin/schema-migrations'"
              class="w-full max-w-xs rounded-lg bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm px-4 py-2 text-sm text-zinc-950 dark:text-white border-2 border-blue-200/50 dark:border-blue-700/50 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300"
            >
              <option value="">All Collections</option>
              ${collections.map(col => `
                <option value="${escapeHtml(col.id)}" ${collectionFilter === col.id ? 'selected' : ''}>
                  ${escapeHtml(col.display_name || col.name)}
                </option>
              `).join('')}
            </select>
            <span class="text-sm/6 font-medium text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-full bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm whitespace-nowrap">
              ${total} ${total === 1 ? 'migration' : 'migrations'}
            </span>
          </div>
        </div>
      </div>

      <!-- Migration List -->
      ${migrations.length === 0 ? `
        <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 overflow-hidden">
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-zinc-950 dark:text-white">No schema migrations recorded yet</h3>
            <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Changes will appear here when you add, edit, or remove collection fields.</p>
          </div>
        </div>
      ` : `
        <div class="space-y-3">
          ${migrations.map(migration => `
            <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 overflow-hidden">
              <details class="group">
                <summary class="flex items-center gap-4 px-6 py-4 cursor-pointer list-none hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors [&::-webkit-details-marker]:hidden">
                  <!-- Expand icon -->
                  <svg class="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>

                  <!-- Status badge -->
                  <div class="shrink-0">
                    ${statusBadge(migration.status)}
                  </div>

                  <!-- Description and metadata -->
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                      ${escapeHtml(migration.description)}
                    </div>
                    <div class="mt-0.5 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>${escapeHtml(migration.collectionName)}</span>
                      <span class="text-zinc-300 dark:text-zinc-600">&middot;</span>
                      <span>${relativeTime(migration.appliedAt)}</span>
                      <span class="text-zinc-300 dark:text-zinc-600">&middot;</span>
                      <span>${migration.appliedBy ? escapeHtml(migration.appliedBy) : 'System'}</span>
                    </div>
                  </div>
                </summary>

                <!-- Expanded details -->
                <div class="border-t border-zinc-950/5 dark:border-white/5 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-800/30">
                  <!-- Changes list -->
                  <div class="mb-4">
                    <h4 class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Changes</h4>
                    <div class="space-y-2">
                      ${migration.changes.map(change => `
                        <div class="flex items-center gap-3">
                          ${changeTypeBadge(change.type)}
                          <span class="text-sm text-zinc-950 dark:text-white font-medium">${escapeHtml(change.fieldLabel || change.fieldName)}</span>
                          <span class="text-sm text-zinc-500 dark:text-zinc-400">(${escapeHtml(change.fieldName)})</span>
                          ${change.fieldType ? `<span class="text-xs text-zinc-400 dark:text-zinc-500">${escapeHtml(change.fieldType)}</span>` : ''}
                        </div>
                      `).join('')}
                      ${migration.changes.length === 0 ? `
                        <p class="text-sm text-zinc-500 dark:text-zinc-400 italic">No field-level changes recorded.</p>
                      ` : ''}
                    </div>
                  </div>

                  ${migration.status === 'rolled_back' && migration.rolledBackAt ? `
                    <div class="mt-3 pt-3 border-t border-zinc-950/5 dark:border-white/5">
                      <h4 class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Rollback Info</h4>
                      <p class="text-sm text-zinc-500 dark:text-zinc-400">
                        Rolled back ${relativeTime(migration.rolledBackAt)} by ${migration.rolledBackBy ? escapeHtml(migration.rolledBackBy) : 'System'}
                      </p>
                    </div>
                  ` : ''}

                  <!-- Migration ID and Actions -->
                  <div class="mt-3 pt-3 border-t border-zinc-950/5 dark:border-white/5 flex items-center justify-between">
                    <span class="text-xs text-zinc-400 dark:text-zinc-500 font-mono">${escapeHtml(migration.id)}</span>
                    ${migration.status === 'applied' && rollbackableIds.has(migration.id) ? `
                      <button
                        hx-post="/admin/schema-migrations/rollback/${escapeHtml(migration.id)}"
                        hx-confirm="Are you sure you want to rollback this migration? This will restore the previous schema."
                        hx-target="body"
                        class="inline-flex items-center gap-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 ring-1 ring-inset ring-red-400/30 transition-colors"
                      >
                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/>
                        </svg>
                        Rollback
                      </button>
                    ` : migration.status === 'applied' ? `
                      <span class="text-xs text-zinc-500 dark:text-zinc-500 italic" title="Only the most recent migration can be rolled back">
                        Not rollbackable
                      </span>
                    ` : ''}
                </div>
              </details>
            </div>
          `).join('')}
        </div>
      `}

      <!-- Pagination -->
      ${totalPages > 1 ? `
        <div class="mt-6 flex items-center justify-between">
          <div class="flex-1 flex justify-between sm:hidden">
            ${page > 1 ? `
              <a
                href="/admin/schema-migrations${buildQueryString({ ...filterParams, page: page - 1 })}"
                class="relative inline-flex items-center px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 text-sm font-medium text-zinc-950 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 transition-colors"
              >
                Previous
              </a>
            ` : `
              <span class="relative inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed">
                Previous
              </span>
            `}
            ${page < totalPages ? `
              <a
                href="/admin/schema-migrations${buildQueryString({ ...filterParams, page: page + 1 })}"
                class="ml-3 relative inline-flex items-center px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 text-sm font-medium text-zinc-950 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 transition-colors"
              >
                Next
              </a>
            ` : `
              <span class="ml-3 relative inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed">
                Next
              </span>
            `}
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-zinc-700 dark:text-zinc-300">
                Showing <span class="font-medium">${startItem}</span> to <span class="font-medium">${endItem}</span> of <span class="font-medium">${total}</span> migrations
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px" aria-label="Pagination">
                ${page > 1 ? `
                  <a
                    href="/admin/schema-migrations${buildQueryString({ ...filterParams, page: page - 1 })}"
                    class="relative inline-flex items-center px-2 py-2 rounded-l-lg bg-white dark:bg-zinc-800 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 transition-colors"
                  >
                    <span class="sr-only">Previous</span>
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </a>
                ` : ''}

                ${Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(totalPages - 9, page - 5)) + i
                  if (p > totalPages) return ''
                  return `
                    <a
                      href="/admin/schema-migrations${buildQueryString({ ...filterParams, page: p })}"
                      class="relative inline-flex items-center px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors ${
                        p === page
                          ? 'z-10 bg-blue-50 dark:bg-blue-900/20 ring-blue-600 dark:ring-blue-400 text-blue-600 dark:text-blue-400'
                          : 'bg-white dark:bg-zinc-800 ring-zinc-950/10 dark:ring-white/10 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                      }"
                    >
                      ${p}
                    </a>
                  `
                }).join('')}

                ${page < totalPages ? `
                  <a
                    href="/admin/schema-migrations${buildQueryString({ ...filterParams, page: page + 1 })}"
                    class="relative inline-flex items-center px-2 py-2 rounded-r-lg bg-white dark:bg-zinc-800 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 transition-colors"
                  >
                    <span class="sr-only">Next</span>
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                  </a>
                ` : ''}
              </nav>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `

  const layoutData: AdminLayoutCatalystData = {
    title: pageTitle,
    pageTitle,
    currentPath: '/admin/schema-migrations',
    user,
    version,
    content,
  }

  return renderAdminLayoutCatalyst(layoutData)
}
