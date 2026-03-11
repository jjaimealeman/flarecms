import { Hono } from 'hono'
import { requireAuth } from '../middleware'
import { SettingsService } from '../services/settings'
import type { Bindings, Variables } from '../app'

const adminDeployRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminDeployRoutes.use('*', requireAuth())

/**
 * Get pending changes since last deploy
 */
adminDeployRoutes.get('/api/pending', async (c) => {
  const user = c.get('user')
  if (user?.role !== 'admin') {
    return c.json({ error: 'Access denied' }, 403)
  }

  const db = c.env.DB
  const settings = new SettingsService(db)
  const lastDeployedAt = await settings.getSetting('deploy', 'last_deployed_at')

  // If never deployed, show all published content as pending
  const since = lastDeployedAt || 0

  const { results } = await db.prepare(`
    SELECT
      c.id,
      c.title,
      c.slug,
      c.status,
      c.updated_at,
      c.created_at,
      col.name as collection_name,
      col.id as collection_id
    FROM content c
    JOIN collections col ON c.collection_id = col.id
    WHERE c.updated_at > ?
    ORDER BY c.updated_at DESC
  `).bind(since).all()

  return c.json({
    success: true,
    pending: results || [],
    count: results?.length || 0,
    lastDeployedAt: lastDeployedAt || null
  })
})

/**
 * Get pending changes count (lightweight, for sidebar badge)
 */
adminDeployRoutes.get('/api/pending-count', async (c) => {
  const db = c.env.DB
  const settings = new SettingsService(db)
  const lastDeployedAt = await settings.getSetting('deploy', 'last_deployed_at')
  const since = lastDeployedAt || 0

  const result = await db.prepare(`
    SELECT COUNT(*) as count FROM content WHERE updated_at > ?
  `).bind(since).first()

  return c.json({
    count: (result as any)?.count || 0
  })
})

/**
 * Trigger a deploy
 */
adminDeployRoutes.post('/api/trigger', async (c) => {
  const user = c.get('user')
  if (user?.role !== 'admin') {
    return c.json({ error: 'Access denied' }, 403)
  }

  const db = c.env.DB
  const settings = new SettingsService(db)
  const hookUrl = await settings.getSetting('deploy', 'hook_url')

  if (!hookUrl) {
    return c.json({ error: 'Deploy hook URL not configured. Go to Settings to add it.' }, 400)
  }

  try {
    // POST to Cloudflare Pages deploy hook
    const response = await fetch(hookUrl, { method: 'POST' })

    if (!response.ok) {
      return c.json({ error: `Deploy hook returned ${response.status}` }, 502)
    }

    // Update last_deployed_at
    const now = Date.now()
    await settings.setSetting('deploy', 'last_deployed_at', now)

    return c.json({
      success: true,
      deployedAt: now,
      message: 'Deploy triggered. Site will rebuild in ~30 seconds.'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to trigger deploy'
    return c.json({ error: message }, 500)
  }
})

/**
 * Get deploy settings
 */
adminDeployRoutes.get('/api/settings', async (c) => {
  const user = c.get('user')
  if (user?.role !== 'admin') {
    return c.json({ error: 'Access denied' }, 403)
  }

  const db = c.env.DB
  const settings = new SettingsService(db)
  const hookUrl = await settings.getSetting('deploy', 'hook_url')
  const lastDeployedAt = await settings.getSetting('deploy', 'last_deployed_at')

  return c.json({
    hookUrl: hookUrl || '',
    lastDeployedAt: lastDeployedAt || null
  })
})

/**
 * Save deploy settings
 */
adminDeployRoutes.post('/api/settings', async (c) => {
  const user = c.get('user')
  if (user?.role !== 'admin') {
    return c.json({ error: 'Access denied' }, 403)
  }

  const body = await c.req.json()
  const db = c.env.DB
  const settings = new SettingsService(db)

  if (body.hookUrl !== undefined) {
    await settings.setSetting('deploy', 'hook_url', body.hookUrl)
  }

  return c.json({ success: true })
})

export { adminDeployRoutes }
