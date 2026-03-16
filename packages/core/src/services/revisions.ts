/**
 * Revision Service — Content Staging Layer
 *
 * Handles pending revisions for published content. When a user edits
 * published content, changes go to a pending revision instead of
 * overwriting the live version. The "Sync" button promotes approved
 * revisions to the live content table.
 *
 * Flow:
 *   1. User edits published content → createPendingRevision()
 *   2. Sidebar badge shows pending count → getPendingCount()
 *   3. User clicks Sync → getPendingRevisions() → review modal
 *   4. Approve → approveRevision() or approveAll()
 *   5. Reject → rejectRevision()
 */

export type RevisionStatus = 'history' | 'pending' | 'approved' | 'rejected'

export interface PendingRevision {
  versionId: string
  contentId: string
  contentTitle: string
  collectionId: string
  collectionName: string
  version: number
  pendingData: Record<string, unknown>
  liveData: Record<string, unknown>
  liveStatus: string
  submittedBy: string
  submittedByEmail: string
  submittedAt: number
}

export interface RevisionDiff {
  field: string
  oldValue: unknown
  newValue: unknown
}

/**
 * Create a pending revision instead of overwriting published content.
 * Returns the new version ID.
 */
export async function createPendingRevision(
  db: D1Database,
  params: {
    contentId: string
    data: Record<string, unknown>
    authorId: string
    status?: string
    title?: string
    slug?: string
    metaTitle?: string
    metaDescription?: string
    scheduledPublishAt?: number | null
    scheduledUnpublishAt?: number | null
  }
): Promise<string> {
  const versionId = crypto.randomUUID()
  const metaId = crypto.randomUUID()
  const now = Date.now()

  // Replace any existing pending revision for this content item
  // (only one pending revision per content item at a time)
  await db
    .prepare(
      `DELETE FROM content_revision_meta WHERE version_id IN
       (SELECT id FROM content_versions WHERE content_id = ? AND status = 'pending')`
    )
    .bind(params.contentId)
    .run()
  await db
    .prepare("DELETE FROM content_versions WHERE content_id = ? AND status = 'pending'")
    .bind(params.contentId)
    .run()

  // Get next version number
  const versionResult = await db
    .prepare('SELECT MAX(version) as max_version FROM content_versions WHERE content_id = ?')
    .bind(params.contentId)
    .first<{ max_version: number | null }>()

  const nextVersion = (versionResult?.max_version || 0) + 1

  // Store the full revision payload (data + metadata fields) so we can
  // fully restore the content row on approval
  const revisionPayload = {
    ...params.data,
    _revision_meta: {
      status: params.status,
      title: params.title,
      slug: params.slug,
      metaTitle: params.metaTitle,
      metaDescription: params.metaDescription,
      scheduledPublishAt: params.scheduledPublishAt,
      scheduledUnpublishAt: params.scheduledUnpublishAt,
    }
  }

  // Insert pending version
  await db
    .prepare(
      `INSERT INTO content_versions (id, content_id, version, data, author_id, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`
    )
    .bind(versionId, params.contentId, nextVersion, JSON.stringify(revisionPayload), params.authorId, now)
    .run()

  // Insert revision metadata
  await db
    .prepare(
      `INSERT INTO content_revision_meta (id, version_id, submitted_by, submitted_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(metaId, versionId, params.authorId, now)
    .run()

  return versionId
}

/**
 * Get count of pending revisions (for sidebar badge).
 */
export async function getPendingCount(db: D1Database): Promise<number> {
  const result = await db
    .prepare("SELECT COUNT(*) as count FROM content_versions WHERE status = 'pending'")
    .first<{ count: number }>()

  return result?.count || 0
}

/**
 * Get all pending revisions with content + collection details for the Sync modal.
 */
export async function getPendingRevisions(db: D1Database): Promise<PendingRevision[]> {
  const { results } = await db
    .prepare(`
      SELECT
        cv.id as version_id,
        cv.content_id,
        cv.version,
        cv.data as pending_data,
        cv.created_at as submitted_at,
        c.title as content_title,
        c.data as live_data,
        c.status as live_status,
        c.collection_id,
        col.name as collection_name,
        crm.submitted_by,
        u.email as submitted_by_email
      FROM content_versions cv
      JOIN content c ON cv.content_id = c.id
      JOIN collections col ON c.collection_id = col.id
      LEFT JOIN content_revision_meta crm ON cv.id = crm.version_id
      LEFT JOIN users u ON crm.submitted_by = u.id
      WHERE cv.status = 'pending'
      ORDER BY cv.created_at DESC
    `)
    .all()

  return (results || []).map((row: any) => ({
    versionId: row.version_id,
    contentId: row.content_id,
    contentTitle: row.content_title,
    collectionId: row.collection_id,
    collectionName: row.collection_name,
    version: row.version,
    pendingData: JSON.parse(row.pending_data || '{}'),
    liveData: JSON.parse(row.live_data || '{}'),
    liveStatus: row.live_status,
    submittedBy: row.submitted_by || '',
    submittedByEmail: row.submitted_by_email || 'Unknown',
    submittedAt: row.submitted_at,
  }))
}

/**
 * Approve a single pending revision — promote it to the live content table.
 * The old live data is saved as a 'history' version for rollback.
 */
export async function approveRevision(
  db: D1Database,
  versionId: string,
  reviewedBy: string
): Promise<void> {
  const now = Date.now()

  // Get the pending version
  const version = await db
    .prepare("SELECT * FROM content_versions WHERE id = ? AND status = 'pending'")
    .bind(versionId)
    .first<any>()

  if (!version) throw new Error('Pending revision not found')

  // Get current live content (to save as history)
  const liveContent = await db
    .prepare('SELECT * FROM content WHERE id = ?')
    .bind(version.content_id)
    .first<any>()

  if (!liveContent) throw new Error('Content not found')

  // Save current live data as history version
  const historyId = crypto.randomUUID()
  const historyVersion = version.version + 1

  // Parse the pending revision data
  const pendingData = JSON.parse(version.data || '{}')
  const revisionMeta = pendingData._revision_meta || {}
  delete pendingData._revision_meta

  // Promote pending data to live content
  const title = revisionMeta.title || pendingData.title || pendingData.name || liveContent.title
  const slug = revisionMeta.slug || liveContent.slug
  const status = revisionMeta.status || liveContent.status
  const publishedAt = status === 'published' && liveContent.status !== 'published'
    ? now
    : liveContent.published_at

  // Batch all writes atomically to avoid D1 internal errors from unbatched writes
  await db.batch([
    db.prepare(
      `INSERT INTO content_versions (id, content_id, version, data, author_id, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, 'history')`
    ).bind(historyId, version.content_id, historyVersion, liveContent.data, liveContent.author_id, now),

    db.prepare(`
      UPDATE content SET
        slug = ?, title = ?, data = ?, status = ?,
        published_at = ?,
        scheduled_publish_at = ?, scheduled_unpublish_at = ?,
        meta_title = ?, meta_description = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      slug,
      title,
      JSON.stringify(pendingData),
      status,
      publishedAt,
      revisionMeta.scheduledPublishAt ?? null,
      revisionMeta.scheduledUnpublishAt ?? null,
      revisionMeta.metaTitle ?? null,
      revisionMeta.metaDescription ?? null,
      now,
      version.content_id
    ),

    db.prepare("UPDATE content_versions SET status = 'approved' WHERE id = ?")
      .bind(versionId),

    db.prepare('UPDATE content_revision_meta SET reviewed_by = ?, reviewed_at = ? WHERE version_id = ?')
      .bind(reviewedBy, now, versionId),
  ])
}

/**
 * Approve all pending revisions at once.
 */
export async function approveAllRevisions(
  db: D1Database,
  reviewedBy: string
): Promise<number> {
  const pending = await getPendingRevisions(db)
  let approved = 0

  for (const revision of pending) {
    await approveRevision(db, revision.versionId, reviewedBy)
    approved++
  }

  return approved
}

/**
 * Reject a pending revision — mark it rejected, live content unchanged.
 */
export async function rejectRevision(
  db: D1Database,
  versionId: string,
  reviewedBy: string,
  comment?: string
): Promise<void> {
  const now = Date.now()

  await db
    .prepare("UPDATE content_versions SET status = 'rejected' WHERE id = ? AND status = 'pending'")
    .bind(versionId)
    .run()

  await db
    .prepare(
      'UPDATE content_revision_meta SET reviewed_by = ?, reviewed_at = ?, review_comment = ? WHERE version_id = ?'
    )
    .bind(reviewedBy, now, comment || null, versionId)
    .run()
}

/**
 * Compute field-by-field diff between live and pending data.
 * Returns only fields that changed.
 */
/**
 * Normalize empty-ish values so undefined, null, and "" compare as equal.
 */
function normalizeValue(val: unknown): unknown {
  if (val === undefined || val === null || val === '') return null
  return val
}

export function computeDiff(
  liveData: Record<string, unknown>,
  pendingData: Record<string, unknown>
): RevisionDiff[] {
  const diffs: RevisionDiff[] = []
  const allKeys = new Set([...Object.keys(liveData), ...Object.keys(pendingData)])

  for (const key of allKeys) {
    // Skip internal fields
    if (key === '_revision_meta') continue

    const oldVal = normalizeValue(liveData[key])
    const newVal = normalizeValue(pendingData[key])

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diffs.push({ field: key, oldValue: liveData[key], newValue: pendingData[key] })
    }
  }

  return diffs
}

/**
 * Check if content has a pending revision.
 */
export async function hasPendingRevision(
  db: D1Database,
  contentId: string
): Promise<boolean> {
  const result = await db
    .prepare("SELECT COUNT(*) as count FROM content_versions WHERE content_id = ? AND status = 'pending'")
    .bind(contentId)
    .first<{ count: number }>()

  return (result?.count || 0) > 0
}

/**
 * Get the latest pending revision for a specific content item.
 */
export async function getLatestPendingRevision(
  db: D1Database,
  contentId: string
): Promise<{ versionId: string; data: Record<string, unknown> } | null> {
  const row = await db
    .prepare(
      `SELECT id, data FROM content_versions
       WHERE content_id = ? AND status = 'pending'
       ORDER BY version DESC LIMIT 1`
    )
    .bind(contentId)
    .first<{ id: string; data: string }>()

  if (!row) return null

  return {
    versionId: row.id,
    data: JSON.parse(row.data || '{}'),
  }
}
