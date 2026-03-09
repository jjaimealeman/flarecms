import { Hono } from 'hono'
import { requireAuth } from '../middleware'
import type { Bindings, Variables } from '../app'

const adminPreviewRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

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

export { adminPreviewRoutes }
export default adminPreviewRoutes
