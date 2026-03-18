# Phase 14: Reset & Cleanup - Research

**Researched:** 2026-03-18
**Domain:** Cloudflare Workers Cron Triggers / D1 / KV — scheduled sandbox reset and session purge
**Confidence:** HIGH (all findings based on direct codebase inspection + official Cloudflare docs)

## Summary

This phase adds a 6-hour cron trigger that resets demo-sandbox content to its seeded state and purges stale demo user accounts. The codebase already has a `scheduled()` handler in `packages/cms/src/index.ts` that dispatches to `SchedulerService.processScheduledContent()`. The new work is: (a) add a second cron expression to `wrangler.toml`, (b) dispatch on `controller.cron` inside the existing `scheduled()` handler, and (c) implement `DemoResetService` in the demo-sandbox plugin.

The "expired demo sessions" in RESET-03 are NOT session rows in D1 — the demo auth is purely JWT cookie-based (30-min TTL, no server-side session table). "Expired sessions" means demo user rows in the `users` table that are no longer active (their KV `demo-mutations:{userId}` key has expired). The purge strategy: delete users with `username LIKE 'demo-%'` whose KV key is absent, plus clean up OTP codes for their emails.

The seed data for RESET-02 is fixed in migration 038: three rows with stable IDs (`demo-sandbox-seed-1`, `demo-sandbox-seed-2`, `demo-sandbox-seed-3`). The reset is: `DELETE FROM content WHERE collection_id = 'demo-sandbox-collection' AND id NOT IN (seed IDs)` + `INSERT OR REPLACE` to restore seed rows to their canonical state.

**Primary recommendation:** Implement `DemoResetService` in `packages/core/src/plugins/core-plugins/demo-sandbox/reset-service.ts`, wire it into a new `"0 */6 * * *"` cron entry in `wrangler.toml`, and dispatch from the existing `scheduled()` handler via `controller.cron` comparison.

## Standard Stack

No new dependencies. Everything needed is already in the monorepo.

### Core (already in repo)
| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| Cloudflare Workers cron triggers | runtime | Schedule every-6-hours execution | `[triggers]` in wrangler.toml |
| D1 (raw `db.prepare()`) | existing | Delete + re-seed content rows | Same pattern as all other routes |
| KV (`CACHE_KV`) | existing | Identify expired demo users by key absence | TTL is 24h — if key gone, session over |
| `ScheduledController` | CF runtime | `controller.cron` for dispatch | Used in existing scheduled handler |

### No New npm Packages Needed

```bash
# No new packages. Everything is already in the monorepo.
```

## Architecture Patterns

### Recommended File Structure (delta from Phase 11)
```
packages/core/src/plugins/core-plugins/demo-sandbox/
├── index.ts              # (existing) plugin factory — no changes needed
├── demo-service.ts       # (existing) createDemoUser() — no changes needed
├── middleware.ts         # (existing) demoMutationGuard, demoUploadGuard — no changes
├── email-templates.ts    # (existing) — no changes needed
└── reset-service.ts      # NEW — DemoResetService with resetSandbox() and purgeExpiredUsers()
```

The `reset-service.ts` is a standalone module with no dependency on Hono or plugin routing. It is called directly from `packages/cms/src/index.ts` scheduled handler.

### Pattern 1: Adding a Second Cron Trigger

The existing `wrangler.toml` has:
```toml
[triggers]
crons = ["* * * * *"]
```

Add the 6-hour reset cron alongside the existing one:
```toml
[triggers]
crons = ["* * * * *", "0 */6 * * *"]
```

`"0 */6 * * *"` = at minute 0, every 6th hour (00:00, 06:00, 12:00, 18:00 UTC). This is the correct expression for "every 6 hours."

**Source:** https://developers.cloudflare.com/workers/configuration/cron-triggers/ — multiple crons supported in one `crons` array.

### Pattern 2: Dispatching on controller.cron

The `ScheduledController` has a `cron` property (string) matching the exact expression that fired. Use it to dispatch:

```typescript
// Source: packages/cms/src/index.ts (existing scheduled handler — extend it)
export default {
  fetch: app.fetch.bind(app),
  async scheduled(controller: ScheduledController, env: any, ctx: ExecutionContext) {
    if (controller.cron === '0 */6 * * *') {
      // Demo reset
      const { DemoResetService } = await import('@flare-cms/core')
      const service = new DemoResetService(env.DB, env.CACHE_KV)
      ctx.waitUntil(service.run())
    } else {
      // Existing content scheduler (fires every minute)
      const scheduler = new SchedulerService(env.DB, env, ctx)
      ctx.waitUntil(scheduler.processScheduledContent())
    }
  },
}
```

**Important:** `controller.cron` is the EXACT string from the `crons` array. The comparison must match exactly.

**Source:** https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/ — `controller.cron` property documented.

### Pattern 3: DemoResetService Structure

```typescript
// packages/core/src/plugins/core-plugins/demo-sandbox/reset-service.ts

export class DemoResetService {
  constructor(
    private db: D1Database,
    private kv: KVNamespace | undefined
  ) {}

  /**
   * Entry point called by scheduled handler.
   * Runs sandbox reset + session purge sequentially.
   */
  async run(): Promise<void> {
    const resetResult = await this.resetSandboxContent()
    console.info('[demo-reset] content reset:', resetResult)
    const purgeResult = await this.purgeExpiredUsers()
    console.info('[demo-reset] user purge:', purgeResult)
  }

  /**
   * RESET-02: Delete visitor-created content in demo-sandbox-collection,
   * restore seeded rows to canonical state.
   */
  async resetSandboxContent(): Promise<{ deleted: number; reseeded: number }> { ... }

  /**
   * RESET-03: Delete demo user accounts whose KV session key has expired.
   * Identifies demo users by username LIKE 'demo-%' (set in demo-service.ts).
   */
  async purgeExpiredUsers(): Promise<{ purged: number }> { ... }
}
```

### Pattern 4: Sandbox Content Reset (RESET-02)

The 3 seed rows have stable IDs (`demo-sandbox-seed-1`, `demo-sandbox-seed-2`, `demo-sandbox-seed-3`) set in migration 038. The reset is two steps:

**Step 1 — delete visitor content:**
```sql
DELETE FROM content
WHERE collection_id = 'demo-sandbox-collection'
  AND id NOT IN ('demo-sandbox-seed-1', 'demo-sandbox-seed-2', 'demo-sandbox-seed-3')
```

**Step 2 — restore seed rows** (handles cases where a demo user deleted a seed row):
```sql
INSERT OR REPLACE INTO content (
  id, collection_id, slug, title, data, status, author_id, created_at, updated_at
) VALUES
('demo-sandbox-seed-1', 'demo-sandbox-collection', 'welcome-to-the-sandbox', 'Welcome to the Sandbox',
 '{"title":"Welcome to the Sandbox","content":"<p>This is the Flare CMS demo sandbox...</p>","status":"published"}',
 'published', 'admin-1770148233567-90a7ju7xz', <original_ts>, <now>),
-- ... same for seed-2 and seed-3
```

**Critical:** Use `INSERT OR REPLACE` not `INSERT OR IGNORE` — this also restores seed rows that were edited (title changed, content cleared, etc.). The `original_ts` for `created_at` should be hardcoded or fetched; using `Date.now()` for `created_at` is acceptable since visitors can't see created timestamps.

**D1 batch pattern:** Use `db.batch([...])` for atomic multi-statement execution:
```typescript
// Source: Direct codebase inspection — pattern used in migration execution
await this.db.batch([
  this.db.prepare('DELETE FROM content WHERE collection_id = ? AND id NOT IN (...)').bind('demo-sandbox-collection'),
  this.db.prepare('INSERT OR REPLACE INTO content (...) VALUES (...)').bind(...seed1),
  this.db.prepare('INSERT OR REPLACE INTO content (...) VALUES (...)').bind(...seed2),
  this.db.prepare('INSERT OR REPLACE INTO content (...) VALUES (...)').bind(...seed3),
])
```

**Also delete related rows:** `content_versions` has `content_id REFERENCES content(id)` — need to delete versions for visitor content before deleting content rows. Check FK enforcement.

### Pattern 5: Expired User Session Purge (RESET-03)

Demo users are identified by `username LIKE 'demo-%'` (set in `demo-service.ts` line 64). A session is "expired" when its KV key `demo-mutations:{userId}` no longer exists (KV TTL = 24h = 86400s).

**Algorithm:**
```typescript
async purgeExpiredUsers(): Promise<{ purged: number }> {
  // 1. Get all demo user IDs and emails
  const { results: demoUsers } = await this.db
    .prepare("SELECT id, email FROM users WHERE username LIKE 'demo-%'")
    .all<{ id: string; email: string }>()

  if (!demoUsers?.length) return { purged: 0 }

  const toDelete: string[] = []

  // 2. Check KV — if key missing, session expired
  for (const user of demoUsers) {
    if (!this.kv) {
      // If KV not available, fall back to age-based: delete users older than 48h
      // (2 × session window, conservative)
      break
    }
    const key = `demo-mutations:${user.id}`
    const val = await this.kv.get(key)
    if (val === null) {
      toDelete.push(user.id)
    }
  }

  if (!toDelete.length) return { purged: 0 }

  // 3. Delete in FK order:
  //    a. content_versions where author_id in toDelete
  //    b. content where author_id in toDelete AND collection_id = 'demo-sandbox-collection'
  //    c. user_collection_permissions (ON DELETE CASCADE from users — auto)
  //    d. otp_codes WHERE user_email IN (emails of toDelete users)
  //    e. users WHERE id IN toDelete

  // ... see Code Examples section for full implementation
}
```

**FK cascade behavior:** `user_collection_permissions` has `ON DELETE CASCADE` on `user_id` — deleting the user auto-removes permissions. `audit_log` has `user_id` column but NO FK constraint (verified in migration 037 SQL) — those rows remain (fine for analytics). `demo_signups` has `ON DELETE SET NULL` on `user_id` — those rows stay with `user_id = NULL` after delete (fine).

**D1 IN clause limitation:** D1/SQLite does not support `WHERE id IN (?)` with an array bind. Must build parameterized query with explicit placeholders: `WHERE id IN (?, ?, ?)`.

### Pattern 6: Wiring into cms/src/index.ts

The `DemoResetService` lives in `packages/core/src/plugins/core-plugins/demo-sandbox/reset-service.ts`. It must be exported from `packages/core/src/index.ts` (the core package entry point) for the CMS package to import it.

Check current exports:
```bash
grep "DemoResetService\|demo-sandbox" packages/core/src/index.ts
```
If not exported, add:
```typescript
export { DemoResetService } from './plugins/core-plugins/demo-sandbox/reset-service'
```

Alternatively, import directly via relative path from `packages/cms/src/index.ts` (since it's a monorepo with shared node_modules). But the clean pattern is to export from core's index.

### Anti-Patterns to Avoid

- **Using `INSERT OR IGNORE` for seed restore:** `IGNORE` won't update rows that exist but were edited by demo users. Use `INSERT OR REPLACE`.
- **Deleting users without deleting their content first:** `content.author_id REFERENCES users(id)` — SQLite may enforce FK. Delete demo user content in `demo-sandbox-collection` before deleting user rows (or the content reset in step 1 covers this if it runs first, but content rows authored by demo users in other collections are handled separately).
- **Using `WHERE id IN (?)` with array bind in D1:** SQLite/D1 requires explicit placeholder count. Build `IN (${placeholders})` dynamically.
- **Running reset during a live demo session:** The reset fires every 6h regardless of active sessions. There is no "active session" signal — JWT cookies are client-side. This is acceptable: a demo user mid-session will see content disappear and get an empty state. The 6h window makes this unlikely for 30-min sessions.
- **Adding a third `scheduled()` branch for every-minute cron:** Keep the `else` branch for the existing every-minute scheduler to avoid breaking content publishing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cron scheduling | Custom HTTP endpoint + external cron | Cloudflare `[triggers]` + `scheduled()` handler | First-class Workers feature, free on all plans |
| User identification for demo | New `is_demo` column | `username LIKE 'demo-%'` query | Pattern is set in demo-service.ts; no schema change needed |
| Session tracking | Session rows in D1 | KV key existence check | Demo "session" = KV key presence (per prior Phase 11 decision) |
| Batch deletes | Loop of individual DELETE calls | `db.batch([...])` or multi-row DELETE | D1 batch is atomic and more efficient |
| OTP code cleanup | Custom purge logic | `OTPService.cleanupExpiredCodes()` already exists | Re-use the method from otp-service.ts |

**Key insight:** The demo user lifecycle is fully determined by KV key existence. No new tracking infrastructure is needed — just read the KV and delete users whose keys are gone.

## Common Pitfalls

### Pitfall 1: Content versions not deleted before content rows
**What goes wrong:** `DELETE FROM content WHERE ...` fails or leaves orphaned `content_versions` rows because `content_versions.content_id REFERENCES content(id)`.
**Why it happens:** Visitor content accumulates versions. D1 may enforce FK constraints.
**How to avoid:** Delete versions first: `DELETE FROM content_versions WHERE content_id IN (SELECT id FROM content WHERE collection_id = 'demo-sandbox-collection' AND id NOT IN (...seed IDs))`. Then delete the content rows.
**Warning signs:** `FOREIGN KEY constraint failed` error in cron logs.

### Pitfall 2: Seed rows authored by admin — content delete must exclude them
**What goes wrong:** If the reset deletes ALL content in demo-sandbox-collection including seed rows, then `INSERT OR REPLACE` fails if author_id `admin-1770148233567-90a7ju7xz` doesn't exist in prod.
**Why it happens:** The admin ID is hardcoded in migration 038.
**How to avoid:** Use `INSERT OR REPLACE` not `INSERT INTO`, and verify the admin user ID exists in both local and remote D1. The ID `admin-1770148233567-90a7ju7xz` is the seeded admin used throughout the project (confirmed in MEMORY.md).
**Warning signs:** `FOREIGN KEY constraint failed` on re-seed INSERT.

### Pitfall 3: D1 parameterized IN clause with dynamic array
**What goes wrong:** `db.prepare('WHERE id IN (?)').bind(arrayOfIds)` does not work. D1 only supports one scalar per `?`.
**Why it happens:** D1 does not support array bindings.
**How to avoid:** Build placeholder string dynamically:
```typescript
const placeholders = toDelete.map(() => '?').join(', ')
await db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).bind(...toDelete).run()
```
**Warning signs:** Silent no-op (deletes 0 rows) or runtime error.

### Pitfall 4: cron expression mismatch in controller.cron dispatch
**What goes wrong:** `controller.cron === '0 */6 * * *'` does not match if wrangler.toml uses a slightly different form (e.g., spaces differ).
**Why it happens:** The `controller.cron` value is the exact string from the `crons` array.
**How to avoid:** Use a named constant: `const DEMO_RESET_CRON = '0 */6 * * *'` and reference it in both places (wrangler.toml is the source of truth — the constant is for documentation, not runtime injection).
**Warning signs:** Both crons fall through to the default `SchedulerService` branch.

### Pitfall 5: KV not available in scheduled handler
**What goes wrong:** `env.CACHE_KV` is undefined in the scheduled handler because `wrangler.toml` KV binding is only for `fetch` handler.
**Why it happens:** KV bindings are environment-level — they apply to ALL handlers (fetch, scheduled, queue). This is NOT a real risk in Cloudflare Workers.
**How to avoid:** (Not a real pitfall — KV bindings are available in scheduled handlers.) Pass `env.CACHE_KV` to `DemoResetService` constructor. Add a null check for local dev safety.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'get')`.

### Pitfall 6: KV list() approach for identifying expired users is wrong
**What goes wrong:** Using `kv.list({ prefix: 'demo-mutations:' })` to find active users and then computing expired = demoUsers - activeUsers. This seems efficient but `kv.list()` only returns up to 1000 keys per call and requires pagination for large datasets.
**Why it happens:** KV list seems like the natural approach.
**How to avoid:** Query D1 for all `username LIKE 'demo-%'` users first (D1 is the source of truth for user records), then check KV individually per user. For typical demo volumes (< 1000 users/day reset every 6h), individual KV gets are fine. For high-volume scenarios, reverse the approach: use `kv.list({ prefix: 'demo-mutations:' })` to get ACTIVE users and delete all demo users NOT in that set.
**Warning signs:** Users not being purged when there are >1000 concurrent demo users (unlikely for this project).

## Code Examples

### wrangler.toml: Adding Second Cron
```toml
# Source: Direct codebase inspection of packages/cms/wrangler.toml + CF docs
[triggers]
crons = ["* * * * *", "0 */6 * * *"]
```

### Scheduled Handler Dispatch (packages/cms/src/index.ts)
```typescript
// Source: existing handler in packages/cms/src/index.ts + controller.cron pattern
// from https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/
import { createFlareApp, registerCollections, SchedulerService, DemoResetService } from '@flare-cms/core'

export default {
  fetch: app.fetch.bind(app),
  async scheduled(controller: ScheduledController, env: any, ctx: ExecutionContext) {
    if (controller.cron === '0 */6 * * *') {
      const service = new DemoResetService(env.DB, env.CACHE_KV)
      ctx.waitUntil(service.run())
    } else {
      // Default: existing every-minute content scheduler
      const scheduler = new SchedulerService(env.DB, env, ctx)
      ctx.waitUntil(scheduler.processScheduledContent())
    }
  },
}
```

### DemoResetService.resetSandboxContent()
```typescript
// Source: Derived from migration 038 seed data + existing D1 patterns in scheduler.ts
const SEED_IDS = ['demo-sandbox-seed-1', 'demo-sandbox-seed-2', 'demo-sandbox-seed-3'] as const
const COLLECTION_ID = 'demo-sandbox-collection'
const ADMIN_ID = 'admin-1770148233567-90a7ju7xz'

async resetSandboxContent(): Promise<{ deleted: number; reseeded: number }> {
  const now = Date.now()

  // Step 1: Delete content_versions for non-seed content (FK safety)
  await this.db
    .prepare(`
      DELETE FROM content_versions
      WHERE content_id IN (
        SELECT id FROM content
        WHERE collection_id = ?
          AND id NOT IN ('demo-sandbox-seed-1', 'demo-sandbox-seed-2', 'demo-sandbox-seed-3')
      )
    `)
    .bind(COLLECTION_ID)
    .run()

  // Step 2: Delete non-seed content rows
  const deleteResult = await this.db
    .prepare(`
      DELETE FROM content
      WHERE collection_id = ?
        AND id NOT IN ('demo-sandbox-seed-1', 'demo-sandbox-seed-2', 'demo-sandbox-seed-3')
    `)
    .bind(COLLECTION_ID)
    .run()

  const deleted = deleteResult.meta.changes || 0

  // Step 3: Restore seed rows to canonical state (INSERT OR REPLACE handles edited rows)
  const seed1Data = JSON.stringify({
    title: 'Welcome to the Sandbox',
    content: '<p>This is the Flare CMS demo sandbox. You can create, edit, and delete content here to explore how the CMS works.</p><p>Your changes are scoped to your demo session — feel free to experiment!</p>',
    status: 'published',
  })
  const seed2Data = JSON.stringify({
    title: 'Try Editing This Post',
    content: '<p>Click the edit button above to modify this content. You can change the title, update this body text, and save your changes.</p><p>This is a great way to see how the content editor works in Flare CMS.</p>',
    status: 'published',
  })
  const seed3Data = JSON.stringify({
    title: 'Create Your Own Content',
    content: '<p>Use the <strong>New Content</strong> button to create your own entries in this sandbox collection.</p><p>Try adding a title and some rich text content — you have full editor access to this collection.</p>',
    status: 'published',
  })

  await this.db.batch([
    this.db.prepare(`
      INSERT OR REPLACE INTO content (id, collection_id, slug, title, data, status, author_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind('demo-sandbox-seed-1', COLLECTION_ID, 'welcome-to-the-sandbox', 'Welcome to the Sandbox', seed1Data, 'published', ADMIN_ID, now, now),
    this.db.prepare(`
      INSERT OR REPLACE INTO content (id, collection_id, slug, title, data, status, author_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind('demo-sandbox-seed-2', COLLECTION_ID, 'try-editing-this-post', 'Try Editing This Post', seed2Data, 'published', ADMIN_ID, now, now),
    this.db.prepare(`
      INSERT OR REPLACE INTO content (id, collection_id, slug, title, data, status, author_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind('demo-sandbox-seed-3', COLLECTION_ID, 'create-your-own-content', 'Create Your Own Content', seed3Data, 'published', ADMIN_ID, now, now),
  ])

  return { deleted, reseeded: 3 }
}
```

### DemoResetService.purgeExpiredUsers()
```typescript
// Source: Derived from demo-service.ts patterns + KV TTL knowledge from Phase 11
async purgeExpiredUsers(): Promise<{ purged: number }> {
  // Identify all demo accounts
  const { results: demoUsers } = await this.db
    .prepare("SELECT id, email FROM users WHERE username LIKE 'demo-%'")
    .all<{ id: string; email: string }>()

  if (!demoUsers?.length) return { purged: 0 }

  // Check KV — key absent means session expired (TTL=24h elapsed)
  const toDelete: Array<{ id: string; email: string }> = []

  if (this.kv) {
    for (const user of demoUsers) {
      const val = await this.kv.get(`demo-mutations:${user.id}`)
      if (val === null) {
        toDelete.push(user)
      }
    }
  } else {
    // KV unavailable (e.g., local dev without KV): delete all demo users older than 48h
    const cutoff = Date.now() - 48 * 60 * 60 * 1000
    const { results: old } = await this.db
      .prepare("SELECT id, email FROM users WHERE username LIKE 'demo-%' AND created_at < ?")
      .bind(cutoff)
      .all<{ id: string; email: string }>()
    toDelete.push(...(old ?? []))
  }

  if (!toDelete.length) return { purged: 0 }

  const ids = toDelete.map(u => u.id)
  const emails = toDelete.map(u => u.email)

  // Build parameterized IN clause (D1 requires explicit placeholders)
  const idPlaceholders = ids.map(() => '?').join(', ')
  const emailPlaceholders = emails.map(() => '?').join(', ')

  // Delete OTP codes for these emails (not FK-cascaded)
  await this.db
    .prepare(`DELETE FROM otp_codes WHERE user_email IN (${emailPlaceholders})`)
    .bind(...emails)
    .run()

  // Delete users — triggers ON DELETE CASCADE on user_collection_permissions
  // demo_signups.user_id is ON DELETE SET NULL (preserved for analytics)
  // audit_log has no FK constraint (preserved for audit trail)
  const deleteResult = await this.db
    .prepare(`DELETE FROM users WHERE id IN (${idPlaceholders})`)
    .bind(...ids)
    .run()

  return { purged: deleteResult.meta.changes || 0 }
}
```

### Local Testing of Cron (wrangler dev)
```bash
# Source: https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/
# Start dev server with scheduled endpoint exposed:
npx wrangler dev --test-scheduled

# Then trigger the 6-hour cron:
curl "http://localhost:8787/__scheduled?cron=0+*/6+*+*+*"
```

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|-----------------|-------|
| Single cron for content publishing | Multi-cron via `controller.cron` dispatch | Workers supports multiple crons in one `crons` array |
| Manual DB cleanup | Automated 6h cron | Zero-ops approach |

## Open Questions

1. **content_versions FK enforcement in D1**
   - What we know: `content_versions` has `content_id REFERENCES content(id)` in migration 001 SQL. D1 runs SQLite which respects FK constraints IF `PRAGMA foreign_keys = ON`.
   - What's unclear: Does the existing Drizzle/D1 setup enable `PRAGMA foreign_keys = ON` globally? If not, delete order doesn't matter.
   - Recommendation: Delete `content_versions` for non-seed content BEFORE deleting `content` rows regardless, as defensive practice. The subquery approach avoids needing to pass IDs.

2. **Batch size for KV checks during user purge**
   - What we know: The cron purges every 6h. Demo sessions are 30 minutes, KV TTL is 24h. In 6h, new demo users accumulate. Number of simultaneous demo users is unknown.
   - What's unclear: At high traffic, the serial KV.get() loop could be slow. Each KV get is ~1ms in Workers.
   - Recommendation: For v2.1, accept serial KV checks. If the demo scales, revisit with `kv.list()` inverse approach.

3. **Export path for DemoResetService**
   - What we know: `packages/core/src/index.ts` currently exports various services. The CMS package imports from `@flare-cms/core`.
   - What's unclear: Whether to export `DemoResetService` from core's public API or import directly.
   - Recommendation: Export from `packages/core/src/plugins/core-plugins/demo-sandbox/reset-service.ts` and add a re-export in `packages/core/src/index.ts`. Same pattern as `SchedulerService`.

## Sources

### Primary (HIGH confidence)
- Direct inspection: `packages/cms/src/index.ts` — existing `scheduled()` handler pattern, `SchedulerService` usage, `ctx.waitUntil()`
- Direct inspection: `packages/cms/wrangler.toml` — current `crons = ["* * * * *"]` config, KV/D1 binding names
- Direct inspection: `packages/core/src/db/migrations/038_demo_sandbox.sql` — exact seed row IDs, schema, admin ID
- Direct inspection: `packages/core/src/plugins/core-plugins/demo-sandbox/demo-service.ts` — `username = 'demo-${shortId}'` pattern, KV key format `demo-mutations:{userId}`, 86400s TTL
- Direct inspection: `packages/core/src/plugins/core-plugins/demo-sandbox/middleware.ts` — KV key = demo user identity (NOT role)
- Direct inspection: `packages/core/src/db/migrations-bundle.ts` migration 034 SQL — `ON DELETE CASCADE` on `user_collection_permissions.user_id`
- Direct inspection: `packages/core/src/db/migrations-bundle.ts` migration 037 SQL — `audit_log.user_id` has NO FK constraint
- Direct inspection: `packages/core/src/db/migrations/038_demo_sandbox.sql` — `demo_signups.user_id ON DELETE SET NULL`
- Direct inspection: `packages/core/src/plugins/core-plugins/otp-login-plugin/otp-service.ts` — `cleanupExpiredCodes()` method exists for OTP cleanup
- https://developers.cloudflare.com/workers/configuration/cron-triggers/ — cron syntax, multiple crons in array
- https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/ — `ScheduledController.cron` property, `ctx.waitUntil`, local testing with `--test-scheduled`

### Secondary (MEDIUM confidence)
- Inferred from D1 documentation: `IN (?)` does not accept array binds — must use explicit `(?, ?, ?)` placeholders

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools already in repo, wrangler.toml confirmed
- Cron trigger pattern: HIGH — official Cloudflare docs confirm syntax and controller.cron property
- Content reset SQL: HIGH — seed IDs and schema from direct migration inspection
- User purge algorithm: HIGH — username pattern, KV key format, FK cascade rules all from direct inspection
- D1 batch vs individual statements: MEDIUM — D1 batch API seen used in other parts but not deeply verified for this use case
- FK enforcement in D1: MEDIUM — SQLite FKs require PRAGMA; D1 default not verified

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable codebase, no fast-moving external deps)
