import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware'
import { renderFaqList } from '../templates/pages/admin-faq-list.template'
import { renderFaqForm } from '../templates/pages/admin-faq-form.template'

type Bindings = {
  DB: D1Database
  CACHE_KV: KVNamespace
}

type Variables = {
  user?: {
    userId: string
    email: string
    role: string
    exp: number
    iat: number
  }
  appVersion?: string
}

const faqSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500, 'Question must be under 500 characters'),
  answer: z.string().min(1, 'Answer is required').max(5000, 'Answer must be under 5000 characters'),
  category: z.string().optional().transform(val => val || null),
  tags: z.string().optional().transform(val => val || null),
  isPublished: z.string().transform(val => val === 'true'),
  sortOrder: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0))
})

export const adminFaqRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminFaqRoutes.use('*', requireAuth())
adminFaqRoutes.use('*', requireRole(['admin', 'editor']))

// List all FAQs
adminFaqRoutes.get('/', async (c) => {
  try {
    const user = c.get('user')
    const db = c.env.DB
    const { category, published, search, page = '1' } = c.req.query()
    const currentPage = parseInt(page, 10) || 1
    const limit = 20
    const offset = (currentPage - 1) * limit

    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (published !== undefined && published !== '') {
      whereClause += ' AND isPublished = ?'
      params.push(published === 'true' ? 1 : 0)
    }

    if (category) {
      whereClause += ' AND category = ?'
      params.push(category)
    }

    if (search) {
      whereClause += ' AND (question LIKE ? OR answer LIKE ?)'
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm)
    }

    const countResult = await db.prepare(`SELECT COUNT(*) as count FROM faqs ${whereClause}`)
      .bind(...params).first<{ count: number }>()
    const totalCount = countResult?.count || 0

    const { results: faqs } = await db.prepare(`
      SELECT * FROM faqs ${whereClause}
      ORDER BY sortOrder ASC, created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all()

    // Get unique categories for filter
    const { results: cats } = await db.prepare('SELECT DISTINCT category FROM faqs WHERE category IS NOT NULL ORDER BY category').all()
    const categories = (cats || []).map((r: any) => r.category).filter(Boolean)

    const totalPages = Math.ceil(totalCount / limit)

    return c.html(renderFaqList({
      faqs: faqs || [],
      categories,
      totalCount,
      currentPage,
      totalPages,
      filters: { category, published, search },
      user: user ? { name: user.email, email: user.email, role: user.role } : undefined,
      version: c.get('appVersion')
    }))
  } catch (error) {
    console.error('Error fetching FAQs:', error)
    const user = c.get('user')
    return c.html(renderFaqList({
      faqs: [],
      categories: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 1,
      filters: {},
      user: user ? { name: user.email, email: user.email, role: user.role } : undefined,
      message: 'Failed to load FAQs',
      messageType: 'error'
    }))
  }
})

// New FAQ form
adminFaqRoutes.get('/new', async (c) => {
  const user = c.get('user')
  const db = c.env.DB

  // Get unique categories for dropdown
  const { results: cats } = await db.prepare('SELECT DISTINCT category FROM faqs WHERE category IS NOT NULL ORDER BY category').all()
  const categories = (cats || []).map((r: any) => r.category).filter(Boolean)

  return c.html(renderFaqForm({
    isEdit: false,
    categories,
    user: user ? { name: user.email, email: user.email, role: user.role } : undefined,
    version: c.get('appVersion')
  }))
})

// Create FAQ
adminFaqRoutes.post('/', async (c) => {
  try {
    const formData = await c.req.formData()
    const data = Object.fromEntries(formData.entries())
    const validatedData = faqSchema.parse(data)
    const db = c.env.DB

    await db.prepare(`
      INSERT INTO faqs (question, answer, category, tags, isPublished, sortOrder)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      validatedData.question,
      validatedData.answer,
      validatedData.category,
      validatedData.tags,
      validatedData.isPublished ? 1 : 0,
      validatedData.sortOrder
    ).run()

    return c.redirect('/admin/faq?message=FAQ created successfully')
  } catch (error) {
    console.error('Error creating FAQ:', error)
    const user = c.get('user')

    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {}
      error.issues.forEach(err => {
        const field = err.path[0] as string
        if (!errors[field]) errors[field] = []
        errors[field].push(err.message)
      })

      return c.html(renderFaqForm({
        isEdit: false,
        categories: [],
        user: user ? { name: user.email, email: user.email, role: user.role } : undefined,
        errors,
        message: 'Please correct the errors below',
        messageType: 'error'
      }))
    }

    return c.html(renderFaqForm({
      isEdit: false,
      categories: [],
      user: user ? { name: user.email, email: user.email, role: user.role } : undefined,
      message: 'Failed to create FAQ',
      messageType: 'error'
    }))
  }
})

// Edit FAQ form
adminFaqRoutes.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const user = c.get('user')
    const db = c.env.DB

    const faq = await db.prepare('SELECT * FROM faqs WHERE id = ?').bind(id).first()

    if (!faq) {
      return c.redirect('/admin/faq?message=FAQ not found&type=error')
    }

    const { results: cats } = await db.prepare('SELECT DISTINCT category FROM faqs WHERE category IS NOT NULL ORDER BY category').all()
    const categories = (cats || []).map((r: any) => r.category).filter(Boolean)

    return c.html(renderFaqForm({
      faq: {
        id: faq.id as number,
        question: faq.question as string,
        answer: faq.answer as string,
        category: faq.category as string | null,
        tags: faq.tags as string | null,
        isPublished: Boolean(faq.isPublished),
        sortOrder: faq.sortOrder as number
      },
      isEdit: true,
      categories,
      user: user ? { name: user.email, email: user.email, role: user.role } : undefined,
      version: c.get('appVersion')
    }))
  } catch (error) {
    console.error('Error fetching FAQ:', error)
    return c.redirect('/admin/faq?message=Failed to load FAQ&type=error')
  }
})

// Update FAQ
adminFaqRoutes.post('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const formData = await c.req.formData()
    const data = Object.fromEntries(formData.entries())
    const validatedData = faqSchema.parse(data)
    const db = c.env.DB

    // Check for _method override (HTML forms can't do PUT)
    const method = data._method as string
    if (method === 'DELETE') {
      await db.prepare('DELETE FROM faqs WHERE id = ?').bind(id).run()
      return c.redirect('/admin/faq?message=FAQ deleted successfully')
    }

    await db.prepare(`
      UPDATE faqs SET question = ?, answer = ?, category = ?, tags = ?, isPublished = ?, sortOrder = ?
      WHERE id = ?
    `).bind(
      validatedData.question,
      validatedData.answer,
      validatedData.category,
      validatedData.tags,
      validatedData.isPublished ? 1 : 0,
      validatedData.sortOrder,
      id
    ).run()

    return c.redirect('/admin/faq?message=FAQ updated successfully')
  } catch (error) {
    console.error('Error updating FAQ:', error)
    const user = c.get('user')

    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {}
      error.issues.forEach(err => {
        const field = err.path[0] as string
        if (!errors[field]) errors[field] = []
        errors[field].push(err.message)
      })

      return c.html(renderFaqForm({
        isEdit: true,
        categories: [],
        user: user ? { name: user.email, email: user.email, role: user.role } : undefined,
        errors,
        message: 'Please correct the errors below',
        messageType: 'error'
      }))
    }

    return c.html(renderFaqForm({
      isEdit: true,
      categories: [],
      user: user ? { name: user.email, email: user.email, role: user.role } : undefined,
      message: 'Failed to update FAQ',
      messageType: 'error'
    }))
  }
})

// Delete FAQ
adminFaqRoutes.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const db = c.env.DB

    await db.prepare('DELETE FROM faqs WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting FAQ:', error)
    return c.json({ error: 'Failed to delete FAQ' }, 500)
  }
})

export default adminFaqRoutes
