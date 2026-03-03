/**
 * RBAC Service — Collection-Level Role-Based Access Control
 *
 * Provides per-collection permission checks for content operations.
 * Global admin role bypasses all collection-level checks.
 *
 * Roles (collection-scoped):
 *   editor  — full access: read, create, edit, publish
 *   author  — read + create; edit limited to own content (caller must check author_id)
 *   viewer  — read-only
 *
 * Usage:
 *   const allowed = await checkCollectionPermission(db, userId, globalRole, collectionId, 'create')
 */

export type CollectionAction = 'read' | 'create' | 'edit' | 'publish'
export type CollectionRole = 'editor' | 'author' | 'viewer'

const VALID_ROLES: CollectionRole[] = ['editor', 'author', 'viewer']

interface CollectionPermissionRow {
  role: string
}

/**
 * Check whether a user has permission to perform an action on a collection.
 *
 * For the 'edit' action with author role this returns true, but the caller must
 * additionally verify `content.author_id === userId` before allowing the edit.
 */
export async function checkCollectionPermission(
  db: D1Database,
  userId: string,
  globalRole: string,
  collectionId: string,
  requiredAction: CollectionAction
): Promise<boolean> {
  // Admin bypasses all collection-level checks
  if (globalRole === 'admin') return true

  const row = await db
    .prepare(
      'SELECT role FROM user_collection_permissions WHERE user_id = ? AND collection_id = ?'
    )
    .bind(userId, collectionId)
    .first<CollectionPermissionRow>()

  // No permission record → no access
  if (!row) return false

  const collectionRole = row.role as CollectionRole

  switch (collectionRole) {
    case 'editor':
      // Editors can perform all actions
      return true

    case 'author':
      // Authors can read and create; edit/publish returned as true but caller must
      // additionally verify author_id === userId for 'edit' and 'publish' actions
      return requiredAction === 'read' || requiredAction === 'create' || requiredAction === 'edit' || requiredAction === 'publish'

    case 'viewer':
      // Viewers are read-only
      return requiredAction === 'read'

    default:
      return false
  }
}

/**
 * Returns true if an author user is allowed to mutate the given content item.
 * Must be called AFTER checkCollectionPermission returns true for edit/publish.
 */
export function isAuthorAllowedToEdit(
  collectionRole: string,
  contentAuthorId: string,
  userId: string
): boolean {
  if (collectionRole === 'editor') return true
  if (collectionRole === 'author') return contentAuthorId === userId
  return false
}

/**
 * Get all collection permissions for a user.
 */
export async function getCollectionPermissions(
  db: D1Database,
  userId: string
): Promise<Array<{ collectionId: string; role: string }>> {
  const { results } = await db
    .prepare('SELECT collection_id, role FROM user_collection_permissions WHERE user_id = ?')
    .bind(userId)
    .all()

  return (results || []).map((row: any) => ({
    collectionId: row.collection_id as string,
    role: row.role as string,
  }))
}

/**
 * Grant (or replace) a collection-scoped permission for a user.
 * Only valid roles ('editor', 'author', 'viewer') are accepted.
 */
export async function grantCollectionPermission(
  db: D1Database,
  params: {
    userId: string
    collectionId: string
    role: string
    grantedBy: string
  }
): Promise<void> {
  if (!VALID_ROLES.includes(params.role as CollectionRole)) {
    throw new Error(`Invalid role '${params.role}'. Must be one of: ${VALID_ROLES.join(', ')}`)
  }

  const id = crypto.randomUUID()
  const now = Date.now()

  await db
    .prepare(`
      INSERT INTO user_collection_permissions (id, user_id, collection_id, role, granted_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, collection_id) DO UPDATE SET role = excluded.role, granted_by = excluded.granted_by, created_at = excluded.created_at
    `)
    .bind(id, params.userId, params.collectionId, params.role, params.grantedBy, now)
    .run()
}

/**
 * Revoke a user's permission for a specific collection.
 */
export async function revokeCollectionPermission(
  db: D1Database,
  userId: string,
  collectionId: string
): Promise<void> {
  await db
    .prepare('DELETE FROM user_collection_permissions WHERE user_id = ? AND collection_id = ?')
    .bind(userId, collectionId)
    .run()
}
