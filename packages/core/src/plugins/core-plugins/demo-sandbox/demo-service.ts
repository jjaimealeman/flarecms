/**
 * Demo Sandbox Service
 *
 * Handles demo user creation with scoped collection permissions.
 * Creates viewer users with editor-level access to demo-sandbox-collection only.
 */

import { AuthManager } from '../../../middleware'
import { grantCollectionPermission } from '../../../services/rbac'

export interface CreateDemoUserResult {
  token: string
  isNew: boolean
}

/**
 * Create or return an existing demo user.
 *
 * - New users get a viewer role with editor permission on demo-sandbox-collection.
 * - Returning users get their mutation counter reset and a fresh token.
 * - All signups are recorded in demo_signups for analytics.
 *
 * @param db - D1 database binding
 * @param kv - KV namespace binding (for mutation rate tracking)
 * @param email - Visitor email (normalized to lowercase)
 * @param ipAddress - Request IP address
 * @param userAgent - Request User-Agent header (nullable)
 * @param jwtSecret - JWT signing secret from env bindings
 */
export async function createDemoUser(
  db: D1Database,
  kv: KVNamespace,
  email: string,
  ipAddress: string,
  userAgent: string | null,
  jwtSecret: string | undefined
): Promise<CreateDemoUserResult> {
  const normalizedEmail = email.toLowerCase().trim()

  // Check for existing demo user
  const existing = await db
    .prepare('SELECT id, role FROM users WHERE email = ?')
    .bind(normalizedEmail)
    .first<{ id: string; role: string }>()

  if (existing) {
    // Reset KV mutation counter for returning user (fresh 24h window)
    await kv.put(`demo-mutations:${existing.id}`, '0', { expirationTtl: 86400 })

    const token = await AuthManager.generateToken(
      existing.id,
      normalizedEmail,
      'viewer',
      jwtSecret
    )

    return { token, isNew: false }
  }

  // Create new demo user
  const userId = crypto.randomUUID()
  const now = Date.now()
  const shortId = userId.substring(0, 8)
  const username = `demo-${shortId}`

  await db
    .prepare(`
      INSERT INTO users (id, email, username, first_name, last_name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(userId, normalizedEmail, username, 'Demo', 'User', 'viewer', 1, now, now)
    .run()

  // Grant editor permission on demo-sandbox-collection only
  await grantCollectionPermission(db, {
    userId,
    collectionId: 'demo-sandbox-collection',
    role: 'editor',
    grantedBy: 'system'
  })

  // Record signup
  const signupId = crypto.randomUUID()
  await db
    .prepare(`
      INSERT INTO demo_signups (id, email, user_id, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(signupId, normalizedEmail, userId, ipAddress, userAgent ?? null, now)
    .run()

  // Initialize KV mutation counter (expires in 24h)
  await kv.put(`demo-mutations:${userId}`, '0', { expirationTtl: 86400 })

  const token = await AuthManager.generateToken(userId, normalizedEmail, 'viewer', jwtSecret)

  return { token, isNew: true }
}
