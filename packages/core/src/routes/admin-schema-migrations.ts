import { Hono } from 'hono'
import { requireAuth } from '../middleware'
import { SchemaMigrationService } from '../services/schema-migration'
import { renderSchemaMigrationsHistoryPage } from '../templates/pages/admin-schema-migrations-history.template'

type Bindings = {
  DB: D1Database
  CACHE_KV: KVNamespace
  MEDIA_BUCKET: R2Bucket
  ASSETS: Fetcher
  EMAIL_QUEUE?: Queue
  SENDGRID_API_KEY?: string
  DEFAULT_FROM_EMAIL?: string
  IMAGES_ACCOUNT_ID?: string
  IMAGES_API_TOKEN?: string
  ENVIRONMENT?: string
}

type Variables = {
  user?: {
    userId: string
    email: string
    role: string
    exp: number
    iat: number
  }
  requestId?: string
  startTime?: number
  appVersion?: string
}

export const adminSchemaMigrationsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Apply authentication middleware
adminSchemaMigrationsRoutes.use('*', requireAuth())

// ── GET / — Migration history page ───────────────────────────────────

adminSchemaMigrationsRoutes.get('/', async (c) => {
  try {
    const user = c.get('user')
    const db = c.env.DB
    const url = new URL(c.req.url)

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.max(1, Math.min(100, parseInt(url.searchParams.get('pageSize') || '20', 10) || 20))
    const collectionFilter = url.searchParams.get('collection') || undefined

    // Look up collection name if filter is provided
    let collectionName: string | undefined
    if (collectionFilter) {
      const col = await db
        .prepare('SELECT display_name, name FROM collections WHERE id = ? AND is_active = 1')
        .bind(collectionFilter)
        .first<{ display_name: string; name: string }>()
      if (col) {
        collectionName = col.display_name || col.name
      }
    }

    // Fetch all collections for the filter dropdown
    const collectionsResult = await db
      .prepare('SELECT id, name, display_name FROM collections WHERE is_active = 1 ORDER BY display_name ASC')
      .all()
    const collections = (collectionsResult.results || []) as Array<{ id: string; name: string; display_name: string }>

    // Fetch migration history and latest rollbackable IDs
    const service = new SchemaMigrationService(db)
    const [{ migrations, total }, latestAppliedIds] = await Promise.all([
      service.getMigrationHistory({
        collectionId: collectionFilter,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      service.getLatestAppliedPerCollection(),
    ])

    const html = renderSchemaMigrationsHistoryPage({
      migrations,
      total,
      page,
      pageSize,
      collectionFilter,
      collectionName,
      collections,
      latestAppliedIds,
      user: user ? { name: user.email, email: user.email, role: user.role } : undefined,
      version: c.get('appVersion'),
    })

    return c.html(html)
  } catch (error) {
    console.error('Error rendering schema migrations page:', error)
    return c.text('Internal Server Error', 500)
  }
})

// ── POST /rollback/:id — Rollback a migration ────────────────────────

adminSchemaMigrationsRoutes.post('/rollback/:id', async (c) => {
  try {
    const migrationId = c.req.param('id')
    const user = c.get('user')
    const db = c.env.DB

    const service = new SchemaMigrationService(db)
    const result = await service.rollbackMigration(migrationId, user?.userId || null)

    const isHtmx = c.req.header('HX-Request') === 'true'

    if (isHtmx) {
      if (result.success) {
        c.header('HX-Redirect', '/admin/schema-migrations')
        return c.html(`
          <div class="bg-emerald-100 border border-emerald-400 text-emerald-700 px-4 py-3 rounded">
            Migration rolled back successfully. Redirecting...
          </div>
        `)
      } else {
        return c.html(`
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Rollback failed: ${result.error || 'Unknown error'}
          </div>
        `)
      }
    } else {
      if (result.success) {
        return c.redirect('/admin/schema-migrations')
      } else {
        return c.redirect(`/admin/schema-migrations?error=${encodeURIComponent(result.error || 'Rollback failed')}`)
      }
    }
  } catch (error) {
    console.error('Error rolling back migration:', error)
    const isHtmx = c.req.header('HX-Request') === 'true'
    if (isHtmx) {
      return c.html(`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Internal Server Error
        </div>
      `)
    }
    return c.text('Internal Server Error', 500)
  }
})

// ── GET /api — JSON API for migration history ────────────────────────

adminSchemaMigrationsRoutes.get('/api', async (c) => {
  try {
    const db = c.env.DB
    const url = new URL(c.req.url)

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.max(1, Math.min(100, parseInt(url.searchParams.get('pageSize') || '20', 10) || 20))
    const collectionFilter = url.searchParams.get('collection') || undefined

    const service = new SchemaMigrationService(db)
    const { migrations, total } = await service.getMigrationHistory({
      collectionId: collectionFilter,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    })

    return c.json({
      migrations,
      total,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('Error fetching schema migrations API:', error)
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})
