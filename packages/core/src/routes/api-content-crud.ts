import { Hono } from 'hono'
import { requireAuth } from '../middleware'
import { getCacheService, CACHE_CONFIGS, validateStatusTransition, isSlugLocked, getUnpublishUpdates, checkCollectionPermission, isAuthorAllowedToEdit, logStatusChange, logContentEdit, computeFieldDiff } from '../services'
import { getHookSystem } from '../plugins/hooks-singleton'
import { HOOKS } from '../types'
import { deliverWebhooks } from '../services/webhook-delivery'
import { WorkflowEngine } from '../plugins/core-plugins/workflow-plugin/services/workflow-service'
import type { Bindings, Variables } from '../app'
import { log } from '../lib/logger'

const apiContentCrudRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/content/check-slug - Check if slug is available in collection
// Query params: collectionId, slug, excludeId (optional - when editing)
// NOTE: This MUST come before /:id route to avoid route conflict
apiContentCrudRoutes.get('/check-slug', async (c) => {
  try {
    const db = c.env.DB
    const collectionId = c.req.query('collectionId')
    const slug = c.req.query('slug')
    const excludeId = c.req.query('excludeId') // When editing, exclude current item

    if (!collectionId || !slug) {
      return c.json({ error: 'collectionId and slug are required' }, 400)
    }

    // Check for existing content with this slug in the collection
    let query = 'SELECT id FROM content WHERE collection_id = ? AND slug = ?'
    const params: string[] = [collectionId, slug]

    if (excludeId) {
      query += ' AND id != ?'
      params.push(excludeId)
    }

    const existing = await db.prepare(query).bind(...params).first()

    if (existing) {
      return c.json({
        available: false,
        message: 'This URL slug is already in use in this collection',
      })
    }

    return c.json({ available: true })
  } catch (error: unknown) {
    console.error('Error checking slug:', error)
    return c.json({
      error: 'Failed to check slug availability',
      details: error instanceof Error ? error.message : String(error),
    }, 500)
  }
})

// GET /api/content/:id - Get single content item by ID
apiContentCrudRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const db = c.env.DB

    const stmt = db.prepare('SELECT * FROM content WHERE id = ?')
    const content = await stmt.bind(id).first()

    if (!content) {
      return c.json({ error: 'Content not found' }, 404)
    }

    const transformedContent = {
      id: (content as any).id,
      title: (content as any).title,
      slug: (content as any).slug,
      status: (content as any).status,
      collectionId: (content as any).collection_id,
      data: (content as any).data ? JSON.parse((content as any).data) : {},
      created_at: (content as any).created_at,
      updated_at: (content as any).updated_at,
    }

    return c.json({ data: transformedContent })
  } catch (error) {
    console.error('Error fetching content:', error)
    return c.json({
      error: 'Failed to fetch content',
      details: error instanceof Error ? error.message : String(error),
    }, 500)
  }
})

// POST /api/content - Create new content (requires authentication)
apiContentCrudRoutes.post('/', requireAuth(), async (c) => {
  try {
    const db = c.env.DB
    const user = c.get('user')
    const body = await c.req.json()

    const { collectionId, title, slug, status, data } = body

    // Validate required fields
    if (!collectionId) {
      return c.json({ error: 'collectionId is required' }, 400)
    }

    if (!title) {
      return c.json({ error: 'title is required' }, 400)
    }

    // Collection-level RBAC: check create permission
    const canCreate = await checkCollectionPermission(db, user!.userId, user!.role, collectionId, 'create')
    if (!canCreate) {
      return c.json({ error: 'Insufficient permissions for this collection' }, 403)
    }

    // Generate slug from title if not provided
    let finalSlug = slug || title
    finalSlug = finalSlug.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    // Check for duplicate slug within the same collection
    const duplicateCheck = db.prepare(
      'SELECT id FROM content WHERE collection_id = ? AND slug = ?',
    )
    const existing = await duplicateCheck.bind(collectionId, finalSlug).first()

    if (existing) {
      return c.json({ error: 'A content item with this slug already exists in this collection' }, 409)
    }

    // Before hook: content:before-create (blocking — can cancel)
    try {
      const hookSystem = getHookSystem()
      const result = await hookSystem.executeWithResult(HOOKS.BEFORE_CONTENT_CREATE, {
        collectionId,
        title,
        slug: finalSlug,
        data,
        userId: user?.userId,
      })
      if (result.cancelled) {
        return c.json({ error: 'Operation blocked by hook' }, 403)
      }
    } catch (hookErr) {
      console.error('[hooks] before-create hook failed:', hookErr)
    }

    // Create new content
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
      finalSlug,
      title,
      JSON.stringify(data || {}),
      status || 'draft',
      user?.userId || 'system',
      now,
      now,
    ).run()

    // Log creation in audit trail (non-blocking)
    try {
      await logStatusChange(db, {
        contentId,
        fromStatus: 'none',
        toStatus: status || 'draft',
        userId: user?.userId || 'system',
        comment: 'Content created',
      })
    } catch (auditErr) {
      console.error('[audit] Failed to log content creation:', auditErr)
    }

    // Invalidate cache
    const cache = getCacheService(CACHE_CONFIGS.api!)
    await cache.invalidate(`content:list:${collectionId}:*`)
    await cache.invalidate('content-filtered:*')

    log.info('content.created', { contentId, collectionId, userId: user?.userId || 'system', status: status || 'draft' })

    // Initialize workflow status (auto-creates default workflow if needed)
    try {
      const workflowEngine = new WorkflowEngine(db)
      await workflowEngine.initializeContentWorkflow(contentId, collectionId)
    } catch (wfErr) {
      console.error('[workflow] Failed to initialize content workflow:', wfErr)
    }

    // Get the created content
    const getStmt = db.prepare('SELECT * FROM content WHERE id = ?')
    const createdContent = await getStmt.bind(contentId).first() as any

    // After hook: content:after-create (non-blocking via waitUntil)
    try {
      const hookSystem = getHookSystem()
      if (c.executionCtx) {
        c.executionCtx.waitUntil(
          hookSystem.execute(HOOKS.AFTER_CONTENT_CREATE, {
            contentId,
            collectionId,
            title,
            slug: finalSlug,
            status: createdContent?.status || status || 'draft',
          }),
        )
      }
    } catch (hookErr) {
      console.error('[hooks] after-create hook failed:', hookErr)
    }

    return c.json({
      data: {
        id: createdContent.id,
        title: createdContent.title,
        slug: createdContent.slug,
        status: createdContent.status,
        collectionId: createdContent.collection_id,
        data: createdContent.data ? JSON.parse(createdContent.data) : {},
        created_at: createdContent.created_at,
        updated_at: createdContent.updated_at,
      },
    }, 201)
  } catch (error) {
    console.error('Error creating content:', error)
    return c.json({
      error: 'Failed to create content',
      details: error instanceof Error ? error.message : String(error),
    }, 500)
  }
})

// PUT /api/content/:id - Update content (requires authentication)
apiContentCrudRoutes.put('/:id', requireAuth(), async (c) => {
  try {
    const id = c.req.param('id')
    const db = c.env.DB
    const user = c.get('user')
    const body = await c.req.json()

    // Check if content exists
    const existingStmt = db.prepare('SELECT * FROM content WHERE id = ?')
    const existing = await existingStmt.bind(id).first() as any

    if (!existing) {
      return c.json({ error: 'Content not found' }, 404)
    }

    // Collection-level RBAC: check edit permission
    const canEdit = await checkCollectionPermission(db, user!.userId, user!.role, existing.collection_id, 'edit')
    if (!canEdit) {
      return c.json({ error: 'Insufficient permissions for this collection' }, 403)
    }
    // Author role: can only edit their own content
    if (user!.role !== 'admin') {
      const permRow = await db.prepare(
        'SELECT role FROM user_collection_permissions WHERE user_id = ? AND collection_id = ?'
      ).bind(user!.userId, existing.collection_id).first<{ role: string }>()
      const collectionRole = permRow?.role ?? 'viewer'
      if (!isAuthorAllowedToEdit(collectionRole, existing.author_id, user!.userId)) {
        return c.json({ error: 'Authors can only edit their own content' }, 403)
      }
    }

    // Validate status transition before making any changes
    if (body.status !== undefined && body.status !== existing.status) {
      const transitionResult = validateStatusTransition(existing.status, body.status)
      if (!transitionResult.valid) {
        return c.json({ error: transitionResult.error }, 409)
      }
    }

    // Enforce slug lock: slug cannot change after first publish
    if (body.slug !== undefined) {
      const normalizedSlug = body.slug.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      if (normalizedSlug !== existing.slug && isSlugLocked(existing)) {
        return c.json({ error: 'Slug cannot be changed after first publish' }, 409)
      }
    }

    // (1) Detect publish/unpublish transitions BEFORE any hooks
    const isPublishing = body.status === 'published' && existing.status !== 'published'
    const isUnpublishing = body.status === 'draft' && existing.status === 'published'

    // (2) If publishing: BEFORE_CONTENT_PUBLISH — if cancelled, return 403 immediately
    if (isPublishing) {
      try {
        const hookSystem = getHookSystem()
        const result = await hookSystem.executeWithResult(HOOKS.BEFORE_CONTENT_PUBLISH, {
          contentId: id,
          collectionId: existing.collection_id,
          title: existing.title,
          slug: existing.slug,
          userId: user?.userId,
        })
        if (result.cancelled) {
          return c.json({ error: 'Operation blocked by hook' }, 403)
        }
      } catch (hookErr) {
        console.error('[hooks] before-publish hook failed:', hookErr)
      }
    }

    // (3) If unpublishing: BEFORE_CONTENT_UNPUBLISH — if cancelled, return 403 immediately
    if (isUnpublishing) {
      try {
        const hookSystem = getHookSystem()
        const result = await hookSystem.executeWithResult(HOOKS.BEFORE_CONTENT_UNPUBLISH, {
          contentId: id,
          collectionId: existing.collection_id,
          title: existing.title,
          slug: existing.slug,
          userId: user?.userId,
        })
        if (result.cancelled) {
          return c.json({ error: 'Operation blocked by hook' }, 403)
        }
      } catch (hookErr) {
        console.error('[hooks] before-unpublish hook failed:', hookErr)
      }
    }

    // (4) BEFORE_CONTENT_UPDATE — if cancelled, return 403
    try {
      const hookSystem = getHookSystem()
      const result = await hookSystem.executeWithResult(HOOKS.BEFORE_CONTENT_UPDATE, {
        contentId: id,
        collectionId: existing.collection_id,
        changes: body,
        userId: user?.userId,
      })
      if (result.cancelled) {
        return c.json({ error: 'Operation blocked by hook' }, 403)
      }
    } catch (hookErr) {
      console.error('[hooks] before-update hook failed:', hookErr)
    }

    // (5) Build update fields dynamically and execute DB UPDATE
    const updates: string[] = []
    const params: any[] = []

    if (body.title !== undefined) {
      updates.push('title = ?')
      params.push(body.title)
    }

    if (body.slug !== undefined) {
      const finalSlug = body.slug.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      updates.push('slug = ?')
      params.push(finalSlug)
    }

    if (body.status !== undefined) {
      updates.push('status = ?')
      params.push(body.status)

      // Transitioning to published: record first publish timestamp if not already set
      if (body.status === 'published' && existing.status !== 'published' && !existing.published_at) {
        updates.push('published_at = ?')
        params.push(Date.now())
      }

      // Unpublishing (published -> draft): clear scheduling fields
      if (body.status === 'draft' && existing.status === 'published') {
        const unpublishFields = getUnpublishUpdates()
        for (const [field, value] of Object.entries(unpublishFields)) {
          updates.push(`${field} = ?`)
          params.push(value)
        }
      }
    }

    if (body.data !== undefined) {
      updates.push('data = ?')
      params.push(JSON.stringify(body.data))
    }

    // Always update updated_at
    const now = Date.now()
    updates.push('updated_at = ?')
    params.push(now)

    // Add id to params for WHERE clause
    params.push(id)

    // Execute update
    const updateStmt = db.prepare(`
      UPDATE content SET ${updates.join(', ')}
      WHERE id = ?
    `)

    await updateStmt.bind(...params).run()

    // Sync workflow state when content status changes
    if (body.status !== undefined && body.status !== existing.status) {
      try {
        const workflowEngine = new WorkflowEngine(db)
        // Map content status to workflow state ID (they use the same names)
        const stateId = body.status as string // 'draft', 'published', 'archived'
        await workflowEngine.initializeContentWorkflow(id, existing.collection_id)
        // Update workflow state to match new content status
        await db.prepare(`
          UPDATE content_workflow_status SET current_state_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE content_id = ?
        `).bind(stateId, id).run()
        await db.prepare(`
          UPDATE content SET workflow_state_id = ? WHERE id = ?
        `).bind(stateId, id).run()
      } catch (wfErr) {
        console.error('[workflow] Failed to sync workflow state:', wfErr)
      }
    }

    // Audit trail: log status change and/or field edits (non-blocking)
    try {
      // Log status transition if status changed
      if (body.status !== undefined && body.status !== existing.status) {
        await logStatusChange(db, {
          contentId: id,
          fromStatus: existing.status,
          toStatus: body.status,
          userId: user?.userId || 'system',
        })
      }
      // Log content field edits if data or title/slug changed
      const existingParsed: Record<string, unknown> = {
        title: existing.title,
        slug: existing.slug,
        ...(existing.data ? JSON.parse(existing.data) : {}),
      }
      const updatedFields: Record<string, unknown> = {
        title: body.title ?? existing.title,
        slug: body.slug ?? existing.slug,
        ...(body.data ?? {}),
      }
      const trackedFields = [
        'title',
        'slug',
        ...Object.keys(existingParsed).filter(k => k !== 'title' && k !== 'slug'),
        ...Object.keys(body.data ?? {}),
      ]
      const diff = computeFieldDiff(existingParsed, updatedFields, [...new Set(trackedFields)])
      if (Object.keys(diff).length > 0) {
        await logContentEdit(db, {
          contentId: id,
          status: body.status ?? existing.status,
          userId: user?.userId || 'system',
          changedFields: diff,
        })
      }
    } catch (auditErr) {
      console.error('[audit] Failed to log content update:', auditErr)
    }

    // Invalidate cache
    const cache = getCacheService(CACHE_CONFIGS.api!)
    await cache.delete(cache.generateKey('content', id))
    await cache.invalidate(`content:list:${existing.collection_id}:*`)
    await cache.invalidate('content-filtered:*')

    log.info('content.updated', { contentId: id, collectionId: existing.collection_id, userId: user?.userId || 'system' })
    if (isPublishing) {
      log.info('content.published', { contentId: id, collectionId: existing.collection_id, userId: user?.userId || 'system' })
    }
    if (isUnpublishing) {
      log.info('content.unpublished', { contentId: id, collectionId: existing.collection_id, userId: user?.userId || 'system' })
    }

    // Get updated content
    const getStmt = db.prepare('SELECT * FROM content WHERE id = ?')
    const updatedContent = await getStmt.bind(id).first() as any

    // (6) After hooks via waitUntil (non-blocking)
    // Env vars for webhook delivery
    const webhookUrls = (c.env as any).WEBHOOK_URLS as string | undefined
    const webhookSecret = (c.env as any).WEBHOOK_SECRET as string | undefined

    try {
      const hookSystem = getHookSystem()

      // AFTER_CONTENT_UPDATE (always)
      if (c.executionCtx) {
        c.executionCtx.waitUntil(
          hookSystem.execute(HOOKS.AFTER_CONTENT_UPDATE, {
            contentId: id,
            collectionId: existing.collection_id,
            changes: body,
          }),
        )
      }

      // AFTER_CONTENT_PUBLISH + webhook (if isPublishing)
      if (isPublishing) {
        if (c.executionCtx) {
          c.executionCtx.waitUntil(
            hookSystem.execute(HOOKS.AFTER_CONTENT_PUBLISH, {
              contentId: id,
              collectionId: existing.collection_id,
              title: updatedContent?.title || existing.title,
              slug: updatedContent?.slug || existing.slug,
            }),
          )
        }
        // Outgoing webhook on publish
        if (webhookUrls) {
          const publishPayload = {
            event: HOOKS.AFTER_CONTENT_PUBLISH,
            contentId: id,
            contentType: existing.collection_id,
            timestamp: Date.now(),
          }
          if (c.executionCtx) {
            c.executionCtx.waitUntil(
              deliverWebhooks(webhookUrls, webhookSecret, publishPayload),
            )
          } else {
            // Fallback: fire without waitUntil (test/edge environments)
            deliverWebhooks(webhookUrls, webhookSecret, publishPayload).catch(err =>
              console.error('[webhook] publish delivery error:', err),
            )
          }
        }
      }

      // AFTER_CONTENT_UNPUBLISH + webhook (if isUnpublishing)
      if (isUnpublishing) {
        if (c.executionCtx) {
          c.executionCtx.waitUntil(
            hookSystem.execute(HOOKS.AFTER_CONTENT_UNPUBLISH, {
              contentId: id,
              collectionId: existing.collection_id,
              title: updatedContent?.title || existing.title,
              slug: updatedContent?.slug || existing.slug,
            }),
          )
        }
        // Outgoing webhook on unpublish
        if (webhookUrls) {
          const unpublishPayload = {
            event: HOOKS.AFTER_CONTENT_UNPUBLISH,
            contentId: id,
            contentType: existing.collection_id,
            timestamp: Date.now(),
          }
          if (c.executionCtx) {
            c.executionCtx.waitUntil(
              deliverWebhooks(webhookUrls, webhookSecret, unpublishPayload),
            )
          } else {
            deliverWebhooks(webhookUrls, webhookSecret, unpublishPayload).catch(err =>
              console.error('[webhook] unpublish delivery error:', err),
            )
          }
        }
      }
    } catch (hookErr) {
      console.error('[hooks] after-update hooks failed:', hookErr)
    }

    return c.json({
      data: {
        id: updatedContent.id,
        title: updatedContent.title,
        slug: updatedContent.slug,
        status: updatedContent.status,
        collectionId: updatedContent.collection_id,
        data: updatedContent.data ? JSON.parse(updatedContent.data) : {},
        created_at: updatedContent.created_at,
        updated_at: updatedContent.updated_at,
      },
    })
  } catch (error) {
    console.error('Error updating content:', error)
    return c.json({
      error: 'Failed to update content',
      details: error instanceof Error ? error.message : String(error),
    }, 500)
  }
})

// DELETE /api/content/:id - Delete content (requires authentication)
apiContentCrudRoutes.delete('/:id', requireAuth(), async (c) => {
  try {
    const id = c.req.param('id')
    const db = c.env.DB
    const user = c.get('user')

    // Check if content exists
    const existingStmt = db.prepare('SELECT collection_id, author_id FROM content WHERE id = ?')
    const existing = await existingStmt.bind(id).first() as any

    if (!existing) {
      return c.json({ error: 'Content not found' }, 404)
    }

    // Collection-level RBAC: check edit permission (delete requires edit-level access)
    const canDelete = await checkCollectionPermission(db, user!.userId, user!.role, existing.collection_id, 'edit')
    if (!canDelete) {
      return c.json({ error: 'Insufficient permissions for this collection' }, 403)
    }
    // Author role: can only delete their own content
    if (user!.role !== 'admin') {
      const permRow = await db.prepare(
        'SELECT role FROM user_collection_permissions WHERE user_id = ? AND collection_id = ?'
      ).bind(user!.userId, existing.collection_id).first<{ role: string }>()
      const collectionRole = permRow?.role ?? 'viewer'
      if (!isAuthorAllowedToEdit(collectionRole, existing.author_id, user!.userId)) {
        return c.json({ error: 'Authors can only delete their own content' }, 403)
      }
    }

    // Before hook: content:before-delete (blocking — can cancel)
    try {
      const hookSystem = getHookSystem()
      const result = await hookSystem.executeWithResult(HOOKS.BEFORE_CONTENT_DELETE, {
        contentId: id,
        collectionId: existing.collection_id,
        userId: user?.userId,
      })
      if (result.cancelled) {
        return c.json({ error: 'Operation blocked by hook' }, 403)
      }
    } catch (hookErr) {
      console.error('[hooks] before-delete hook failed:', hookErr)
    }

    // Delete the content (hard delete for API, soft delete happens in admin routes)
    const deleteStmt = db.prepare('DELETE FROM content WHERE id = ?')
    await deleteStmt.bind(id).run()

    // Invalidate cache
    const cache = getCacheService(CACHE_CONFIGS.api!)
    await cache.delete(cache.generateKey('content', id))
    await cache.invalidate(`content:list:${existing.collection_id}:*`)
    await cache.invalidate('content-filtered:*')

    log.info('content.deleted', { contentId: id, collectionId: existing.collection_id, userId: user?.userId || 'system' })

    // After hook: content:after-delete (non-blocking via waitUntil)
    try {
      const hookSystem = getHookSystem()
      if (c.executionCtx) {
        c.executionCtx.waitUntil(
          hookSystem.execute(HOOKS.AFTER_CONTENT_DELETE, {
            contentId: id,
            collectionId: existing.collection_id,
          }),
        )
      }
    } catch (hookErr) {
      console.error('[hooks] after-delete hook failed:', hookErr)
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting content:', error)
    return c.json({
      error: 'Failed to delete content',
      details: error instanceof Error ? error.message : String(error),
    }, 500)
  }
})

export default apiContentCrudRoutes
