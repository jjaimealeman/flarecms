/**
 * Admin Sync Routes — Content Staging API
 *
 * Provides endpoints for the Sync button:
 *   GET  /api/pending-count  — badge count for sidebar
 *   GET  /api/pending        — full list for Sync modal
 *   POST /api/approve        — approve a single revision
 *   POST /api/approve-all    — approve all pending revisions
 *   POST /api/reject         — reject a revision
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import {
  getPendingCount,
  getPendingRevisions,
  approveRevision,
  approveAllRevisions,
  rejectRevision,
  computeDiff,
} from '../services/revisions'
import { getCacheService, CACHE_CONFIGS } from '../services/cache'
import type { Bindings, Variables } from '../app'

const adminSyncRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// All sync routes require auth
adminSyncRoutes.use('/*', requireAuth())

// Badge count — lightweight, called on every page load
adminSyncRoutes.get('/api/pending-count', async (c) => {
  const db = c.env.DB
  const count = await getPendingCount(db)
  return c.json({ count })
})

// Full pending list for the Sync modal
adminSyncRoutes.get('/api/pending', async (c) => {
  const db = c.env.DB
  const revisions = await getPendingRevisions(db)

  // Compute diffs for each revision
  const revisionsWithDiffs = revisions.map((rev) => {
    const pendingClean = { ...rev.pendingData }
    delete pendingClean._revision_meta
    const diffs = computeDiff(rev.liveData as Record<string, unknown>, pendingClean)
    return { ...rev, diffs }
  })

  return c.json({
    success: true,
    revisions: revisionsWithDiffs,
    count: revisions.length,
  })
})

// Approve a single revision (editors + admins)
adminSyncRoutes.post('/api/approve', async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const body = await c.req.json<{ versionId: string }>()

  if (!body.versionId) {
    return c.json({ error: 'versionId is required' }, 400)
  }

  try {
    await approveRevision(db, body.versionId, user!.userId)

    // Invalidate content cache
    const cache = getCacheService(CACHE_CONFIGS.content!)
    await cache.invalidate('content:*')

    return c.json({ success: true, message: 'Revision approved and published' })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to approve revision' }, 500)
  }
})

// Approve all pending revisions (admins only)
adminSyncRoutes.post('/api/approve-all', requireRole('admin'), async (c) => {
  const user = c.get('user')
  const db = c.env.DB

  try {
    const count = await approveAllRevisions(db, user!.userId)

    // Invalidate content cache
    const cache = getCacheService(CACHE_CONFIGS.content!)
    await cache.invalidate('content:*')

    return c.json({ success: true, message: `${count} revision(s) approved and published`, count })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to approve revisions' }, 500)
  }
})

// Reject a revision
adminSyncRoutes.post('/api/reject', async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const body = await c.req.json<{ versionId: string; comment?: string }>()

  if (!body.versionId) {
    return c.json({ error: 'versionId is required' }, 400)
  }

  try {
    await rejectRevision(db, body.versionId, user!.userId, body.comment)
    return c.json({ success: true, message: 'Revision rejected' })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to reject revision' }, 500)
  }
})

export { adminSyncRoutes }
