/**
 * Content State Machine
 *
 * Single source of truth for content status transition validation and slug lock rules.
 * Used by both API routes and admin routes to ensure consistent enforcement.
 */

// Valid status transitions map
// Key = current status, Value = allowed target statuses
export const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['published', 'archived'],
  published: ['draft', 'archived'],
  archived: ['draft'],
  deleted: ['draft'],
}

/**
 * Validate a status transition.
 *
 * Returns `{ valid: true }` for no-op transitions (from === to).
 * Returns `{ valid: true }` for allowed transitions.
 * Returns `{ valid: false, error: string }` for disallowed transitions.
 */
export function validateStatusTransition(
  from: string,
  to: string,
): { valid: boolean; error?: string } {
  // No-op transition is always valid
  if (from === to) {
    return { valid: true }
  }

  const allowed = VALID_TRANSITIONS[from]

  if (!allowed) {
    return {
      valid: false,
      error: `Unknown current status '${from}'. Cannot transition to '${to}'.`,
    }
  }

  if (allowed.includes(to)) {
    return { valid: true }
  }

  const allowedList = allowed.length > 0 ? allowed.join(', ') : 'none'
  return {
    valid: false,
    error: `Cannot transition from '${from}' to '${to}'. Allowed: ${allowedList}`,
  }
}

/**
 * Check whether the slug is locked for editing.
 *
 * A slug is locked once the content has been published at least once
 * (indicated by a non-null `published_at` timestamp).
 */
export function isSlugLocked(content: { published_at: number | null | undefined }): boolean {
  return content.published_at !== null && content.published_at !== undefined
}

/**
 * Returns the fields that must be cleared when unpublishing content
 * (transitioning from 'published' to 'draft').
 */
export function getUnpublishUpdates(): Record<string, null> {
  return {
    published_at: null,
    scheduled_publish_at: null,
    scheduled_unpublish_at: null,
  }
}
