/**
 * Audit Trail Service
 *
 * Records all content state transitions and field-level edits in workflow_history.
 * Every status change and content edit is logged with user ID, timestamp,
 * action type, and field-level diffs for full accountability.
 */

import type { D1Database } from '@cloudflare/workers-types'

/**
 * Compute a field-level diff between existing and updated values.
 * Only includes fields that have actually changed.
 */
export function computeFieldDiff(
  existing: Record<string, unknown>,
  updated: Record<string, unknown>,
  fields: string[],
): Record<string, { old: unknown; new: unknown }> {
  const diff: Record<string, { old: unknown; new: unknown }> = {}

  for (const field of fields) {
    const oldVal = existing[field]
    const newVal = updated[field]

    // Normalize for comparison: stringify objects/arrays to detect changes
    const oldNorm = typeof oldVal === 'object' ? JSON.stringify(oldVal) : oldVal
    const newNorm = typeof newVal === 'object' ? JSON.stringify(newVal) : newVal

    if (oldNorm !== newNorm) {
      diff[field] = { old: oldVal, new: newVal }
    }
  }

  return diff
}

/**
 * Log a status transition in workflow_history.
 * Call after a successful content status update.
 */
export async function logStatusChange(
  db: D1Database,
  params: {
    contentId: string
    fromStatus: string
    toStatus: string
    userId: string
    comment?: string
  },
): Promise<void> {
  const { contentId, fromStatus, toStatus, userId, comment } = params

  const stmt = db.prepare(`
    INSERT INTO workflow_history (
      id, content_id, action, from_status, to_status,
      user_id, comment, action_type, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  await stmt
    .bind(
      crypto.randomUUID(),
      contentId,
      'status_change',
      fromStatus,
      toStatus,
      userId,
      comment ?? null,
      'status_change',
      Date.now(),
    )
    .run()
}

/**
 * Log a content edit (field-level changes) in workflow_history.
 * Call after a successful content update when data fields changed.
 * The changedFields map contains { old, new } for each modified field.
 */
export async function logContentEdit(
  db: D1Database,
  params: {
    contentId: string
    status: string
    userId: string
    changedFields: Record<string, { old: unknown; new: unknown }>
  },
): Promise<void> {
  const { contentId, status, userId, changedFields } = params

  const stmt = db.prepare(`
    INSERT INTO workflow_history (
      id, content_id, action, from_status, to_status,
      user_id, changed_fields, action_type, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  await stmt
    .bind(
      crypto.randomUUID(),
      contentId,
      'content_edit',
      status,
      status,
      userId,
      JSON.stringify(changedFields),
      'content_edit',
      Date.now(),
    )
    .run()
}
