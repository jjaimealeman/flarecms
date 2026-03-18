/**
 * Demo Reset Service
 *
 * Resets demo-sandbox content to its seeded state and purges expired demo user
 * accounts. Invoked by the 6-hour cron trigger in wrangler.toml.
 *
 * RESET-02: resetSandboxContent() — deletes visitor-created content, restores 3 seed rows
 * RESET-03: purgeExpiredUsers()   — removes demo users whose KV key has expired
 */

// ============================================================================
// Constants
// ============================================================================

const SEED_IDS = ['demo-sandbox-seed-1', 'demo-sandbox-seed-2', 'demo-sandbox-seed-3'] as const
const COLLECTION_ID = 'demo-sandbox-collection'
const ADMIN_ID = 'admin-1770148233567-90a7ju7xz'

// ============================================================================
// Seed data (mirrors migration 038 exactly)
// ============================================================================

const SEED_ROWS = [
  {
    id: 'demo-sandbox-seed-1',
    slug: 'welcome-to-the-sandbox',
    title: 'Welcome to the Sandbox',
    data: '{"title":"Welcome to the Sandbox","content":"<p>This is the Flare CMS demo sandbox. You can create, edit, and delete content here to explore how the CMS works.</p><p>Your changes are scoped to your demo session — feel free to experiment!</p>","status":"published"}',
  },
  {
    id: 'demo-sandbox-seed-2',
    slug: 'try-editing-this-post',
    title: 'Try Editing This Post',
    data: '{"title":"Try Editing This Post","content":"<p>Click the edit button above to modify this content. You can change the title, update this body text, and save your changes.</p><p>This is a great way to see how the content editor works in Flare CMS.</p>","status":"published"}',
  },
  {
    id: 'demo-sandbox-seed-3',
    slug: 'create-your-own-content',
    title: 'Create Your Own Content',
    data: '{"title":"Create Your Own Content","content":"<p>Use the <strong>New Content</strong> button to create your own entries in this sandbox collection.</p><p>Try adding a title and some rich text content — you have full editor access to this collection.</p>","status":"published"}',
  },
] as const

// ============================================================================
// Result types
// ============================================================================

export interface ResetContentResult {
  deleted: number
  reseeded: number
}

export interface PurgeUsersResult {
  purged: number
}

export interface ResetRunResult {
  content: ResetContentResult
  users: PurgeUsersResult
}

// ============================================================================
// DemoResetService
// ============================================================================

export class DemoResetService {
  private db: D1Database
  private kv: KVNamespace | undefined

  constructor(db: D1Database, kv: KVNamespace | undefined) {
    this.db = db
    this.kv = kv
  }

  /**
   * Entry point called by the scheduled handler.
   * Runs resetSandboxContent() then purgeExpiredUsers() sequentially.
   */
  async run(): Promise<ResetRunResult> {
    console.info('[demo-reset] Starting scheduled demo reset')

    const content = await this.resetSandboxContent()
    console.info(`[demo-reset] Content reset: deleted=${content.deleted} reseeded=${content.reseeded}`)

    const users = await this.purgeExpiredUsers()
    console.info(`[demo-reset] User purge: purged=${users.purged}`)

    console.info('[demo-reset] Reset complete')
    return { content, users }
  }

  /**
   * RESET-02: Delete non-seed content rows (with FK-safe content_versions cleanup)
   * then restore the 3 seed rows via INSERT OR REPLACE.
   */
  async resetSandboxContent(): Promise<ResetContentResult> {
    const seedIdPlaceholders = SEED_IDS.map(() => '?').join(', ')

    // Step 1: Delete content_versions for non-seed content (FK safety)
    await this.db
      .prepare(
        `DELETE FROM content_versions WHERE content_id IN (
          SELECT id FROM content WHERE collection_id = ? AND id NOT IN (${seedIdPlaceholders})
        )`
      )
      .bind(COLLECTION_ID, ...SEED_IDS)
      .run()

    // Step 2: Delete non-seed content rows
    const deleteResult = await this.db
      .prepare(
        `DELETE FROM content WHERE collection_id = ? AND id NOT IN (${seedIdPlaceholders})`
      )
      .bind(COLLECTION_ID, ...SEED_IDS)
      .run()

    const deleted = deleteResult.meta?.changes ?? 0

    // Step 3: Restore seed rows via batch INSERT OR REPLACE
    const now = Date.now()

    const insertStatements = SEED_ROWS.map((row) =>
      this.db
        .prepare(
          `INSERT OR REPLACE INTO content
            (id, collection_id, slug, title, data, status, author_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          row.id,
          COLLECTION_ID,
          row.slug,
          row.title,
          row.data,
          'published',
          ADMIN_ID,
          now,
          now
        )
    )

    await this.db.batch(insertStatements)

    return { deleted, reseeded: 3 }
  }

  /**
   * RESET-03: Identify expired demo users via KV key absence (or age fallback)
   * and delete them with OTP codes in FK-safe order.
   */
  async purgeExpiredUsers(): Promise<PurgeUsersResult> {
    // Query all demo users
    const { results: demoUsers } = await this.db
      .prepare('SELECT id, email FROM users WHERE username LIKE ?')
      .bind('demo-%')
      .all<{ id: string; email: string }>()

    if (!demoUsers || demoUsers.length === 0) {
      return { purged: 0 }
    }

    let toDelete: Array<{ id: string; email: string }> = []

    if (this.kv) {
      // KV path: user is expired if demo-mutations key is gone
      for (const user of demoUsers) {
        const kvKey = await this.kv.get(`demo-mutations:${user.id}`)
        if (kvKey === null) {
          toDelete.push(user)
        }
      }
    } else {
      // Local dev fallback: purge demo users older than 48 hours
      const cutoff = Date.now() - 48 * 60 * 60 * 1000
      const { results: staleUsers } = await this.db
        .prepare('SELECT id, email FROM users WHERE username LIKE ? AND created_at < ?')
        .bind('demo-%', cutoff)
        .all<{ id: string; email: string }>()

      toDelete = staleUsers ?? []
    }

    if (toDelete.length === 0) {
      return { purged: 0 }
    }

    const ids = toDelete.map((u) => u.id)
    const emails = toDelete.map((u) => u.email)

    // Build explicit IN placeholders (D1 does not support array binds)
    const idPlaceholders = ids.map(() => '?').join(', ')
    const emailPlaceholders = emails.map(() => '?').join(', ')

    // Step a: Delete OTP codes (FK: user_email)
    await this.db
      .prepare(`DELETE FROM otp_codes WHERE user_email IN (${emailPlaceholders})`)
      .bind(...emails)
      .run()

    // Step b: Delete users (user_collection_permissions ON DELETE CASCADE auto-cleaned)
    const deleteResult = await this.db
      .prepare(`DELETE FROM users WHERE id IN (${idPlaceholders})`)
      .bind(...ids)
      .run()

    return { purged: deleteResult.meta?.changes ?? 0 }
  }
}
