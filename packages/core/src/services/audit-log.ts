/**
 * Audit Log Service
 *
 * Logs all admin actions to the audit_log table for accountability,
 * security tracking, and compliance. Every mutation in the CMS
 * should call one of these functions.
 *
 * Actions:
 *   content.create, content.update, content.delete, content.restore
 *   content.publish, content.unpublish, content.sync_approve, content.sync_reject
 *   media.upload, media.delete
 *   user.login, user.logout, user.login_failed
 *   user.create, user.update, user.delete
 *   settings.update
 *   collection.create, collection.update, collection.delete
 */

export interface AuditEntry {
  userId: string
  userEmail: string
  action: string
  resourceType: string
  resourceId?: string
  resourceTitle?: string
  details?: string | Record<string, unknown>
  ipAddress?: string
}

export interface AuditLogRow {
  id: string
  user_id: string
  user_email: string
  action: string
  resource_type: string
  resource_id: string | null
  resource_title: string | null
  details: string | null
  ip_address: string | null
  created_at: number
}

export interface AuditFilter {
  userId?: string
  action?: string
  resourceType?: string
  resourceId?: string
  startDate?: number
  endDate?: number
  limit?: number
  offset?: number
}

/**
 * Log an audit event. Non-blocking — errors are silently caught
 * so audit failures never break the user's action.
 */
export async function logAudit(
  db: D1Database,
  entry: AuditEntry
): Promise<void> {
  try {
    const details = typeof entry.details === 'object'
      ? JSON.stringify(entry.details)
      : entry.details || null

    await db
      .prepare(`
        INSERT INTO audit_log (id, user_id, user_email, action, resource_type, resource_id, resource_title, details, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        crypto.randomUUID(),
        entry.userId,
        entry.userEmail,
        entry.action,
        entry.resourceType,
        entry.resourceId || null,
        entry.resourceTitle || null,
        details,
        entry.ipAddress || null,
        Date.now()
      )
      .run()
  } catch (err) {
    console.error('[audit] Failed to log:', entry.action, err)
  }
}

/**
 * Query audit log with filters, pagination, and sorting (newest first).
 */
export async function queryAuditLog(
  db: D1Database,
  filter: AuditFilter = {}
): Promise<{ rows: AuditLogRow[]; total: number }> {
  const conditions: string[] = []
  const params: unknown[] = []

  if (filter.userId) {
    conditions.push('user_id = ?')
    params.push(filter.userId)
  }
  if (filter.action) {
    conditions.push('action = ?')
    params.push(filter.action)
  }
  if (filter.resourceType) {
    conditions.push('resource_type = ?')
    params.push(filter.resourceType)
  }
  if (filter.resourceId) {
    conditions.push('resource_id = ?')
    params.push(filter.resourceId)
  }
  if (filter.startDate) {
    conditions.push('created_at >= ?')
    params.push(filter.startDate)
  }
  if (filter.endDate) {
    conditions.push('created_at <= ?')
    params.push(filter.endDate)
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''
  const limit = filter.limit || 50
  const offset = filter.offset || 0

  // Get total count
  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM audit_log ${where}`)
    .bind(...params)
    .first<{ total: number }>()

  // Get rows
  const { results } = await db
    .prepare(`SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .bind(...params, limit, offset)
    .all()

  return {
    rows: (results || []) as unknown as AuditLogRow[],
    total: countResult?.total || 0,
  }
}

/**
 * Get recent audit entries for a specific resource (for content edit page sidebar).
 */
export async function getResourceHistory(
  db: D1Database,
  resourceType: string,
  resourceId: string,
  limit: number = 10
): Promise<AuditLogRow[]> {
  const { results } = await db
    .prepare(
      'SELECT * FROM audit_log WHERE resource_type = ? AND resource_id = ? ORDER BY created_at DESC LIMIT ?'
    )
    .bind(resourceType, resourceId, limit)
    .all()

  return (results || []) as unknown as AuditLogRow[]
}

/**
 * Helper: extract IP address from Hono context.
 */
export function getClientIP(req: { header: (name: string) => string | undefined }): string {
  return req.header('cf-connecting-ip')
    || req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || req.header('x-real-ip')
    || '127.0.0.1'
}
