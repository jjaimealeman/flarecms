/**
 * Admin API Token Management Routes
 *
 * Provides UI for creating and revoking read-only API tokens with collection scoping.
 * Token values are shown ONCE at creation — only the prefix is stored/displayed after.
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import { createApiToken, listApiTokens, revokeApiToken } from '../services/api-tokens'
import { renderAdminLayoutCatalyst } from '../templates/layouts/admin-layout-catalyst.template'
import type { Bindings, Variables } from '../app'

export const adminApiTokensRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Apply authentication middleware — only admins can manage tokens
adminApiTokensRoutes.use('*', requireAuth())
adminApiTokensRoutes.use('*', requireRole('admin'))

// ============================================================================
// Helper: format timestamp
// ============================================================================

function formatDate(ts: number | null): string {
  if (!ts) return 'Never'
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================================================
// GET /admin/api-tokens — List tokens
// ============================================================================

adminApiTokensRoutes.get('/', async (c) => {
  const user = c.get('user')
  const db = c.env.DB

  try {
    const tokens = await listApiTokens(db)

    const rows = tokens.length === 0
      ? `<tr><td colspan="6" class="px-6 py-8 text-center text-zinc-400 text-sm">No API tokens yet. Create one to get started.</td></tr>`
      : tokens.map(token => {
          const isExpired = token.expires_at !== null && token.expires_at < Date.now()
          const statusBadge = isExpired
            ? `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20">Expired</span>`
            : `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/20">Active</span>`

          const collectionsDisplay = token.allowed_collections
            ? token.allowed_collections.map(c => `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-500/10 text-blue-300 ring-1 ring-inset ring-blue-400/20 mr-1">${c}</span>`).join('')
            : '<span class="text-zinc-500 text-xs">All collections</span>'

          return `
            <tr class="hover:bg-zinc-800/30 transition-colors">
              <td class="px-6 py-4">
                <div class="font-medium text-sm text-white">${token.name}</div>
                <div class="text-xs text-zinc-400 font-mono mt-0.5">${token.token_prefix}</div>
              </td>
              <td class="px-6 py-4 text-sm">${statusBadge}</td>
              <td class="px-6 py-4 text-sm">${collectionsDisplay}</td>
              <td class="px-6 py-4 text-sm text-zinc-400">${formatDate(token.last_used_at)}</td>
              <td class="px-6 py-4 text-sm text-zinc-400">${token.expires_at ? formatDate(token.expires_at) : 'Never'}</td>
              <td class="px-6 py-4 text-right">
                <form method="POST" action="/admin/api-tokens/${token.id}/revoke" onsubmit="return confirm('Revoke token \\'${token.name}\\'? This cannot be undone.')">
                  <button type="submit" class="text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded border border-red-500/30 hover:border-red-400/50">
                    Revoke
                  </button>
                </form>
              </td>
            </tr>
          `
        }).join('')

    const content = `
      <div class="px-4 sm:px-6 lg:px-8 py-8">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-semibold text-white">API Tokens</h1>
            <p class="text-sm text-zinc-400 mt-1">Read-only tokens for headless API access. Scoped to specific collections.</p>
          </div>
          <a href="/admin/api-tokens/create"
             class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Create Token
          </a>
        </div>

        <!-- Token list -->
        <div class="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table class="w-full text-left">
            <thead>
              <tr class="border-b border-zinc-800">
                <th class="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Token</th>
                <th class="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Collections</th>
                <th class="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Last Used</th>
                <th class="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Expires</th>
                <th class="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800">
              ${rows}
            </tbody>
          </table>
        </div>

        <!-- Info box -->
        <div class="mt-4 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
          <h3 class="text-sm font-medium text-zinc-300 mb-2">How to use API tokens</h3>
          <p class="text-xs text-zinc-400 mb-2">Include the token in your request headers:</p>
          <pre class="text-xs text-blue-300 bg-zinc-900 px-3 py-2 rounded font-mono overflow-x-auto">X-API-Key: st_your_token_here</pre>
          <p class="text-xs text-zinc-500 mt-2">Tokens are read-only and scoped to specific collections. Write operations (POST, PUT, DELETE) will be rejected.</p>
        </div>
      </div>
    `

    return c.html(renderAdminLayoutCatalyst({
      title: 'API Tokens',
      currentPath: '/admin/api-tokens',
      user: user ? { name: user.email, email: user.email, role: user.role } : undefined,
      content,
    }))
  } catch (err) {
    console.error('Error loading API tokens:', err)
    return c.json({ error: 'Failed to load API tokens' }, 500)
  }
})

// ============================================================================
// GET /admin/api-tokens/create — Create form
// ============================================================================

adminApiTokensRoutes.get('/create', async (c) => {
  const user = c.get('user')
  const db = c.env.DB

  try {
    // Fetch all active collections for the checkboxes
    const collectionsResult = await db.prepare(
      'SELECT id, name, display_name FROM collections WHERE is_active = 1 ORDER BY display_name ASC'
    ).all()
    const collections = collectionsResult.results as { id: string; name: string; display_name: string }[]

    const collectionCheckboxes = collections.length === 0
      ? '<p class="text-sm text-zinc-400">No collections found.</p>'
      : collections.map(col => `
          <label class="flex items-center gap-3 p-3 rounded-lg border border-zinc-700 hover:border-zinc-500 cursor-pointer transition-colors">
            <input type="checkbox" name="allowedCollections" value="${col.name}"
                   class="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500">
            <div>
              <div class="text-sm font-medium text-white">${col.display_name || col.name}</div>
              <div class="text-xs text-zinc-400 font-mono">${col.name}</div>
            </div>
          </label>
        `).join('')

    const content = `
      <div class="px-4 sm:px-6 lg:px-8 py-8 max-w-2xl">
        <!-- Header -->
        <div class="mb-6">
          <div class="flex items-center gap-2 text-sm text-zinc-400 mb-2">
            <a href="/admin/api-tokens" class="hover:text-white transition-colors">API Tokens</a>
            <span>/</span>
            <span class="text-white">Create</span>
          </div>
          <h1 class="text-2xl font-semibold text-white">Create API Token</h1>
          <p class="text-sm text-zinc-400 mt-1">The token value will be shown once after creation. Store it securely.</p>
        </div>

        <!-- Form -->
        <form method="POST" action="/admin/api-tokens" class="space-y-6">
          <!-- Name -->
          <div>
            <label for="name" class="block text-sm font-medium text-zinc-300 mb-1.5">Token Name *</label>
            <input type="text" id="name" name="name" required placeholder="e.g. Astro frontend production"
                   class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
            <p class="text-xs text-zinc-500 mt-1">Descriptive name to identify where this token is used.</p>
          </div>

          <!-- Expiration -->
          <div>
            <label for="expiresAt" class="block text-sm font-medium text-zinc-300 mb-1.5">Expiration</label>
            <select id="expiresAt" name="expiresAt"
                    class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
              <option value="">Never expires</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
              <option value="180d">180 days</option>
              <option value="365d">1 year</option>
            </select>
          </div>

          <!-- Collection scope -->
          <div>
            <label class="block text-sm font-medium text-zinc-300 mb-1.5">Collection Access</label>
            <p class="text-xs text-zinc-500 mb-3">Leave all unchecked to allow access to all collections.</p>
            <div class="space-y-2">
              ${collectionCheckboxes}
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3 pt-2">
            <button type="submit"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
              Create Token
            </button>
            <a href="/admin/api-tokens"
               class="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
              Cancel
            </a>
          </div>
        </form>
      </div>
    `

    return c.html(renderAdminLayoutCatalyst({
      title: 'Create API Token',
      currentPath: '/admin/api-tokens',
      user: user ? { name: user.email, email: user.email, role: user.role } : undefined,
      content,
    }))
  } catch (err) {
    console.error('Error rendering create token form:', err)
    return c.json({ error: 'Failed to load create form' }, 500)
  }
})

// ============================================================================
// POST /admin/api-tokens — Create token
// ============================================================================

adminApiTokensRoutes.post('/', async (c) => {
  const user = c.get('user')
  const db = c.env.DB

  try {
    const formData = await c.req.formData()
    const name = (formData.get('name') as string | null)?.trim()
    const expiresAtStr = formData.get('expiresAt') as string | null
    const allowedCollectionsRaw = formData.getAll('allowedCollections') as string[]

    if (!name) {
      return c.html(renderAdminLayoutCatalyst({
        title: 'Create API Token',
        currentPath: '/admin/api-tokens',
        user: user ? { name: user.email, email: user.email, role: user.role } : undefined,
        content: `<div class="px-8 py-8"><div class="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">Token name is required.</div><a href="/admin/api-tokens/create" class="mt-4 inline-block text-blue-400 hover:text-blue-300 text-sm">← Back to form</a></div>`,
      }), 400)
    }

    // Calculate expiry timestamp
    let expiresAt: number | null = null
    if (expiresAtStr) {
      const days = parseInt(expiresAtStr.replace('d', ''), 10)
      if (!isNaN(days)) {
        expiresAt = Date.now() + days * 24 * 60 * 60 * 1000
      }
    }

    // Null means "all collections"
    const allowedCollections = allowedCollectionsRaw.length > 0 ? allowedCollectionsRaw : null

    const result = await createApiToken(db, {
      name,
      userId: user!.userId,
      allowedCollections,
      expiresAt,
    })

    const scopeDisplay = allowedCollections
      ? allowedCollections.map(c => `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-500/10 text-blue-300 ring-1 ring-inset ring-blue-400/20 mr-1">${c}</span>`).join('')
      : '<span class="text-zinc-400 text-xs">All collections</span>'

    const expiresDisplay = expiresAt
      ? formatDate(expiresAt)
      : 'Never'

    // Show token value ONCE
    const content = `
      <div class="px-4 sm:px-6 lg:px-8 py-8 max-w-2xl">
        <!-- Success header -->
        <div class="mb-6">
          <div class="flex items-center gap-2 text-sm text-zinc-400 mb-2">
            <a href="/admin/api-tokens" class="hover:text-white transition-colors">API Tokens</a>
            <span>/</span>
            <span class="text-white">Token Created</span>
          </div>
          <h1 class="text-2xl font-semibold text-white">Token Created</h1>
        </div>

        <!-- One-time reveal box -->
        <div class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-6">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div>
              <p class="text-sm font-medium text-amber-400">Copy this token now — it will not be shown again</p>
              <p class="text-xs text-amber-300/70 mt-0.5">This is the only time you will see the full token value.</p>
            </div>
          </div>
        </div>

        <!-- Token value -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-zinc-300 mb-1.5">Your API Token</label>
          <div class="flex items-center gap-2">
            <code id="tokenValue" class="flex-1 px-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-green-300 font-mono break-all">${result.tokenValue}</code>
            <button onclick="copyToken()" title="Copy token"
                    class="flex-shrink-0 p-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Token details -->
        <div class="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800 mb-6">
          <div class="px-4 py-3 flex items-center justify-between">
            <span class="text-sm text-zinc-400">Name</span>
            <span class="text-sm font-medium text-white">${name}</span>
          </div>
          <div class="px-4 py-3 flex items-center justify-between">
            <span class="text-sm text-zinc-400">Prefix</span>
            <code class="text-sm text-zinc-300 font-mono">${result.tokenPrefix}</code>
          </div>
          <div class="px-4 py-3 flex items-center justify-between">
            <span class="text-sm text-zinc-400">Collections</span>
            <div>${scopeDisplay}</div>
          </div>
          <div class="px-4 py-3 flex items-center justify-between">
            <span class="text-sm text-zinc-400">Expires</span>
            <span class="text-sm text-zinc-300">${expiresDisplay}</span>
          </div>
          <div class="px-4 py-3 flex items-center justify-between">
            <span class="text-sm text-zinc-400">Permissions</span>
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/20">Read-only</span>
          </div>
        </div>

        <!-- Usage example -->
        <div class="mb-6">
          <h3 class="text-sm font-medium text-zinc-300 mb-2">Usage example</h3>
          <pre class="text-xs text-blue-300 bg-zinc-900 px-3 py-3 rounded-lg font-mono overflow-x-auto border border-zinc-800">curl -H "X-API-Key: ${result.tokenValue}" \\
  http://localhost:8787/api/collections/blog-posts/content</pre>
        </div>

        <a href="/admin/api-tokens"
           class="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          Back to tokens
        </a>

        <script>
          function copyToken() {
            const token = document.getElementById('tokenValue').textContent
            navigator.clipboard.writeText(token).then(() => {
              const btn = event.currentTarget
              btn.innerHTML = '<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
              setTimeout(() => {
                btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>'
              }, 2000)
            })
          }
        </script>
      </div>
    `

    return c.html(renderAdminLayoutCatalyst({
      title: 'Token Created',
      currentPath: '/admin/api-tokens',
      user: user ? { name: user.email, email: user.email, role: user.role } : undefined,
      content,
    }))
  } catch (err) {
    console.error('Error creating API token:', err)
    return c.json({ error: 'Failed to create API token' }, 500)
  }
})

// ============================================================================
// POST /admin/api-tokens/:id/revoke — Revoke token
// ============================================================================

adminApiTokensRoutes.post('/:id/revoke', async (c) => {
  const tokenId = c.req.param('id')
  const db = c.env.DB

  try {
    await revokeApiToken(db, tokenId)
    return c.redirect('/admin/api-tokens')
  } catch (err) {
    console.error('Error revoking token:', err)
    return c.json({ error: 'Failed to revoke token' }, 500)
  }
})
