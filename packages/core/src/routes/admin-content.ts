import { Hono } from 'hono'
import { html } from 'hono/html'
import type { D1Database, KVNamespace } from '@cloudflare/workers-types'
import { requireAuth } from '../middleware'
import { renderContentFormPage, ContentFormData } from '../templates/pages/admin-content-form.template'
import { renderContentListPage, ContentListPageData } from '../templates/pages/admin-content-list.template'
import { renderVersionHistory, VersionHistoryData, ContentVersion } from '../templates/components/version-history.template'
import { isPluginActive } from '../middleware/plugin-middleware'
import { getCacheService, CACHE_CONFIGS } from '../services/cache'
import { validateStatusTransition, isSlugLocked } from '../services/content-state-machine'
import { checkCollectionPermission, getCollectionPermissions, isAuthorAllowedToEdit } from '../services/rbac'
import { logStatusChange, logContentEdit, computeFieldDiff } from '../services/audit-trail'
import { createPendingRevision, getLatestPendingRevision } from '../services/revisions'
import type { Bindings, Variables } from '../app'
import { PluginService } from '../services/plugin-service'
import { getBlocksFieldConfig, parseBlocksValue } from '../utils/blocks'
import { SettingsService } from '../services/settings'

const adminContentRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/**
 * Auto-purge trash items past their retention period.
 * Cascades to content_versions and workflow_history.
 */
async function purgeExpiredTrash(db: D1Database): Promise<void> {
  const settingsService = new SettingsService(db)
  const retentionDays = await settingsService.getSetting('general', 'trashRetentionDays') ?? 30
  if (retentionDays <= 0) return // 0 = keep forever

  const cutoffMs = Date.now() - (retentionDays * 24 * 60 * 60 * 1000)

  // Find expired trash items
  const { results } = await db.prepare(
    'SELECT id FROM content WHERE status = ? AND deleted_at IS NOT NULL AND deleted_at < ?'
  ).bind('deleted', cutoffMs).all()

  if (!results || results.length === 0) return

  const ids = results.map((r: any) => r.id)
  const placeholders = ids.map(() => '?').join(',')

  // Cascade delete: children first, then content
  await db.prepare(`DELETE FROM workflow_history WHERE content_id IN (${placeholders})`).bind(...ids).run()
  await db.prepare(`DELETE FROM content_versions WHERE content_id IN (${placeholders})`).bind(...ids).run()
  await db.prepare(`DELETE FROM content WHERE id IN (${placeholders})`).bind(...ids).run()

  console.log(`Auto-purged ${ids.length} expired trash item(s)`)
}

// Field definition type for form processing
interface FieldDefinition {
  field_name: string
  field_label: string
  field_type: string
  field_options?: any
  is_required?: boolean
}

// Result of parsing a single field value
interface ParsedFieldResult {
  value: any
  errors: string[]
}

/**
 * Parse a single field value from form data with validation
 * Centralizes field parsing logic used in POST, PUT, and preview handlers
 */
function parseFieldValue(
  field: FieldDefinition,
  formData: FormData,
  options: { skipValidation?: boolean } = {}
): ParsedFieldResult {
  const { skipValidation = false } = options
  const value = formData.get(field.field_name)
  const errors: string[] = []

  // Handle blocks fields (array with blocks config)
  const blocksConfig = getBlocksFieldConfig(field.field_options)
  if (blocksConfig) {
    const parsed = parseBlocksValue(value, blocksConfig)
    if (!skipValidation && field.is_required && parsed.value.length === 0) {
      parsed.errors.push(`${field.field_label} is required`)
    }
    return { value: parsed.value, errors: parsed.errors }
  }

  // Required field validation
  if (!skipValidation && field.is_required && (!value || value.toString().trim() === '')) {
    return { value: null, errors: [`${field.field_label} is required`] }
  }

  // Type-specific parsing
  switch (field.field_type) {
    case 'number':
      if (value && isNaN(Number(value))) {
        if (!skipValidation) {
          errors.push(`${field.field_label} must be a valid number`)
        }
        return { value: null, errors }
      }
      return { value: value ? Number(value) : null, errors: [] }

    case 'boolean':
      // Check for the hidden _submitted field to determine if checkbox was rendered
      const submitted = formData.get(`${field.field_name}_submitted`)
      return { value: submitted ? value === 'true' : false, errors: [] }

    case 'select':
      if (field.field_options?.multiple) {
        return { value: formData.getAll(`${field.field_name}[]`), errors: [] }
      }
      return { value: value, errors: [] }

    case 'array': {
      if (!value || value.toString().trim() === '') {
        if (!skipValidation && field.is_required) {
          errors.push(`${field.field_label} is required`)
        }
        return { value: [], errors }
      }
      try {
        const parsed = JSON.parse(value.toString())
        if (!Array.isArray(parsed)) {
          if (!skipValidation) {
            errors.push(`${field.field_label} must be a JSON array`)
          }
          return { value: [], errors }
        }
        if (!skipValidation && field.is_required && parsed.length === 0) {
          errors.push(`${field.field_label} is required`)
        }
        return { value: parsed, errors }
      } catch {
        if (!skipValidation) {
          errors.push(`${field.field_label} must be valid JSON`)
        }
        return { value: [], errors }
      }
    }

    case 'object': {
      if (!value || value.toString().trim() === '') {
        if (!skipValidation && field.is_required) {
          errors.push(`${field.field_label} is required`)
        }
        return { value: {}, errors }
      }
      try {
        const parsed = JSON.parse(value.toString())
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          if (!skipValidation) {
            errors.push(`${field.field_label} must be a JSON object`)
          }
          return { value: {}, errors }
        }
        if (!skipValidation && field.is_required && Object.keys(parsed).length === 0) {
          errors.push(`${field.field_label} is required`)
        }
        return { value: parsed, errors }
      } catch {
        if (!skipValidation) {
          errors.push(`${field.field_label} must be valid JSON`)
        }
        return { value: {}, errors }
      }
    }

    case 'json': {
      if (!value || value.toString().trim() === '') {
        if (!skipValidation && field.is_required) {
          errors.push(`${field.field_label} is required`)
        }
        return { value: null, errors }
      }
      try {
        return { value: JSON.parse(value.toString()), errors: [] }
      } catch {
        if (!skipValidation) {
          errors.push(`${field.field_label} must be valid JSON`)
        }
        return { value: null, errors }
      }
    }

    default:
      return { value: value, errors: [] }
  }
}

/**
 * Extract all field values from form data
 */
function extractFieldData(
  fields: FieldDefinition[],
  formData: FormData,
  options: { skipValidation?: boolean } = {}
): { data: Record<string, any>; errors: Record<string, string[]> } {
  const data: Record<string, any> = {}
  const errors: Record<string, string[]> = {}

  for (const field of fields) {
    const result = parseFieldValue(field, formData, options)
    data[field.field_name] = result.value
    if (result.errors.length > 0) {
      errors[field.field_name] = result.errors
    }
  }

  return { data, errors }
}

// Apply authentication middleware
adminContentRoutes.use('*', requireAuth())

// Get collection fields
async function getCollectionFields(db: D1Database, collectionId: string) {
  const cache = getCacheService(CACHE_CONFIGS.collection!)

  return cache.getOrSet(
    cache.generateKey('fields', collectionId),
    async () => {
      // First, check if collection has a schema (code-based collection)
      const collectionStmt = db.prepare('SELECT schema FROM collections WHERE id = ?')
      const collectionRow = await collectionStmt.bind(collectionId).first() as any

      if (collectionRow && collectionRow.schema) {
        try {
          const schema = typeof collectionRow.schema === 'string' ? JSON.parse(collectionRow.schema) : collectionRow.schema
          if (schema && schema.properties) {
            // Convert schema properties to field format
            let fieldOrder = 0
            return Object.entries(schema.properties).map(([fieldName, fieldConfig]: [string, any]) => {
              // For select fields, convert enum/enumLabels to options array
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

      // Fall back to content_fields table for legacy collections
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

// Get collection by ID
async function getCollection(db: D1Database, collectionId: string) {
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

// Content list (main page)
adminContentRoutes.get('/', async (c) => {
  try {
    const user = c.get('user')
    const url = new URL(c.req.url)
    const db = c.env.DB
    
    // Get query parameters
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    let modelName = url.searchParams.get('model') || 'all'
    const collectionParam = url.searchParams.get('collection') || ''
    const status = url.searchParams.get('status') || 'all'
    const search = url.searchParams.get('search') || ''
    const offset = (page - 1) * limit

    // Auto-purge expired trash (fire-and-forget, non-blocking)
    purgeExpiredTrash(db).catch(err => console.error('Auto-purge error:', err))

    // Get collections — non-admin users only see collections they have permission for
    let allowedCollectionIds: string[] | null = null
    if (user && user.role !== 'admin') {
      const userPerms = await getCollectionPermissions(db, user.userId)
      allowedCollectionIds = userPerms.map(p => p.collectionId)
    }

    const collectionsStmt = db.prepare('SELECT id, name, display_name FROM collections WHERE is_active = 1 ORDER BY display_name')
    const { results: collectionsResults } = await collectionsStmt.all()
    const allCollections = (collectionsResults || []) as Array<{ id: string; name: string; display_name: string }>
    const filteredCollections = allowedCollectionIds !== null
      ? allCollections.filter(c => allowedCollectionIds!.includes(c.id))
      : allCollections
    // Deduplicate by collection name (guards against duplicate DB entries)
    const seen = new Set<string>()
    const models = filteredCollections
      .filter((row) => {
        if (seen.has(row.name)) return false
        seen.add(row.name)
        return true
      })
      .map((row) => ({
        name: row.name,
        displayName: row.display_name
      }))

    // Resolve ?collection=<id> to model name if ?model= wasn't provided
    if (modelName === 'all' && collectionParam) {
      const match = allCollections.find(c => c.id === collectionParam)
      if (match) modelName = match.name
    }

    // Build where conditions
    const conditions: string[] = []
    const params: any[] = []

    // Always filter out deleted content unless specifically requested
    if (status !== 'deleted') {
      conditions.push("c.status != 'deleted'")
    }

    if (search) {
      conditions.push('(c.title LIKE ? OR c.slug LIKE ? OR c.data LIKE ?)')
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    if (modelName !== 'all') {
      conditions.push('col.name = ?')
      params.push(modelName)
    }

    if (status !== 'all' && status !== 'deleted') {
      conditions.push('c.status = ?')
      params.push(status)
    } else if (status === 'deleted') {
      conditions.push("c.status = 'deleted'")
    }

    // RBAC: restrict non-admin users to their allowed collections only
    if (allowedCollectionIds !== null) {
      if (allowedCollectionIds.length === 0) {
        // User has no collection permissions — return empty result
        const emptyPageData: ContentListPageData = {
          contentItems: [],
          totalItems: 0,
          page,
          itemsPerPage: limit,
          models,
          modelName,
          status,
          search,
          user: user ? { name: user.email, email: user.email, role: user.role } : undefined
        }
        return c.html(renderContentListPage(emptyPageData))
      }
      const placeholders = allowedCollectionIds.map(() => '?').join(', ')
      conditions.push(`c.collection_id IN (${placeholders})`)
      params.push(...allowedCollectionIds)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    
    // Get total count
    const countStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM content c
      JOIN collections col ON c.collection_id = col.id
      ${whereClause}
    `)
    const countResult = await countStmt.bind(...params).first() as any
    const totalItems = countResult?.count || 0
    
    // Get content items
    const contentStmt = db.prepare(`
      SELECT c.id, COALESCE(NULLIF(c.title, 'Untitled'), json_extract(c.data, '$.name'), c.title) as title,
             c.slug, c.status, c.created_at, c.updated_at,
             col.name as collection_name, col.display_name as collection_display_name,
             u.first_name, u.last_name, u.email as author_email
      FROM content c
      JOIN collections col ON c.collection_id = col.id
      LEFT JOIN users u ON c.author_id = u.id
      ${whereClause}
      ORDER BY c.updated_at DESC
      LIMIT ? OFFSET ?
    `)
    const { results } = await contentStmt.bind(...params, limit, offset).all()
    
    // Process content items
    const contentItems = (results || []).map((row: any) => {
      const statusConfig: Record<string, { class: string; text: string }> = {
        draft: {
          class: 'bg-zinc-50 dark:bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 ring-1 ring-inset ring-zinc-600/20 dark:ring-zinc-500/20',
          text: 'Draft'
        },
        review: {
          class: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-600/20 dark:ring-amber-500/20',
          text: 'Under Review'
        },
        scheduled: {
          class: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-600/20 dark:ring-blue-500/20',
          text: 'Scheduled'
        },
        published: {
          class: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/20',
          text: 'Published'
        },
        archived: {
          class: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 ring-1 ring-inset ring-purple-600/20 dark:ring-purple-500/20',
          text: 'Archived'
        },
        deleted: {
          class: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-600/20 dark:ring-red-500/20',
          text: 'Deleted'
        }
      }

      const config = statusConfig[row.status as keyof typeof statusConfig] || statusConfig.draft
      const statusBadge = `
        <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${config?.class || ''}">
          ${config?.text || row.status}
        </span>
      `
      
      const authorName = row.first_name && row.last_name 
        ? `${row.first_name} ${row.last_name}`
        : row.author_email || 'Unknown'
      
      const updatedDate = new Date(row.updated_at)
      const formattedDate = updatedDate.getFullYear() >= 2000 ? updatedDate.toLocaleDateString() : '—'
      
      // Determine available workflow actions based on status
      const availableActions: string[] = []
      switch (row.status) {
        case 'draft':
          availableActions.push('submit_for_review', 'publish')
          break
        case 'review':
          availableActions.push('approve', 'request_changes')
          break
        case 'published':
          availableActions.push('unpublish', 'archive')
          break
        case 'scheduled':
          availableActions.push('unschedule')
          break
      }
      
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        modelName: row.collection_display_name,
        statusBadge,
        authorName,
        formattedDate,
        availableActions
      }
    })
    
    const pageData: ContentListPageData = {
      modelName,
      status,
      page,
      search,
      models,
      contentItems,
      totalItems,
      itemsPerPage: limit,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : undefined,
      version: c.get('appVersion')
    }

    return c.html(renderContentListPage(pageData))
  } catch (error) {
    console.error('Error fetching content list:', error)
    return c.html(`<p>Error loading content: ${error}</p>`)
  }
})

// New content form
adminContentRoutes.get('/new', async (c) => {
  try {
    const user = c.get('user')
    const url = new URL(c.req.url)
    const collectionId = url.searchParams.get('collection')
    
    if (!collectionId) {
      // Show collection selection page
      const db = c.env.DB
      const collectionsStmt = db.prepare('SELECT id, name, display_name, description FROM collections WHERE is_active = 1 ORDER BY display_name')
      const { results } = await collectionsStmt.all()

      const collections = (results || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        display_name: row.display_name,
        description: row.description
      }))

      // Deduplicate collections by name
      const seenNames = new Set<string>()
      const uniqueCollections = collections.filter(c => {
        if (seenNames.has(c.name)) return false
        seenNames.add(c.name)
        return true
      })

      // Filter collections by RBAC permissions (non-admin users only see collections they can create in)
      let filteredCollections = uniqueCollections
      if (user && user.role !== 'admin') {
        const userPerms = await getCollectionPermissions(db, user.userId)
        const createableIds = new Set(
          userPerms
            .filter(p => p.role === 'editor' || p.role === 'author')
            .map(p => p.collectionId)
        )
        filteredCollections = uniqueCollections.filter(c => createableIds.has(c.id))
      }

      // Render collection selection using admin layout
      const pageContent = `
        <div class="max-w-2xl mx-auto">
          <div class="mb-8">
            <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white">Create New Content</h1>
            <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">Select a collection to create content in:</p>
          </div>

          ${filteredCollections.length === 0 ? `
            <div class="text-center py-12">
              <p class="text-sm text-zinc-500 dark:text-zinc-400">You don't have permission to create content in any collection.</p>
              <a href="/admin/content" class="mt-4 inline-block text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500">← Back to Content List</a>
            </div>
          ` : ''}

          <div class="grid gap-4">
            ${filteredCollections.map(collection => `
              <a href="/admin/content/new?collection=${collection.id}"
                 class="block p-6 bg-white dark:bg-zinc-900 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ring-1 ring-zinc-950/5 dark:ring-white/10 shadow-sm">
                <h3 class="text-lg font-semibold text-zinc-950 dark:text-white mb-1">${collection.display_name}</h3>
                <p class="text-sm text-zinc-500 dark:text-zinc-400">${collection.description || 'No description'}</p>
              </a>
            `).join('')}
          </div>

          <div class="mt-8 text-center">
            <a href="/admin/content" class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500">← Back to Content List</a>
          </div>
        </div>
      `

      const { renderAdminLayout } = await import('../templates/layouts/admin-layout-v2.template')
      return c.html(renderAdminLayout({
        title: 'Select Collection',
        pageTitle: 'Select Collection',
        currentPath: '/admin/content',
        user: user ? { name: user.email, email: user.email, role: user.role } : undefined,
        content: pageContent,
      }))
    }

    const db = c.env.DB

    // RBAC: check create permission on this collection
    if (user && user.role !== 'admin') {
      const canCreate = await checkCollectionPermission(db, user.userId, user.role, collectionId, 'create')
      if (!canCreate) {
        const formData: ContentFormData = {
          collection: { id: '', name: '', display_name: 'Unknown', schema: {} },
          fields: [],
          error: 'You do not have permission to create content in this collection.',
          user: { name: user.email, email: user.email, role: user.role }
        }
        return c.html(renderContentFormPage(formData))
      }
    }

    const collection = await getCollection(db, collectionId)

    if (!collection) {
      const formData: ContentFormData = {
        collection: { id: '', name: '', display_name: 'Unknown', schema: {} },
        fields: [],
        error: 'Collection not found.',
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : undefined
      }
      return c.html(renderContentFormPage(formData))
    }
    
    const fields = await getCollectionFields(db, collectionId)

    // Check if workflow plugin is active
    const workflowEnabled = await isPluginActive(db, 'workflow')

    // Check if TinyMCE plugin is active and get settings
    const tinymceEnabled = await isPluginActive(db, 'tinymce-plugin')
    let tinymceSettings
    if (tinymceEnabled) {
      const pluginService = new PluginService(db)
      const tinymcePlugin = await pluginService.getPlugin('tinymce-plugin')
      tinymceSettings = tinymcePlugin?.settings
    }

    // Check if Quill plugin is active and get settings
    const quillEnabled = await isPluginActive(db, 'quill-editor')
    let quillSettings
    if (quillEnabled) {
      const pluginService = new PluginService(db)
      const quillPlugin = await pluginService.getPlugin('quill-editor')
      quillSettings = quillPlugin?.settings
    }

    // Check if MDXEditor plugin is active and get settings
    const mdxeditorEnabled = await isPluginActive(db, 'easy-mdx')
    let mdxeditorSettings
    if (mdxeditorEnabled) {
      const pluginService = new PluginService(db)
      const mdxeditorPlugin = await pluginService.getPlugin('easy-mdx')
      mdxeditorSettings = mdxeditorPlugin?.settings
    }

    console.log('[Content Form /new] Editor plugins status:', {
      tinymce: tinymceEnabled,
      quill: quillEnabled,
      mdxeditor: mdxeditorEnabled,
      mdxeditorSettings
    })

    const formData: ContentFormData = {
      collection,
      fields,
      isEdit: false,
      workflowEnabled,
      tinymceEnabled,
      tinymceSettings,
      quillEnabled,
      quillSettings,
      mdxeditorEnabled,
      mdxeditorSettings,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : undefined
    }
    
    return c.html(renderContentFormPage(formData))
  } catch (error) {
    console.error('Error loading new content form:', error)
    const formData: ContentFormData = {
      collection: { id: '', name: '', display_name: 'Unknown', schema: {} },
      fields: [],
      error: 'Failed to load content form.',
      user: c.get('user') ? {
        name: c.get('user')!.email,
        email: c.get('user')!.email,
        role: c.get('user')!.role
      } : undefined
    }
    return c.html(renderContentFormPage(formData))
  }
})

// Edit content form
adminContentRoutes.get('/:id/edit', async (c) => {
  try {
    const id = c.req.param('id')
    const user = c.get('user')
    const db = c.env.DB
    const url = new URL(c.req.url)

    // Capture referrer parameters to preserve filters when returning to list
    const referrerParams = url.searchParams.get('ref') || ''

    // Get content with caching
    const cache = getCacheService(CACHE_CONFIGS.content!)
    const content = await cache.getOrSet(
      cache.generateKey('content', id),
      async () => {
        const contentStmt = db.prepare(`
          SELECT c.*, col.id as collection_id, col.name as collection_name,
                 col.display_name as collection_display_name, col.description as collection_description,
                 col.schema as collection_schema,
                 u.email as author_email, u.first_name as author_first_name, u.last_name as author_last_name
          FROM content c
          JOIN collections col ON c.collection_id = col.id
          LEFT JOIN users u ON c.author_id = u.id
          WHERE c.id = ?
        `)
        return await contentStmt.bind(id).first() as any
      }
    )

    if (!content) {
      const formData: ContentFormData = {
        collection: { id: '', name: '', display_name: 'Unknown', schema: {} },
        fields: [],
        error: 'Content not found.',
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : undefined
      }
      return c.html(renderContentFormPage(formData))
    }

    // RBAC: check edit permission on this collection
    if (user && user.role !== 'admin') {
      const canEdit = await checkCollectionPermission(db, user.userId, user.role, content.collection_id, 'edit')
      if (!canEdit) {
        const formData: ContentFormData = {
          collection: { id: '', name: '', display_name: 'Unknown', schema: {} },
          fields: [],
          error: 'You do not have permission to edit content in this collection.',
          user: { name: user.email, email: user.email, role: user.role }
        }
        return c.html(renderContentFormPage(formData))
      }
      // Author role: can only edit their own content
      const permRow = await db.prepare(
        'SELECT role FROM user_collection_permissions WHERE user_id = ? AND collection_id = ?'
      ).bind(user.userId, content.collection_id).first<{ role: string }>()
      if (permRow && !isAuthorAllowedToEdit(permRow.role, content.author_id, user.userId)) {
        const formData: ContentFormData = {
          collection: { id: '', name: '', display_name: 'Unknown', schema: {} },
          fields: [],
          error: 'Authors can only edit their own content.',
          user: { name: user.email, email: user.email, role: user.role }
        }
        return c.html(renderContentFormPage(formData))
      }
    }

    const collection = {
      id: content.collection_id,
      name: content.collection_name,
      display_name: content.collection_display_name,
      description: content.collection_description,
      schema: content.collection_schema ? JSON.parse(content.collection_schema) : {}
    }
    
    const fields = await getCollectionFields(db, content.collection_id)
    let contentData = content.data ? JSON.parse(content.data) : {}

    // If published content has a pending revision, load that instead of live data.
    // This ensures subsequent edits build on the previous pending changes.
    if (content.status === 'published') {
      const pendingRev = await getLatestPendingRevision(db, id)
      if (pendingRev) {
        const pendingData = { ...pendingRev.data }
        delete pendingData._revision_meta
        contentData = pendingData
      }
    }

    // Enrich content data with metadata for the form template
    contentData.created_at = content.created_at
    contentData.updated_at = content.updated_at
    contentData.published_at = content.published_at
    const authorName = content.author_first_name && content.author_last_name
      ? `${content.author_first_name} ${content.author_last_name}`
      : null
    contentData.author_name = authorName
    contentData.author_email = content.author_email

    // Check if workflow plugin is active
    const workflowEnabled = await isPluginActive(db, 'workflow')

    // Check if TinyMCE plugin is active and get settings
    const tinymceEnabled = await isPluginActive(db, 'tinymce-plugin')
    let tinymceSettings
    if (tinymceEnabled) {
      const pluginService = new PluginService(db)
      const tinymcePlugin = await pluginService.getPlugin('tinymce-plugin')
      tinymceSettings = tinymcePlugin?.settings
    }

    // Check if Quill plugin is active and get settings
    const quillEnabled = await isPluginActive(db, 'quill-editor')
    let quillSettings
    if (quillEnabled) {
      const pluginService = new PluginService(db)
      const quillPlugin = await pluginService.getPlugin('quill-editor')
      quillSettings = quillPlugin?.settings
    }

    // Check if MDXEditor plugin is active and get settings
    const mdxeditorEnabled = await isPluginActive(db, 'easy-mdx')
    let mdxeditorSettings
    if (mdxeditorEnabled) {
      const pluginService = new PluginService(db)
      const mdxeditorPlugin = await pluginService.getPlugin('easy-mdx')
      mdxeditorSettings = mdxeditorPlugin?.settings
    }

    const formData: ContentFormData = {
      id: content.id,
      title: content.title,
      slug: content.slug,
      data: contentData,
      status: content.status,
      scheduled_publish_at: content.scheduled_publish_at,
      scheduled_unpublish_at: content.scheduled_unpublish_at,
      review_status: content.review_status,
      meta_title: content.meta_title,
      meta_description: content.meta_description,
      collection,
      fields,
      isEdit: true,
      workflowEnabled,
      tinymceEnabled,
      tinymceSettings,
      quillEnabled,
      quillSettings,
      mdxeditorEnabled,
      mdxeditorSettings,
      referrerParams,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : undefined,
      version: c.get('appVersion')
    }

    return c.html(renderContentFormPage(formData))
  } catch (error) {
    console.error('Error loading edit content form:', error)
    const formData: ContentFormData = {
      collection: { id: '', name: '', display_name: 'Unknown', schema: {} },
      fields: [],
      error: 'Failed to load content for editing.',
      user: c.get('user') ? {
        name: c.get('user')!.email,
        email: c.get('user')!.email,
        role: c.get('user')!.role
      } : undefined
    }
    return c.html(renderContentFormPage(formData))
  }
})

// Create content
adminContentRoutes.post('/', async (c) => {
  try {
    const user = c.get('user')
    const formData = await c.req.formData()
    const collectionId = formData.get('collection_id') as string
    const action = formData.get('action') as string
    
    if (!collectionId) {
      return c.html(html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Collection ID is required.
        </div>
      `)
    }

    const db = c.env.DB

    // Collection-level RBAC: check create permission
    const canCreate = await checkCollectionPermission(db, user!.userId, user!.role, collectionId, 'create')
    if (!canCreate) {
      return c.html(html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          You do not have permission to create content in this collection.
        </div>
      `, 403)
    }

    const collection = await getCollection(db, collectionId)

    if (!collection) {
      return c.html(html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Collection not found.
        </div>
      `)
    }

    const fields = await getCollectionFields(db, collectionId)

    // Extract and validate field data
    const { data, errors } = extractFieldData(fields, formData)

    // Check for validation errors
    if (Object.keys(errors).length > 0) {
      const formDataWithErrors: ContentFormData = {
        collection,
        fields,
        data,
        validationErrors: errors,
        error: 'Please fix the validation errors below.',
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : undefined
      }
      return c.html(renderContentFormPage(formDataWithErrors))
    }

    // Generate slug if not provided
    let slug = data.slug || data.title
    if (slug) {
      slug = slug.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-')
    }
    
    // Determine status
    let status = formData.get('status') as string || 'draft'
    if (action === 'save_and_publish') {
      status = 'published'
    }
    
    // Handle scheduling
    const scheduledPublishAt = formData.get('scheduled_publish_at') as string
    const scheduledUnpublishAt = formData.get('scheduled_unpublish_at') as string
    
    // Store author display name in content data
    const authorDisplay = formData.get('author_display') as string
    if (authorDisplay) {
      data.author_display = authorDisplay
    }

    // Create content
    const contentId = crypto.randomUUID()
    const now = Date.now()

    const insertStmt = db.prepare(`
      INSERT INTO content (
        id, collection_id, slug, title, data, status,
        author_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    await insertStmt.bind(
      contentId,
      collectionId,
      slug,
      data.title || data.name || 'Untitled',
      JSON.stringify(data),
      status,
      user?.userId || 'unknown',
      now,
      now
    ).run()

    // Invalidate collection content list cache
    const cache = getCacheService(CACHE_CONFIGS.content!)
    await cache.invalidate(`content:list:${collectionId}:*`)

    // Create initial version
    const versionStmt = db.prepare(`
      INSERT INTO content_versions (id, content_id, version, data, author_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    
    await versionStmt.bind(
      crypto.randomUUID(),
      contentId,
      1,
      JSON.stringify(data),
      user?.userId || 'unknown',
      now
    ).run()
    
    // Log creation in audit trail (non-blocking)
    try {
      await logStatusChange(db, {
        contentId,
        fromStatus: 'none',
        toStatus: status,
        userId: user?.userId || 'unknown',
        comment: 'Content created',
      })
    } catch (auditErr) {
      console.error('[audit] Failed to log admin content creation:', auditErr)
    }
    
    // Handle different actions
    const referrerParams = formData.get('referrer_params') as string
    const redirectUrl = action === 'save_and_continue'
      ? `/admin/content/${contentId}/edit?success=Content saved successfully!${referrerParams ? `&ref=${encodeURIComponent(referrerParams)}` : ''}`
      : referrerParams
        ? `/admin/content?${referrerParams}&success=Content created successfully!`
        : `/admin/content?collection=${collectionId}&success=Content created successfully!`

    // Check if this is an HTMX request
    const isHTMX = c.req.header('HX-Request') === 'true'
    
    if (isHTMX) {
      // For HTMX requests, use HX-Redirect header to trigger client-side redirect
      return c.text('', 200, {
        'HX-Redirect': redirectUrl
      })
    } else {
      // For regular requests, use server-side redirect
      return c.redirect(redirectUrl)
    }
    
  } catch (error) {
    console.error('Error creating content:', error)
    return c.html(html`
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Failed to create content. Please try again.
      </div>
    `)
  }
})

// Update content
adminContentRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const user = c.get('user')
    const formData = await c.req.formData()
    const action = formData.get('action') as string
    
    const db = c.env.DB
    
    // Get existing content
    const contentStmt = db.prepare('SELECT * FROM content WHERE id = ?')
    const existingContent = await contentStmt.bind(id).first() as any

    if (!existingContent) {
      return c.html(html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Content not found.
        </div>
      `)
    }

    // Collection-level RBAC: check edit permission
    const canEdit = await checkCollectionPermission(db, user!.userId, user!.role, existingContent.collection_id, 'edit')
    if (!canEdit) {
      return c.html(html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          You do not have permission to edit content in this collection.
        </div>
      `, 403)
    }
    // Author role: can only edit their own content
    if (user!.role !== 'admin') {
      const permRow = await db.prepare(
        'SELECT role FROM user_collection_permissions WHERE user_id = ? AND collection_id = ?'
      ).bind(user!.userId, existingContent.collection_id).first<{ role: string }>()
      const collectionRole = permRow?.role ?? 'viewer'
      if (!isAuthorAllowedToEdit(collectionRole, existingContent.author_id, user!.userId)) {
        return c.html(html`
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Authors can only edit their own content.
          </div>
        `, 403)
      }
    }

    const collection = await getCollection(db, existingContent.collection_id)
    if (!collection) {
      return c.html(html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Collection not found.
        </div>
      `)
    }

    const fields = await getCollectionFields(db, existingContent.collection_id)

    // Extract and validate field data
    const { data, errors } = extractFieldData(fields, formData)

    if (Object.keys(errors).length > 0) {
      const formDataWithErrors: ContentFormData = {
        id,
        collection,
        fields,
        data,
        validationErrors: errors,
        error: 'Please fix the validation errors below.',
        isEdit: true,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : undefined
      }
      return c.html(renderContentFormPage(formDataWithErrors))
    }
    
    // Compute candidate slug from form data or title
    let slug = data.slug || data.title
    if (slug) {
      slug = slug.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
    }

    // Enforce slug lock: cannot change slug after first publish
    if (slug && slug !== existingContent.slug && isSlugLocked(existingContent)) {
      const slugLockErrors: ContentFormData = {
        id,
        collection,
        fields,
        data,
        validationErrors: { slug: ['Slug cannot be changed after first publish'] },
        error: 'Slug cannot be changed after first publish.',
        isEdit: true,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role,
        } : undefined,
      }
      return c.html(renderContentFormPage(slugLockErrors))
    }

    // Determine status
    let status = formData.get('status') as string || existingContent.status
    if (action === 'save_and_publish') {
      status = 'published'
    }

    // Validate status transition
    if (status !== existingContent.status) {
      const transitionResult = validateStatusTransition(existingContent.status, status)
      if (!transitionResult.valid) {
        const transitionErrors: ContentFormData = {
          id,
          collection,
          fields,
          data,
          validationErrors: { status: [transitionResult.error || 'Invalid status transition'] },
          error: transitionResult.error || 'Invalid status transition.',
          isEdit: true,
          user: user ? {
            name: user.email,
            email: user.email,
            role: user.role,
          } : undefined,
        }
        return c.html(renderContentFormPage(transitionErrors))
      }
    }

    // Handle scheduling
    const scheduledPublishAt = formData.get('scheduled_publish_at') as string
    // When unpublishing (published -> draft), clear scheduling fields
    const isUnpublishing = status === 'draft' && existingContent.status === 'published'
    const resolvedScheduledPublishAt = isUnpublishing ? null : scheduledPublishAt
    const resolvedScheduledUnpublishAt = isUnpublishing ? null : (formData.get('scheduled_unpublish_at') as string)

    // Determine published_at: set on first publish, clear on unpublish, preserve otherwise
    let publishedAt: number | null = existingContent.published_at || null
    if (status === 'published' && existingContent.status !== 'published' && !existingContent.published_at) {
      publishedAt = Date.now()
    } else if (isUnpublishing) {
      publishedAt = null
    }

    // Store author display name in content data
    const authorDisplay = formData.get('author_display') as string
    if (authorDisplay) {
      data.author_display = authorDisplay
    }

    // Content Staging: if editing published content and user is not bypassing,
    // create a pending revision instead of overwriting the live version.
    const publishImmediately = formData.get('publish_immediately') === 'on'
    const isPublishedContent = existingContent.status === 'published'
    const isAdmin = user?.role === 'admin'
    const shouldStage = isPublishedContent && !(isAdmin && publishImmediately)

    if (shouldStage) {
      await createPendingRevision(db, {
        contentId: id,
        data,
        authorId: user?.userId || 'unknown',
        status,
        title: data.title || data.name || 'Untitled',
        slug,
        metaTitle: data.meta_title || null,
        metaDescription: data.meta_description || null,
        scheduledPublishAt: resolvedScheduledPublishAt ? new Date(resolvedScheduledPublishAt).getTime() : null,
        scheduledUnpublishAt: resolvedScheduledUnpublishAt ? new Date(resolvedScheduledUnpublishAt).getTime() : null,
      })

      // Redirect with staging-specific success message
      const referrerParams = formData.get('referrer_params') as string
      const stagingMsg = 'Changes saved as pending revision. Use Sync to publish.'
      const redirectUrl = action === 'save_and_continue'
        ? `/admin/content/${id}/edit?success=${encodeURIComponent(stagingMsg)}${referrerParams ? `&ref=${encodeURIComponent(referrerParams)}` : ''}`
        : referrerParams
          ? `/admin/content?${referrerParams}&success=${encodeURIComponent(stagingMsg)}`
          : `/admin/content?collection=${existingContent.collection_id}&success=${encodeURIComponent(stagingMsg)}`

      const isHTMX = c.req.header('HX-Request') === 'true'
      if (isHTMX) {
        return c.text('', 200, { 'HX-Redirect': redirectUrl })
      }
      return c.redirect(redirectUrl)
    }

    // Direct save path: draft content, or admin with "publish immediately" bypass
    const now = Date.now()

    const updateStmt = db.prepare(`
      UPDATE content SET
        slug = ?, title = ?, data = ?, status = ?,
        published_at = ?,
        scheduled_publish_at = ?, scheduled_unpublish_at = ?,
        meta_title = ?, meta_description = ?, updated_at = ?
      WHERE id = ?
    `)

    await updateStmt.bind(
      slug,
      data.title || data.name || 'Untitled',
      JSON.stringify(data),
      status,
      publishedAt,
      resolvedScheduledPublishAt ? new Date(resolvedScheduledPublishAt).getTime() : null,
      resolvedScheduledUnpublishAt ? new Date(resolvedScheduledUnpublishAt).getTime() : null,
      data.meta_title || null,
      data.meta_description || null,
      now,
      id,
    ).run()

    // Invalidate content cache
    const cache = getCacheService(CACHE_CONFIGS.content!)
    await cache.delete(cache.generateKey('content', id))
    await cache.invalidate(`content:list:${existingContent.collection_id}:*`)

    // Create new version if content changed
    const existingData = JSON.parse(existingContent.data || '{}')
    if (JSON.stringify(existingData) !== JSON.stringify(data)) {
      // Get next version number
      const versionCountStmt = db.prepare('SELECT MAX(version) as max_version FROM content_versions WHERE content_id = ?')
      const versionResult = await versionCountStmt.bind(id).first() as any
      const nextVersion = (versionResult?.max_version || 0) + 1

      const versionStmt = db.prepare(`
        INSERT INTO content_versions (id, content_id, version, data, author_id, created_at, status)
        VALUES (?, ?, ?, ?, ?, ?, 'history')
      `)

      await versionStmt.bind(
        crypto.randomUUID(),
        id,
        nextVersion,
        JSON.stringify(data),
        user?.userId || 'unknown',
        now
      ).run()
    }
    
    // Audit trail: log status change and/or field edits (non-blocking)
    try {
      // Log status transition if status changed
      if (status !== existingContent.status) {
        await logStatusChange(db, {
          contentId: id,
          fromStatus: existingContent.status,
          toStatus: status,
          userId: user?.userId || 'unknown',
        })
      }
      // Log field-level edits if content data changed
      const existingData = existingContent.data ? JSON.parse(existingContent.data) : {}
      const existingSnapshot: Record<string, unknown> = {
        title: existingContent.title,
        slug: existingContent.slug,
        ...existingData,
      }
      const updatedSnapshot: Record<string, unknown> = {
        title: data.title ?? existingContent.title,
        slug: slug ?? existingContent.slug,
        ...data,
      }
      const trackedFields = [...new Set([
        'title', 'slug',
        ...Object.keys(existingData),
        ...Object.keys(data),
      ])]
      const diff = computeFieldDiff(existingSnapshot, updatedSnapshot, trackedFields)
      if (Object.keys(diff).length > 0) {
        await logContentEdit(db, {
          contentId: id,
          status,
          userId: user?.userId || 'unknown',
          changedFields: diff,
        })
      }
    } catch (auditErr) {
      console.error('[audit] Failed to log admin content update:', auditErr)
    }
    
    // Handle different actions
    const referrerParams = formData.get('referrer_params') as string
    const redirectUrl = action === 'save_and_continue'
      ? `/admin/content/${id}/edit?success=Content updated successfully!${referrerParams ? `&ref=${encodeURIComponent(referrerParams)}` : ''}`
      : referrerParams
        ? `/admin/content?${referrerParams}&success=Content updated successfully!`
        : `/admin/content?collection=${existingContent.collection_id}&success=Content updated successfully!`

    // Check if this is an HTMX request
    const isHTMX = c.req.header('HX-Request') === 'true'
    
    if (isHTMX) {
      // For HTMX requests, use HX-Redirect header to trigger client-side redirect
      return c.text('', 200, {
        'HX-Redirect': redirectUrl
      })
    } else {
      // For regular requests, use server-side redirect
      return c.redirect(redirectUrl)
    }
    
  } catch (error) {
    console.error('Error updating content:', error)
    return c.html(html`
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Failed to update content. Please try again.
      </div>
    `)
  }
})

// Content preview
adminContentRoutes.post('/preview', async (c) => {
  try {
    const formData = await c.req.formData()
    const collectionId = formData.get('collection_id') as string
    
    const db = c.env.DB
    const collection = await getCollection(db, collectionId)
    
    if (!collection) {
      return c.html('<p>Collection not found</p>')
    }
    
    const fields = await getCollectionFields(db, collectionId)

    // Extract field data for preview (skip validation)
    const { data } = extractFieldData(fields, formData, { skipValidation: true })

    // Generate preview HTML
    const previewHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preview: ${data.title || data.name || 'Untitled'}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
          .content { line-height: 1.6; }
        </style>
      </head>
      <body>
        <h1>${data.title || data.name || 'Untitled'}</h1>
        <div class="meta">
          <strong>Collection:</strong> ${collection.display_name}<br>
          <strong>Status:</strong> ${formData.get('status') || 'draft'}<br>
          ${data.meta_description ? `<strong>Description:</strong> ${data.meta_description}<br>` : ''}
        </div>
        <div class="content">
          ${data.content || '<p>No content provided.</p>'}
        </div>
        
        <h3>All Fields:</h3>
        <table border="1" style="border-collapse: collapse; width: 100%;">
          <tr><th>Field</th><th>Value</th></tr>
          ${fields.map(field => `
            <tr>
              <td><strong>${field.field_label}</strong></td>
              <td>${data[field.field_name] || '<em>empty</em>'}</td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `
    
    return c.html(previewHTML)
  } catch (error) {
    console.error('Error generating preview:', error)
    return c.html('<p>Error generating preview</p>')
  }
})

// Duplicate content
adminContentRoutes.post('/duplicate', async (c) => {
  try {
    const user = c.get('user')
    const formData = await c.req.formData()
    const originalId = formData.get('id') as string
    
    if (!originalId) {
      return c.json({ success: false, error: 'Content ID required' })
    }
    
    const db = c.env.DB
    
    // Get original content
    const contentStmt = db.prepare('SELECT * FROM content WHERE id = ?')
    const original = await contentStmt.bind(originalId).first() as any
    
    if (!original) {
      return c.json({ success: false, error: 'Content not found' })
    }
    
    // Create duplicate
    const newId = crypto.randomUUID()
    const now = Date.now()
    const originalData = JSON.parse(original.data || '{}')
    
    // Modify title to indicate it's a copy
    const displayTitle = originalData.title || originalData.name || 'Untitled'
    originalData.title = `${displayTitle} (Copy)`
    
    const insertStmt = db.prepare(`
      INSERT INTO content (
        id, collection_id, slug, title, data, status,
        author_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    await insertStmt.bind(
      newId,
      original.collection_id,
      `${original.slug}-copy-${Date.now()}`,
      originalData.title,
      JSON.stringify(originalData),
      'draft', // Always start as draft
      user?.userId || 'unknown',
      now,
      now
    ).run()
    
    return c.json({ success: true, id: newId })
  } catch (error) {
    console.error('Error duplicating content:', error)
    return c.json({ success: false, error: 'Failed to duplicate content' })
  }
})

// Get bulk actions modal
adminContentRoutes.get('/bulk-actions', async (c) => {
  const bulkActionsModal = `
    <div class="fixed inset-0 bg-zinc-950/50 dark:bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick="this.remove()">
      <div class="bg-white dark:bg-zinc-900 rounded-xl shadow-xl ring-1 ring-zinc-950/5 dark:ring-white/10 p-6 max-w-md w-full" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-zinc-950 dark:text-white">Bulk Actions</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Select items from the table below to perform bulk actions.
        </p>
        <div class="space-y-2">
          <button
            onclick="performBulkAction('publish')"
            class="w-full inline-flex items-center justify-center gap-x-2 px-4 py-2.5 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            Publish Selected
          </button>
          <button
            onclick="performBulkAction('draft')"
            class="w-full inline-flex items-center justify-center gap-x-2 px-4 py-2.5 bg-zinc-600 dark:bg-zinc-700 text-white rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
            Move to Draft
          </button>
          <button
            onclick="performBulkAction('delete')"
            class="w-full inline-flex items-center justify-center gap-x-2 px-4 py-2.5 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            Delete Selected
          </button>
        </div>
      </div>
    </div>
    <script>
      function performBulkAction(action) {
        const selectedIds = Array.from(document.querySelectorAll('input[type="checkbox"].row-checkbox:checked'))
          .map(cb => cb.value)
          .filter(id => id)

        if (selectedIds.length === 0) {
          alert('Please select at least one item')
          return
        }

        const actionText = action === 'publish' ? 'publish' : action === 'draft' ? 'move to draft' : 'delete'
        const confirmed = confirm(\`Are you sure you want to \${actionText} \${selectedIds.length} item(s)?\`)

        if (!confirmed) return

        fetch('/admin/content/bulk-action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: action,
            ids: selectedIds
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            document.querySelector('#bulk-actions-modal .fixed').remove()
            location.reload()
          } else {
            alert('Error: ' + (data.error || 'Unknown error'))
          }
        })
        .catch(err => {
          console.error('Bulk action error:', err)
          alert('Failed to perform bulk action')
        })
      }
    </script>
  `

  return c.html(bulkActionsModal)
})

// Perform bulk action
adminContentRoutes.post('/bulk-action', async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    const { action, ids } = body

    if (!action || !ids || ids.length === 0) {
      return c.json({ success: false, error: 'Action and IDs required' })
    }

    const db = c.env.DB
    const now = Date.now()

    if (action === 'delete') {
      // Soft delete by setting status to 'deleted' with timestamp
      const placeholders = ids.map(() => '?').join(',')
      const stmt = db.prepare(`
        UPDATE content
        SET status = 'deleted', deleted_at = ?, updated_at = ?
        WHERE id IN (${placeholders})
      `)
      await stmt.bind(now, now, ...ids).run()
    } else if (action === 'publish' || action === 'draft') {
      // Validate transitions per item and update respecting state machine
      const targetStatus = action === 'publish' ? 'published' : 'draft'
      const itemsStmt = db.prepare(`SELECT id, status FROM content WHERE id IN (${ids.map(() => '?').join(',')})`)
      const itemsResult = await itemsStmt.bind(...ids).all()
      const items = (itemsResult.results || []) as { id: string; status: string }[]

      const invalidItems: string[] = []
      for (const item of items) {
        const result = validateStatusTransition(item.status, targetStatus)
        if (!result.valid) {
          invalidItems.push(item.id)
        }
      }

      if (invalidItems.length > 0) {
        return c.json({
          success: false,
          error: `Cannot transition ${invalidItems.length} item(s) to ${targetStatus}. Check current statuses.`,
          invalidIds: invalidItems,
        })
      }

      const placeholders = ids.map(() => '?').join(',')
      const publishedAt = targetStatus === 'published' ? now : null
      const stmt = db.prepare(`
        UPDATE content
        SET status = ?, published_at = ?, updated_at = ?
        WHERE id IN (${placeholders})
      `)
      await stmt.bind(targetStatus, publishedAt, now, ...ids).run()
    } else if (action === 'restore') {
      // Restore from trash — admin only
      if (user!.role !== 'admin') {
        return c.json({ success: false, error: 'Only admins can restore content' }, 403)
      }
      const placeholders = ids.map(() => '?').join(',')
      const stmt = db.prepare(`
        UPDATE content
        SET status = 'draft', deleted_at = NULL, updated_at = ?
        WHERE id IN (${placeholders}) AND status = 'deleted'
      `)
      await stmt.bind(now, ...ids).run()
    } else if (action === 'purge') {
      // Permanent delete — admin only
      if (user!.role !== 'admin') {
        return c.json({ success: false, error: 'Only admins can permanently delete content' }, 403)
      }
      const placeholders = ids.map(() => '?').join(',')
      // Cascade: delete child records first
      await db.prepare(`DELETE FROM workflow_history WHERE content_id IN (${placeholders})`).bind(...ids).run()
      await db.prepare(`DELETE FROM content_versions WHERE content_id IN (${placeholders})`).bind(...ids).run()
      await db.prepare(`DELETE FROM content WHERE id IN (${placeholders}) AND status = 'deleted'`).bind(...ids).run()
    } else {
      return c.json({ success: false, error: 'Invalid action' })
    }

    // Invalidate cache for all affected content items
    const cache = getCacheService(CACHE_CONFIGS.content!)
    for (const contentId of ids) {
      await cache.delete(cache.generateKey('content', contentId))
    }
    // Also invalidate list caches (they contain content from potentially multiple collections)
    await cache.invalidate('content:list:*')

    return c.json({ success: true, count: ids.length })
  } catch (error) {
    console.error('Bulk action error:', error)
    return c.json({ success: false, error: 'Failed to perform bulk action' })
  }
})

// Delete content
adminContentRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const db = c.env.DB
    const user = c.get('user')

    // Check if content exists
    const contentStmt = db.prepare('SELECT id, title, collection_id, author_id FROM content WHERE id = ?')
    const content = await contentStmt.bind(id).first() as any

    if (!content) {
      return c.json({ success: false, error: 'Content not found' }, 404)
    }

    // Collection-level RBAC: check edit permission (delete requires edit-level access)
    const canDelete = await checkCollectionPermission(db, user!.userId, user!.role, content.collection_id, 'edit')
    if (!canDelete) {
      return c.json({ success: false, error: 'Insufficient permissions for this collection' }, 403)
    }
    // Author role: can only delete their own content
    if (user!.role !== 'admin') {
      const permRow = await db.prepare(
        'SELECT role FROM user_collection_permissions WHERE user_id = ? AND collection_id = ?'
      ).bind(user!.userId, content.collection_id).first<{ role: string }>()
      const collectionRole = permRow?.role ?? 'viewer'
      if (!isAuthorAllowedToEdit(collectionRole, content.author_id, user!.userId)) {
        return c.json({ success: false, error: 'Authors can only delete their own content' }, 403)
      }
    }

    // Soft delete by setting status to 'deleted' with timestamp
    const now = Date.now()
    const deleteStmt = db.prepare(`
      UPDATE content
      SET status = 'deleted', deleted_at = ?, updated_at = ?
      WHERE id = ?
    `)
    await deleteStmt.bind(now, now, id).run()

    // Invalidate cache
    const cache = getCacheService(CACHE_CONFIGS.content!)
    await cache.delete(cache.generateKey('content', id))
    await cache.invalidate('content:list:*')

    // Return success - let HTMX reload the page
    return c.html(`
      <div id="content-list" hx-get="/admin/content?model=${c.req.query('model') || 'post'}" hx-trigger="load" hx-swap="outerHTML">
        <div class="flex items-center justify-center p-8">
          <div class="text-center">
            <svg class="mx-auto h-12 w-12 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Content deleted successfully. Refreshing...</p>
          </div>
        </div>
      </div>
    `)
  } catch (error) {
    console.error('Delete content error:', error)
    return c.json({ success: false, error: 'Failed to delete content' }, 500)
  }
})

// Restore content from trash
adminContentRoutes.post('/:id/restore', async (c) => {
  try {
    const id = c.req.param('id')
    const db = c.env.DB
    const user = c.get('user')

    // Only admins can restore from trash
    if (user!.role !== 'admin') {
      return c.json({ success: false, error: 'Only admins can restore content' }, 403)
    }

    // Verify content exists and is deleted
    const item = await db.prepare('SELECT id, title, collection_id FROM content WHERE id = ? AND status = ?')
      .bind(id, 'deleted').first() as any

    if (!item) {
      return c.json({ success: false, error: 'Deleted content not found' }, 404)
    }

    // Restore to draft status, clear deleted_at
    const now = Date.now()
    await db.prepare(`
      UPDATE content
      SET status = 'draft', deleted_at = NULL, updated_at = ?
      WHERE id = ?
    `).bind(now, id).run()

    // Invalidate cache
    const cache = getCacheService(CACHE_CONFIGS.content!)
    await cache.delete(cache.generateKey('content', id))
    await cache.invalidate('content:list:*')

    return c.html(`
      <div id="content-list" hx-get="/admin/content?status=deleted" hx-trigger="load" hx-swap="outerHTML">
        <div class="flex items-center justify-center p-8">
          <div class="text-center">
            <svg class="mx-auto h-12 w-12 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">"${item.title}" restored to drafts. Refreshing...</p>
          </div>
        </div>
      </div>
    `)
  } catch (error) {
    console.error('Restore content error:', error)
    return c.json({ success: false, error: 'Failed to restore content' }, 500)
  }
})

// Permanently delete content (hard delete with cascade)
adminContentRoutes.delete('/:id/purge', async (c) => {
  try {
    const id = c.req.param('id')
    const db = c.env.DB
    const user = c.get('user')

    // Only admins can permanently delete
    if (user!.role !== 'admin') {
      return c.json({ success: false, error: 'Only admins can permanently delete content' }, 403)
    }

    // Verify content exists and is deleted (only purge from trash)
    const item = await db.prepare('SELECT id, title FROM content WHERE id = ? AND status = ?')
      .bind(id, 'deleted').first() as any

    if (!item) {
      return c.json({ success: false, error: 'Deleted content not found' }, 404)
    }

    // Cascade: delete child records first, then content
    await db.prepare('DELETE FROM workflow_history WHERE content_id = ?').bind(id).run()
    await db.prepare('DELETE FROM content_versions WHERE content_id = ?').bind(id).run()
    await db.prepare('DELETE FROM content WHERE id = ?').bind(id).run()

    // Invalidate cache
    const cache = getCacheService(CACHE_CONFIGS.content!)
    await cache.delete(cache.generateKey('content', id))
    await cache.invalidate('content:list:*')

    return c.html(`
      <div id="content-list" hx-get="/admin/content?status=deleted" hx-trigger="load" hx-swap="outerHTML">
        <div class="flex items-center justify-center p-8">
          <div class="text-center">
            <svg class="mx-auto h-12 w-12 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">"${item.title}" permanently deleted. Refreshing...</p>
          </div>
        </div>
      </div>
    `)
  } catch (error) {
    console.error('Purge content error:', error)
    return c.json({ success: false, error: 'Failed to permanently delete content' }, 500)
  }
})

// Get version history
adminContentRoutes.get('/:id/versions', async (c) => {
  try {
    const id = c.req.param('id')
    const db = c.env.DB
    
    // Get current content
    const contentStmt = db.prepare('SELECT * FROM content WHERE id = ?')
    const content = await contentStmt.bind(id).first() as any
    
    if (!content) {
      return c.html('<p>Content not found</p>')
    }
    
    // Get all versions with author info
    const versionsStmt = db.prepare(`
      SELECT cv.*, u.first_name, u.last_name, u.email
      FROM content_versions cv
      LEFT JOIN users u ON cv.author_id = u.id
      WHERE cv.content_id = ?
      ORDER BY cv.version DESC
    `)
    const { results } = await versionsStmt.bind(id).all()
    
    const versions: ContentVersion[] = (results || []).map((row: any) => ({
      id: row.id,
      version: row.version,
      data: JSON.parse(row.data || '{}'),
      author_id: row.author_id,
      author_name: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : row.email,
      created_at: row.created_at,
      is_current: false // Will be set below
    }))
    
    // Mark the latest version as current
    if (versions.length > 0) {
      versions[0]!.is_current = true
    }
    
    const data: VersionHistoryData = {
      contentId: id,
      versions,
      currentVersion: versions.length > 0 ? versions[0]!.version : 1
    }
    
    return c.html(renderVersionHistory(data))
  } catch (error) {
    console.error('Error loading version history:', error)
    return c.html('<p>Error loading version history</p>')
  }
})

// Restore version
adminContentRoutes.post('/:id/restore/:version', async (c) => {
  try {
    const id = c.req.param('id')
    const version = parseInt(c.req.param('version'))
    const user = c.get('user')
    const db = c.env.DB
    
    // Get the specific version
    const versionStmt = db.prepare(`
      SELECT * FROM content_versions 
      WHERE content_id = ? AND version = ?
    `)
    const versionData = await versionStmt.bind(id, version).first() as any
    
    if (!versionData) {
      return c.json({ success: false, error: 'Version not found' })
    }
    
    // Get current content
    const contentStmt = db.prepare('SELECT * FROM content WHERE id = ?')
    const currentContent = await contentStmt.bind(id).first() as any
    
    if (!currentContent) {
      return c.json({ success: false, error: 'Content not found' })
    }
    
    const restoredData = JSON.parse(versionData.data)
    const now = Date.now()
    
    // Update content with restored data
    const updateStmt = db.prepare(`
      UPDATE content SET
        title = ?, data = ?, updated_at = ?
      WHERE id = ?
    `)
    
    await updateStmt.bind(
      restoredData.title || 'Untitled',
      versionData.data,
      now,
      id
    ).run()
    
    // Create new version for the restoration
    const nextVersionStmt = db.prepare('SELECT MAX(version) as max_version FROM content_versions WHERE content_id = ?')
    const nextVersionResult = await nextVersionStmt.bind(id).first() as any
    const nextVersion = (nextVersionResult?.max_version || 0) + 1
    
    const newVersionStmt = db.prepare(`
      INSERT INTO content_versions (id, content_id, version, data, author_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    
    await newVersionStmt.bind(
      crypto.randomUUID(),
      id,
      nextVersion,
      versionData.data,
      user?.userId || 'unknown',
      now
    ).run()
    
    // Log rollback in audit trail with action_type='rollback'
    try {
      const rollbackStmt = db.prepare(`
        INSERT INTO workflow_history (id, content_id, action, from_status, to_status, user_id, comment, action_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      await rollbackStmt.bind(
        crypto.randomUUID(),
        id,
        'rollback',
        currentContent.status,
        currentContent.status,
        user?.userId || 'unknown',
        `Rolled back to version ${version}`,
        'rollback',
        now
      ).run()
    } catch (auditError) {
      console.error('Audit trail error during rollback (non-blocking):', auditError)
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('Error restoring version:', error)
    return c.json({ success: false, error: 'Failed to restore version' })
  }
})

// Preview specific version
adminContentRoutes.get('/:id/version/:version/preview', async (c) => {
  try {
    const id = c.req.param('id')
    const version = parseInt(c.req.param('version'))
    const db = c.env.DB
    
    // Get the specific version
    const versionStmt = db.prepare(`
      SELECT cv.*, c.collection_id, col.display_name as collection_name
      FROM content_versions cv
      JOIN content c ON cv.content_id = c.id
      JOIN collections col ON c.collection_id = col.id
      WHERE cv.content_id = ? AND cv.version = ?
    `)
    const versionData = await versionStmt.bind(id, version).first() as any
    
    if (!versionData) {
      return c.html('<p>Version not found</p>')
    }
    
    const data = JSON.parse(versionData.data || '{}')
    
    // Generate preview HTML
    const previewHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Version ${version} Preview: ${data.title || data.name || 'Untitled'}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .meta { color: #666; font-size: 14px; margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
          .content { line-height: 1.6; }
          .version-badge { background: #007cba; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="meta">
          <span class="version-badge">Version ${version}</span>
          <strong>Collection:</strong> ${versionData.collection_name}<br>
          <strong>Created:</strong> ${new Date(versionData.created_at).toLocaleString()}<br>
          <em>This is a historical version preview</em>
        </div>
        
        <h1>${data.title || data.name || 'Untitled'}</h1>
        
        <div class="content">
          ${data.content || '<p>No content provided.</p>'}
        </div>
        
        ${data.excerpt ? `<h3>Excerpt:</h3><p>${data.excerpt}</p>` : ''}
        
        <h3>All Field Data:</h3>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">
${JSON.stringify(data, null, 2)}
        </pre>
      </body>
      </html>
    `
    
    return c.html(previewHTML)
  } catch (error) {
    console.error('Error generating version preview:', error)
    return c.html('<p>Error generating preview</p>')
  }
})
export default adminContentRoutes
