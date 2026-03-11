import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
}

export const apiFaqRoutes = new Hono<{ Bindings: Bindings }>()

// CORS for frontend consumption
apiFaqRoutes.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  maxAge: 86400
}))

// GET /api/faq — list published FAQs
apiFaqRoutes.get('/', async (c) => {
  try {
    const db = c.env.DB
    const category = c.req.query('category')

    let query = 'SELECT id, question, answer, category, tags, sortOrder FROM faqs WHERE isPublished = 1'
    const params: string[] = []

    if (category) {
      query += ' AND category = ?'
      params.push(category)
    }

    query += ' ORDER BY sortOrder ASC, created_at DESC'

    const { results } = await db.prepare(query).bind(...params).all()

    return c.json({
      faqs: results || [],
      count: results?.length || 0
    })
  } catch (error) {
    console.error('Error fetching FAQs:', error)
    return c.json({ error: 'Failed to load FAQs' }, 500)
  }
})

// GET /api/faq/categories — list unique categories
apiFaqRoutes.get('/categories', async (c) => {
  try {
    const db = c.env.DB
    const { results } = await db.prepare(
      'SELECT DISTINCT category FROM faqs WHERE isPublished = 1 AND category IS NOT NULL ORDER BY category'
    ).all()

    return c.json({
      categories: (results || []).map((r: any) => r.category)
    })
  } catch (error) {
    return c.json({ error: 'Failed to load categories' }, 500)
  }
})

export default apiFaqRoutes
