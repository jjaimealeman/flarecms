import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { requireAuth } from '../middleware'
import type { Bindings, Variables } from '../app'
import { renderAdminPreviewPage } from '../templates/pages/admin-preview.template'
import { getCacheService, CACHE_CONFIGS } from '../services/cache'
import { isPluginActive } from '../middleware/plugin-middleware'
import { PluginService } from '../services/plugin-service'

const adminPreviewRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// --- Shared helpers (same logic as admin-content.ts) ---

async function getCollectionForPreview(db: D1Database, collectionId: string) {
  const cache = getCacheService(CACHE_CONFIGS.collection!)
  return cache.getOrSet(
    cache.generateKey('collection', collectionId),
    async () => {
      const stmt = db.prepare('SELECT * FROM collections WHERE id = ? AND is_active = 1')
      const collection = await stmt.bind(collectionId).first() as any
      if (!collection) return null
      return {
        id: collection.id,
        name: collection.name,
        display_name: collection.display_name,
        description: collection.description,
        schema: collection.schema ? JSON.parse(collection.schema) : {}
      }
    }
  )
}

async function getCollectionFieldsForPreview(db: D1Database, collectionId: string) {
  const cache = getCacheService(CACHE_CONFIGS.collection!)
  return cache.getOrSet(
    cache.generateKey('fields', collectionId),
    async () => {
      const collectionStmt = db.prepare('SELECT schema FROM collections WHERE id = ?')
      const collectionRow = await collectionStmt.bind(collectionId).first() as any

      if (collectionRow && collectionRow.schema) {
        try {
          const schema = typeof collectionRow.schema === 'string' ? JSON.parse(collectionRow.schema) : collectionRow.schema
          if (schema && schema.properties) {
            let fieldOrder = 0
            return Object.entries(schema.properties).map(([fieldName, fieldConfig]: [string, any]) => {
              let fieldOptions = { ...fieldConfig }
              if (fieldConfig.type === 'select' && fieldConfig.enum) {
                fieldOptions.options = fieldConfig.enum.map((value: string, index: number) => ({
                  value: value,
                  label: fieldConfig.enumLabels?.[index] || value
                }))
              }
              return {
                id: `schema-${fieldName}`,
                field_name: fieldName,
                field_type: fieldConfig.type || 'string',
                field_label: fieldConfig.title || fieldName,
                field_options: fieldOptions,
                field_order: fieldOrder++,
                is_required: fieldConfig.required === true || (schema.required && schema.required.includes(fieldName)),
                is_searchable: false
              }
            })
          }
        } catch (e) {
          console.error('Error parsing collection schema:', e)
        }
      }

      const stmt = db.prepare(`
        SELECT * FROM content_fields
        WHERE collection_id = ?
        ORDER BY field_order ASC
      `)
      const { results } = await stmt.bind(collectionId).all()
      return (results || []).map((row: any) => ({
        id: row.id,
        field_name: row.field_name,
        field_type: row.field_type,
        field_label: row.field_label,
        field_options: row.field_options ? JSON.parse(row.field_options) : {},
        field_order: row.field_order,
        is_required: row.is_required === 1,
        is_searchable: row.is_searchable === 1
      }))
    }
  )
}

// POST /draft - Store draft data in KV (auth-protected)
adminPreviewRoutes.post('/draft', requireAuth(), async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json<{
      collectionId: string
      contentId?: string
      data: Record<string, any>
      title?: string
      slug?: string
      status?: string
    }>()

    if (!body.collectionId) {
      return c.json({ error: 'collectionId is required' }, 400)
    }

    if (!body.data || typeof body.data !== 'object') {
      return c.json({ error: 'data object is required' }, 400)
    }

    const contentKey = body.contentId || 'new'
    const previewKey = `preview:${user.userId}:${body.collectionId}:${contentKey}`

    const draft = {
      collectionId: body.collectionId,
      contentId: body.contentId || null,
      title: body.title || null,
      slug: body.slug || null,
      status: body.status || 'draft',
      data: body.data,
      userId: user.userId,
      createdAt: Date.now()
    }

    await c.env.CACHE_KV.put(previewKey, JSON.stringify(draft), {
      expirationTtl: 300
    })

    return c.json({ token: previewKey, expiresIn: 300 })
  } catch (error) {
    console.error('Preview draft POST error:', error)
    return c.json({ error: 'Failed to store preview draft' }, 500)
  }
})

// GET /draft/:token - Retrieve draft data (unauthenticated, token-based access)
adminPreviewRoutes.get('/draft/:token', async (c) => {
  try {
    const token = decodeURIComponent(c.req.param('token'))

    const raw = await c.env.CACHE_KV.get(token)

    if (!raw) {
      return c.json({ error: 'Preview expired or not found' }, 404)
    }

    return c.json({ data: JSON.parse(raw) })
  } catch (error) {
    console.error('Preview draft GET error:', error)
    return c.json({ error: 'Failed to retrieve preview draft' }, 500)
  }
})

// GET /:collectionId/:contentId - Serve split-screen preview page (auth-protected)
adminPreviewRoutes.get('/:collectionId/:contentId', requireAuth(), async (c) => {
  try {
    const collectionId = c.req.param('collectionId')
    const contentId = c.req.param('contentId')
    const db = c.env.DB

    const collection = await getCollectionForPreview(db, collectionId)
    if (!collection) {
      return c.text('Collection not found', 404)
    }

    const fields = await getCollectionFieldsForPreview(db, collectionId)

    // Fetch existing content if not 'new'
    let content: any = { id: contentId }
    if (contentId !== 'new') {
      const contentStmt = db.prepare(`
        SELECT c.id, c.title, c.slug, c.status, c.data
        FROM content c
        WHERE c.id = ?
      `)
      const row = await contentStmt.bind(contentId).first() as any
      if (row) {
        content = {
          id: row.id,
          title: row.title,
          slug: row.slug,
          status: row.status,
          data: row.data ? JSON.parse(row.data) : {}
        }
      }
    }

    // Determine site URL for iframe
    const siteUrl = (c.env as any).SITE_URL
      || ((c.env as any).CORS_ORIGINS ? (c.env as any).CORS_ORIGINS.split(',')[0].trim() : null)
      || 'http://localhost:4321'

    // API URL is the CMS origin (same origin as this request)
    const reqUrl = new URL(c.req.url)
    const apiUrl = reqUrl.origin

    // Check if Quill plugin is active
    const quillEnabled = await isPluginActive(db, 'quill-editor')
    let quillSettings
    if (quillEnabled) {
      const pluginService = new PluginService(db)
      const quillPlugin = await pluginService.getPlugin('quill-editor')
      quillSettings = quillPlugin?.settings
    }

    const html = renderAdminPreviewPage({
      collection,
      content,
      fields,
      siteUrl,
      apiUrl,
      quillEnabled,
      quillSettings
    })

    return c.html(html)
  } catch (error) {
    console.error('Preview page GET error:', error)
    return c.text('Failed to load preview page', 500)
  }
})

export { adminPreviewRoutes }
export default adminPreviewRoutes
