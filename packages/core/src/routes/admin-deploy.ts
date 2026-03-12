import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import { SettingsService } from '../services/settings'
import type { Bindings, Variables } from '../app'

const adminDeployRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminDeployRoutes.use('*', requireAuth())
adminDeployRoutes.use('*', requireRole('admin'))

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
 * Trigger a deploy via GitHub Actions workflow_dispatch
 */
adminDeployRoutes.post('/api/trigger', async (c) => {
  const user = c.get('user')
  if (user?.role !== 'admin') {
    return c.json({ error: 'Access denied' }, 403)
  }

  const db = c.env.DB
  const settings = new SettingsService(db)
  const ghToken = await settings.getSetting('deploy', 'github_token')
  const ghRepo = await settings.getSetting('deploy', 'github_repo')

  if (!ghToken || !ghRepo) {
    return c.json({ error: 'GitHub deploy not configured. Click the gear icon to set it up.' }, 400)
  }

  try {
    // Trigger GitHub Actions workflow_dispatch
    const response = await fetch(
      `https://api.github.com/repos/${ghRepo}/actions/workflows/deploy.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ghToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'FlareCMS-Admin',
        },
        body: JSON.stringify({ ref: 'main' }),
      }
    )

    if (response.status === 204) {
      // 204 No Content = success for workflow_dispatch
      const now = Date.now()
      await settings.setSetting('deploy', 'last_deployed_at', now)

      return c.json({
        success: true,
        deployedAt: now,
        message: 'Deploy triggered via GitHub Actions. Build takes ~60 seconds.'
      })
    }

    const errorBody = await response.text()
    return c.json({ error: `GitHub API returned ${response.status}: ${errorBody}` }, 502)
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
  const ghRepo = await settings.getSetting('deploy', 'github_repo')
  const ghToken = await settings.getSetting('deploy', 'github_token')
  const lastDeployedAt = await settings.getSetting('deploy', 'last_deployed_at')

  return c.json({
    githubRepo: ghRepo || '',
    hasToken: !!ghToken,
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

  if (body.githubRepo !== undefined) {
    await settings.setSetting('deploy', 'github_repo', body.githubRepo)
  }
  if (body.githubToken !== undefined) {
    await settings.setSetting('deploy', 'github_token', body.githubToken)
  }

  return c.json({ success: true })
})

export { adminDeployRoutes }
