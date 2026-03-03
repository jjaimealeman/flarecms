# Phase 2: Content Workflow - Research

**Researched:** 2026-03-01
**Domain:** SonicJS content lifecycle, RBAC, API tokens, Cloudflare Workers scheduled triggers, D1/SQLite patterns
**Confidence:** HIGH

---

## Summary

Phase 2 builds content workflow capabilities directly into the `sonicjs-fork` codebase, which is already wired into `my-astro-cms` via `file:` dependency from Phase 1. The fork already contains substantial infrastructure for this phase: `workflow_history`, `scheduled_content`, `content_workflow_status`, `api_tokens`, and `workflow_states` tables all exist in the migrations bundle (Stage 5 and Stage 7 migrations). The `SchedulerService` class in the workflow plugin fully implements `processScheduledContent()`. The `QueryFilterBuilder` class exists and builds parameterized SQL — but it only parses `?where=<JSON>` and simple `?status=` params, not the `filter[field][op]=value` bracket syntax the API spec documents.

The primary implementation work is: (1) adding the bracket-syntax filter parser to `QueryFilterBuilder.parseFromQuery()`, (2) fixing the content status machine to allow published→draft transitions and add slug-lock-on-publish, (3) wiring the `SchedulerService.processScheduledContent()` to a Workers cron trigger, (4) extending `workflow_history` to also capture content edits (not just status changes), (5) implementing collection-level RBAC with a new `user_collection_permissions` table, and (6) securing `api_tokens` with hashed storage and collection scoping. The admin UI is HTMX-based (server-rendered HTML from Hono route handlers + Hono templates).

**Primary recommendation:** Extend and fix existing infrastructure — do not create new service classes. The `WorkflowEngine`, `SchedulerService`, and `QueryFilterBuilder` are already the right abstractions; they just need gaps filled and new features added.

---

## Standard Stack

### Core (already in place — do not change)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Hono | ^4.11.7 | Web framework, routing, middleware | Project standard, CSRF-compatible |
| Drizzle ORM | ^0.44.7 | D1 query builder and schema | Project standard |
| drizzle-zod | ^0.7.0 | Zod schemas from Drizzle tables | Auto-validates insert/select shapes |
| `hono/jwt` | (bundled) | JWT sign/verify | Used by `AuthManager` already |
| `crypto.subtle` | (Cloudflare runtime) | PBKDF2 password hashing, token hashing | Workers-native, no npm dependency |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `hono/cookie` | (bundled) | Cookie read/write | Already used in auth middleware |
| `hono/html` | (bundled) | HTML template tag | All admin UI templates |
| D1 raw SQL | (Cloudflare runtime) | Complex queries with JOINs | When Drizzle query builder is insufficient |

### No New Dependencies Needed

All Phase 2 work uses the existing stack. Do not add new npm packages unless explicitly required.

---

## Architecture Patterns

### Existing File Layout (extend, don't restructure)

```
sonicjs-fork/packages/core/src/
├── db/
│   ├── schema.ts                    # Drizzle table definitions — add new tables here
│   └── migrations-bundle.ts         # Auto-generated — regenerate after schema changes
├── middleware/
│   └── auth.ts                      # requireAuth(), requireRole(), AuthManager
├── routes/
│   ├── api.ts                       # GET /api/collections/:name/content (add filter fix here)
│   ├── api-content-crud.ts          # POST/PUT/DELETE /api/content (add RBAC checks here)
│   ├── admin-content.ts             # Admin UI routes (add unpublish action here)
│   └── admin-users.ts               # Admin UI users (add RBAC assignment UI here)
├── plugins/core-plugins/workflow-plugin/
│   └── services/
│       ├── workflow-service.ts      # WorkflowEngine — add bidirectional transitions
│       └── scheduler.ts             # SchedulerService — already has processScheduledContent()
└── utils/
    └── query-filter.ts              # QueryFilterBuilder — add bracket-syntax parser here
```

### Pattern 1: Bracket-Syntax Filter Parsing (CONT-01)

**What:** `filter[field][op]=value` URL params parsed into `QueryFilter.where.and[]` conditions.

**What currently exists:** `QueryFilterBuilder.parseFromQuery()` only handles `?where=<JSON>`, `?status=`, `?collection_id=`, `?limit=`, `?offset=`, `?sort=`. The `filter[...]` bracket syntax is NOT parsed — this is the CONT-01 bug.

**Fix location:** `packages/core/src/utils/query-filter.ts`, `parseFromQuery()` static method.

**How to implement:** Iterate query params and detect keys matching `/^filter\[([^\]]+)\]\[([^\]]+)\]$/` pattern. Map to existing `FilterOperator` types.

```typescript
// Source: analysis of query-filter.ts parseFromQuery() method
// Add to parseFromQuery() after the simpleFieldMappings loop:
for (const [key, value] of Object.entries(query)) {
  const match = key.match(/^filter\[([^\]]+)\]\[([^\]]+)\]$/)
  if (match) {
    const [, field, op] = match
    const operator = mapOperator(op) // 'equals' | 'like' | 'contains' | etc.
    if (operator && field) {
      filter.where!.and!.push({ field, operator, value })
    }
  }
}

// Operator mapping (bracket-param name → FilterOperator):
// 'equals'      → 'equals'
// 'eq'          → 'equals'
// 'not_equals'  → 'not_equals'
// 'ne'          → 'not_equals'
// 'like'        → 'like'
// 'contains'    → 'contains'
// 'gt'          → 'greater_than'
// 'gte'         → 'greater_than_equal'
// 'lt'          → 'less_than'
// 'lte'         → 'less_than_equal'
// 'in'          → 'in'
```

**Security note:** `sanitizeFieldName()` already prevents SQL injection via regex. No additional sanitization needed.

### Pattern 2: Content State Machine (CONT-02)

**What:** Enforce valid status transitions and add slug-lock-on-publish.

**Current state:** The PUT route in `api-content-crud.ts` accepts any `status` value without validation. The admin content route (`admin-content.ts`) appears to have the same gap. The `WorkflowEngine.transitionContent()` validates against `workflow_transitions` table but the simple `status` column update bypasses this.

**Decision (from CONTEXT.md):**
- Valid statuses: `draft`, `published`, `archived`
- Valid transitions: draft→published, draft→archived, published→draft (unpublish), published→archived, archived→draft
- Slug is locked after first publish (cannot change once published)
- Unpublish clears `scheduled_publish_at` and `scheduled_unpublish_at`

**Implementation approach:** Add a `validateStatusTransition()` function called before any status update in both API and admin routes. Enforce slug lock by checking `content.published_at` before allowing slug updates.

```typescript
// Source: analysis of schema.ts and api-content-crud.ts
// Transition validation — add to a shared service:
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['published', 'archived'],
  published: ['draft', 'archived'],
  archived: ['draft'],
}

function validateStatusTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

// Slug lock — add to PUT handler in api-content-crud.ts:
if (body.slug !== undefined && existing.published_at !== null) {
  return c.json({ error: 'Slug cannot be changed after first publish' }, 409)
}

// Unpublish clears scheduled dates — add to status transition handler:
if (to === 'draft' && from === 'published') {
  await db.prepare(`
    UPDATE content
    SET status = 'draft', published_at = NULL,
        scheduled_publish_at = NULL, scheduled_unpublish_at = NULL,
        updated_at = ?
    WHERE id = ?
  `).bind(Date.now(), contentId).run()
}
```

### Pattern 3: Workflow History Audit Trail (CONT-03)

**What:** Log all status transitions AND content edits to `workflow_history`.

**Current schema (`workflow_history` in migrations bundle migration 001):**
```sql
CREATE TABLE IF NOT EXISTS workflow_history (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES content(id),
  action TEXT NOT NULL,         -- 'status_change', 'edit', 'publish', etc.
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  comment TEXT,
  created_at INTEGER NOT NULL
)
```

**Gap:** This schema only tracks status changes (from_status/to_status). It cannot store field-level old/new values for content edits per CONTEXT.md decisions ("Stores old + new values for field changes").

**Required schema extension:** Add a `changed_fields` column (JSON) to store field diff.

```sql
-- New migration needed:
ALTER TABLE workflow_history ADD COLUMN changed_fields TEXT; -- JSON: {fieldName: {old, new}}
ALTER TABLE workflow_history ADD COLUMN action_type TEXT DEFAULT 'status_change';
-- action_type values: 'status_change', 'content_edit', 'publish', 'unpublish', 'archive', 'rollback'
```

**Log call pattern — add to PUT handler in api-content-crud.ts:**
```typescript
// Source: analysis of workflow_history schema and WorkflowEngine pattern
// After successful UPDATE content:
const changedFields: Record<string, {old: any; new: any}> = {}
if (body.title !== undefined && body.title !== existing.title) {
  changedFields['title'] = { old: existing.title, new: body.title }
}
// ... repeat for data, slug

await db.prepare(`
  INSERT INTO workflow_history
  (id, content_id, action, from_status, to_status, user_id, changed_fields, action_type, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).bind(
  crypto.randomUUID(),
  id,
  'content_edit',
  existing.status,
  body.status ?? existing.status,
  user.userId,
  JSON.stringify(changedFields),
  'content_edit',
  Date.now()
).run()
```

### Pattern 4: Workers Cron Trigger (CONT-05)

**What:** Run `SchedulerService.processScheduledContent()` every minute via Workers scheduled trigger.

**SchedulerService status:** `processScheduledContent()` is fully implemented in `packages/core/src/plugins/core-plugins/workflow-plugin/services/scheduler.ts`. It queries `WHERE status = 'pending' AND scheduled_at <= datetime('now')` and processes up to 50 items.

**Critical gap:** The Workers export in `my-astro-cms/src/index.ts` only exports `default createSonicJSApp(config)`. Workers scheduled triggers require a named `scheduled` export on the default export object.

**Implementation:** Wrap the export in `my-astro-cms/src/index.ts` to include the scheduled handler.

```typescript
// Source: https://developers.cloudflare.com/workers/configuration/cron-triggers/
// my-astro-cms/src/index.ts pattern:
import { SchedulerService } from '@sonicjs-cms/core'

const app = createSonicJSApp(config)

export default {
  fetch: app.fetch,
  async scheduled(controller: ScheduledController, env: Bindings, ctx: ExecutionContext) {
    const scheduler = new SchedulerService(env.DB)
    ctx.waitUntil(scheduler.processScheduledContent())
  }
}
```

**wrangler.toml addition:**
```toml
[triggers]
crons = ["* * * * *"]   # Every minute
```

**Note:** Workers cron triggers run on UTC time only. The `SchedulerService` already stores `timezone` but uses `scheduled_at <= datetime('now')` in SQL, which compares UTC. Timezone handling is application-level (convert to UTC on save). This is acceptable.

### Pattern 5: RBAC with Collection-Level Permissions (AUTH-01)

**Current state:** The `users` table has a `role` column (`admin`, `editor`, `author`, `viewer`). The `requireRole()` middleware checks `user.role`. The JWT payload carries only `{ userId, email, role }`. There are no collection-level permission records.

**What's needed:** A new `user_collection_permissions` table linking users to specific collections with their allowed role.

```sql
-- New table needed:
CREATE TABLE IF NOT EXISTS user_collection_permissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'editor', 'author', 'viewer'
  granted_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, collection_id)
);
CREATE INDEX IF NOT EXISTS idx_ucp_user ON user_collection_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_ucp_collection ON user_collection_permissions(collection_id);
```

**Role capability matrix (from CONTEXT.md decisions):**

| Role | Create content | Edit any content | Edit own content | Schema/users | Collections |
|------|---------------|-----------------|-----------------|-------------|-------------|
| admin | All | Yes | Yes | Yes | Yes |
| editor | In assigned collections | Yes (assigned) | Yes | No | No |
| author | In assigned collections | No | Yes | No | No |
| viewer | No | No | No | No | No |

**JWT does not carry collection permissions** — check against DB at request time. D1 reads are fast (<5ms) and the pattern already exists for other middleware.

**Enforcement pattern — add to api-content-crud.ts:**
```typescript
// Source: analysis of auth.ts requireRole() pattern
async function checkCollectionPermission(
  db: D1Database,
  userId: string,
  globalRole: string,
  collectionId: string,
  requiredAction: 'read' | 'create' | 'edit' | 'publish'
): Promise<boolean> {
  if (globalRole === 'admin') return true  // admin bypasses all collection checks

  const perm = await db.prepare(`
    SELECT role FROM user_collection_permissions
    WHERE user_id = ? AND collection_id = ?
  `).bind(userId, collectionId).first()

  if (!perm) return false  // No assignment = no access

  const collectionRole = perm.role as string
  if (collectionRole === 'viewer') return requiredAction === 'read'
  if (collectionRole === 'editor') return true  // editor can read, create, edit, publish
  if (collectionRole === 'author') {
    // author can only edit their own content
    if (requiredAction === 'edit') {
      // Caller must additionally verify content.author_id === userId
      return true  // permission check passes; ownership check is separate
    }
    return requiredAction === 'create' || requiredAction === 'read'
  }
  return false
}
```

**UI hiding pattern (HTMX/Hono templates):** Render conditional HTML based on user role loaded from DB. Since the admin is server-rendered, simply don't render buttons/links the user's role doesn't allow. Do not rely on client-side JS to hide elements.

### Pattern 6: Read-Only API Tokens (AUTH-02)

**Current state:** `api_tokens` table exists with columns: `id, name, token, user_id, permissions (JSON), expires_at, last_used_at, created_at`. The `token` column stores the token value directly (plaintext). This needs to be hashed.

**Required changes:**
1. Add `token_prefix` column (first 8 chars, shown in UI after creation)
2. Change `token` column to store SHA-256 hash of the token value
3. Add `allowed_collections` column (JSON array of collection IDs, null = all)

```sql
-- New migration:
ALTER TABLE api_tokens ADD COLUMN token_prefix TEXT;           -- 'st_abc123' shown in UI
ALTER TABLE api_tokens ADD COLUMN token_hash TEXT;             -- SHA-256 of token value
ALTER TABLE api_tokens ADD COLUMN allowed_collections TEXT;    -- JSON array or NULL for all
ALTER TABLE api_tokens ADD COLUMN is_read_only INTEGER DEFAULT 1; -- 1 = read-only
-- Backfill: copy existing token → token_hash (or invalidate existing tokens)
```

**Token format:** `st_<32 random hex chars>` — prefix `st_` for "SonicJS Token", then UUID-derived random value.

**Hashing — use Web Crypto (already available in Workers):**
```typescript
// Source: analysis of auth.ts (uses crypto.subtle already)
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
```

**Token auth middleware — add to `requireAuth()` or as a new `requireApiToken()` middleware:**
```typescript
// Source: analysis of auth.ts requireAuth() pattern
// Check for X-API-Key header first, before JWT:
const apiKey = c.req.header('X-API-Key')
if (apiKey) {
  const tokenHash = await hashToken(apiKey)
  const tokenRecord = await db.prepare(`
    SELECT * FROM api_tokens
    WHERE token_hash = ?
      AND (expires_at IS NULL OR expires_at > ?)
  `).bind(tokenHash, Date.now()).first()

  if (!tokenRecord) return c.json({ error: 'Invalid API token' }, 401)

  // Update last_used_at
  await db.prepare(`UPDATE api_tokens SET last_used_at = ? WHERE id = ?`)
    .bind(Date.now(), tokenRecord.id).run()

  // Set read-only context and collection scoping
  c.set('apiToken', tokenRecord)
  c.set('user', { userId: tokenRecord.user_id, role: 'viewer', email: '' })
  return next()
}
```

### Pattern 7: Content Versioning Modal Fix (CONT-04)

**What:** Bug #666 — versioning modal closes incorrectly.

**Location:** `packages/core/src/routes/admin-content.ts` (version history rendering) and `packages/core/src/templates/components/version-history.template.ts`.

**Approach:** Read the existing version history template. The fix is likely a missing `hx-swap` attribute or incorrect HTMX event targeting. Rollback should POST to a route that updates `content.data` from the version record and inserts a workflow_history entry with `action_type = 'rollback'`.

**No architecture change needed** — this is a targeted UI bug fix.

### Anti-Patterns to Avoid

- **Duplicating status update logic:** The status machine logic must be in ONE place (a shared service function), not copy-pasted into API route and admin route separately.
- **Storing plaintext API tokens:** Token column must store hash. Show plaintext value ONCE at creation, then never again.
- **Checking RBAC only at the API level:** Admin UI routes must also enforce role checks — don't rely on the frontend to hide things without server enforcement.
- **Re-implementing WorkflowEngine:** The existing class handles state transition recording correctly. Extend it rather than working around it.
- **Cron trigger on the fork package:** The scheduled handler goes in `my-astro-cms/src/index.ts`, not in the core package. The core package exports the service; the app wires it to the trigger.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token hashing | Custom hash function | `crypto.subtle.digest('SHA-256', ...)` | Already used in `AuthManager`, Workers-native |
| JWT parsing | Manual header parsing | `hono/jwt` `verify()` | Already in `AuthManager.verifyToken()` |
| SQL WHERE clauses | String concatenation | `QueryFilterBuilder` (existing) | Parameterized, injection-safe |
| Status transition table | Hardcoded if/else | `VALID_TRANSITIONS` map (simple object) | Easy to read and extend |
| Cron scheduling | Cloudflare Queues, Durable Objects | Workers cron trigger + D1 `scheduled_content` table | `SchedulerService.processScheduledContent()` already implemented |
| Collection permissions table | Custom session/cache | D1 `user_collection_permissions` table | Authoritative, consistent, already the pattern for all other data |

**Key insight:** This codebase uses raw D1 SQL (not the Drizzle query builder) in routes for flexibility. Follow the established pattern: raw SQL in service methods and route handlers, Drizzle schema definitions in `schema.ts` for type safety and migrations.

---

## Common Pitfalls

### Pitfall 1: D1 Does Not Support `ALTER TABLE ADD CONSTRAINT`

**What goes wrong:** SQLite (D1) does not support adding a UNIQUE constraint via ALTER TABLE after table creation.

**Why it happens:** Slug uniqueness (CONT-06) requires `UNIQUE(collection_id, slug)`. The `content` table already exists without this constraint. SQLite cannot add constraints to existing tables.

**How to avoid:** Use application-level uniqueness check (already present in `api-content-crud.ts` POST handler as a `SELECT` before INSERT). For the existing data and table, enforce at application level only. Do NOT attempt `ALTER TABLE content ADD CONSTRAINT UNIQUE(collection_id, slug)` — it will error.

**Also:** Add a DB index `CREATE UNIQUE INDEX IF NOT EXISTS idx_content_collection_slug ON content(collection_id, slug)` in a new migration. SQLite supports unique indexes on existing tables via `CREATE UNIQUE INDEX`. This enforces uniqueness at the DB level without needing a table constraint.

**Warning signs:** Migration fails with "near CONSTRAINT: syntax error"

### Pitfall 2: Schema Divergence Between `schema.ts` and Migrations Bundle

**What goes wrong:** Drizzle `schema.ts` has the `workflowHistory` table with columns `action`, `fromStatus`, `toStatus`. The actual migrations bundle (migration 001) creates `workflow_history` with the same column names. But Stage 7 migration creates a DIFFERENT `workflow_history` table (with `workflow_id`, `from_state_id`, `to_state_id` — the complex workflow plugin schema). These two schemas conflict.

**Root cause:** There are TWO `workflow_history` table definitions in this codebase:
1. Simple (migration 001): `action, from_status, to_status, user_id, comment` — used by the simple CRUD API
2. Complex (Stage 7 / workflow-plugin): `workflow_id, from_state_id, to_state_id, user_id, comment, metadata` — used by `WorkflowEngine`

Since `CREATE TABLE IF NOT EXISTS` is used, migration 001 runs first and creates the simple schema. Stage 7 migration also uses `CREATE TABLE IF NOT EXISTS workflow_history` but with different columns — it will silently succeed without adding the complex columns because the table already exists.

**How to avoid:** For Phase 2, use the simple `workflow_history` table (migration 001 schema) as the canonical audit trail. Add the `changed_fields` and `action_type` columns via a new ALTER TABLE migration. Do not attempt to unify the two schemas — the complex `workflow_states`/`content_workflow_status` tables from Stage 7 are orthogonal to the simple audit trail.

**Warning signs:** `workflow_id` column not found in workflow_history, or INSERT fails with "no such column"

### Pitfall 3: Workers Scheduled Handler Export Format

**What goes wrong:** Exporting the app as `export default app` works for fetch requests but means no `scheduled` function is available. Adding `scheduled` to the same default export only works with the module format.

**How to avoid:** Use the object export format in `my-astro-cms/src/index.ts`:
```typescript
export default {
  fetch: app.fetch,
  async scheduled(controller, env, ctx) { ... }
}
```
Do NOT do `export default app` if you also need `scheduled`. Hono's `app.fetch` is the fetch handler.

**Warning signs:** Cron trigger fires but nothing processes; wrangler logs show no `scheduled` handler

### Pitfall 4: HTMX Admin UI Requires Server-Side Role Enforcement

**What goes wrong:** Hiding admin buttons in the HTMX template is only cosmetic. If the underlying route doesn't check role, a user can POST directly to `/admin/content/:id` to publish.

**How to avoid:** ALL admin routes that mutate state must call `requireRole()` or the equivalent collection permission check, not just the API routes. The admin UI is not a separate app — it uses the same Hono router.

**Warning signs:** Editor user can access admin URLs directly that should be admin-only

### Pitfall 5: Filter Params with Brackets Are Percent-Encoded in Some Clients

**What goes wrong:** `filter[status][equals]=published` may arrive as `filter%5Bstatus%5D%5Bequals%5D=published` from some HTTP clients. Hono's `c.req.query()` returns decoded keys — but verify this is the case.

**How to avoid:** Use `c.req.query()` (Hono auto-decodes) not `c.req.raw.url`. Test with curl: `curl "http://localhost:8787/api/collections/blog-posts/content?filter%5Bstatus%5D%5Bequals%5D=published"`.

**Warning signs:** Filter params not recognized when sent percent-encoded

### Pitfall 6: Content Versions Table Schema Conflict

**What goes wrong:** The initial migration (001) creates `content_versions` with columns `(id, content_id, version, data, author_id, created_at)`. Stage 7 migration also creates `content_versions` with a DIFFERENT schema `(id, content_id, version_number, title, content, fields, user_id, change_summary, created_at)`. Same `IF NOT EXISTS` problem as pitfall 2 — Stage 7 silently skips because table already exists.

**How to avoid:** Use the migration 001 `content_versions` schema (with `version`, `data`, `author_id`) as authoritative. Add missing columns via ALTER TABLE if needed. The version history template in `admin-content.ts` already uses this table — check column names it expects before adding migrations.

---

## Code Examples

### Extending parseFromQuery() for bracket syntax

```typescript
// Source: packages/core/src/utils/query-filter.ts — parseFromQuery() method
// Add this block after the simpleFieldMappings loop:

// Parse filter[field][op]=value bracket syntax
const OPERATOR_MAP: Record<string, FilterOperator> = {
  'equals': 'equals', 'eq': 'equals',
  'not_equals': 'not_equals', 'ne': 'not_equals',
  'like': 'like',
  'contains': 'contains',
  'greater_than': 'greater_than', 'gt': 'greater_than',
  'greater_than_equal': 'greater_than_equal', 'gte': 'greater_than_equal',
  'less_than': 'less_than', 'lt': 'less_than',
  'less_than_equal': 'less_than_equal', 'lte': 'less_than_equal',
  'in': 'in',
  'not_in': 'not_in',
  'exists': 'exists',
}

for (const [key, value] of Object.entries(query)) {
  const match = key.match(/^filter\[([^\]]+)\]\[([^\]]+)\]$/)
  if (match && match[1] && match[2]) {
    const field = match[1]
    const op = OPERATOR_MAP[match[2].toLowerCase()]
    if (op) {
      filter.where!.and!.push({ field, operator: op, value })
    }
  }
}
```

### Cron trigger wiring in my-astro-cms

```typescript
// Source: https://developers.cloudflare.com/workers/configuration/cron-triggers/
// my-astro-cms/src/index.ts — replace `export default createSonicJSApp(config)`:

import { createSonicJSApp, registerCollections } from '@sonicjs-cms/core'
import { SchedulerService } from '@sonicjs-cms/core'
import type { Bindings } from '@sonicjs-cms/core'

registerCollections([blogPostsCollection])

const config = { /* ... */ }
const app = createSonicJSApp(config)

export default {
  fetch: app.fetch.bind(app),
  async scheduled(
    controller: ScheduledController,
    env: Bindings,
    ctx: ExecutionContext
  ) {
    const scheduler = new SchedulerService(env.DB)
    ctx.waitUntil(scheduler.processScheduledContent())
  },
}
```

### API token creation (admin route handler)

```typescript
// Source: analysis of api_tokens schema and auth.ts crypto.subtle pattern
// In admin API token creation handler:

async function createApiToken(
  db: D1Database,
  name: string,
  userId: string,
  allowedCollections: string[] | null,
  expiresAt: number | null
): Promise<{ tokenValue: string; tokenPrefix: string; id: string }> {
  // Generate token value (shown once to user)
  const rawBytes = crypto.getRandomValues(new Uint8Array(24))
  const tokenValue = 'st_' + Array.from(rawBytes)
    .map(b => b.toString(16).padStart(2, '0')).join('')

  const tokenPrefix = tokenValue.substring(0, 10) // 'st_' + first 7 chars

  // Hash for storage
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(tokenValue))
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  const id = crypto.randomUUID()
  await db.prepare(`
    INSERT INTO api_tokens (id, name, token, token_hash, token_prefix,
      user_id, permissions, allowed_collections, is_read_only, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    id, name,
    tokenHash,   // token column now stores hash
    tokenHash,   // token_hash column (after migration)
    tokenPrefix,
    userId,
    JSON.stringify(['content:read']),
    allowedCollections ? JSON.stringify(allowedCollections) : null,
    expiresAt,
    Date.now()
  ).run()

  return { tokenValue, tokenPrefix, id }  // tokenValue returned ONCE to caller
}
```

### D1 unique index for slug uniqueness (migration)

```sql
-- New migration file for CONT-06:
-- Enforce per-collection slug uniqueness via unique index
-- (ALTER TABLE ADD CONSTRAINT is not supported in SQLite)
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_collection_slug
  ON content(collection_id, slug);
```

---

## Current Schema Status (What Already Exists)

### Tables that exist and are usable as-is:

| Table | Status | Notes |
|-------|--------|-------|
| `users` | Exists, usable | Has `role` column. No collection-level permission column. |
| `content` | Exists, usable | Has `status`, `published_at`, `scheduled_publish_at`, `workflow_state_id` |
| `content_versions` | Exists | Schema: `(id, content_id, version, data, author_id, created_at)` — migration 001 |
| `workflow_history` | Exists | Schema: `(id, content_id, action, from_status, to_status, user_id, comment, created_at)` — migration 001 |
| `api_tokens` | Exists | Has `token` (plaintext), `permissions` (JSON), `expires_at`. Missing: `token_hash`, `token_prefix`, `allowed_collections`, `is_read_only` |
| `scheduled_content` | Exists (Stage 7) | Full schema present: `(id, content_id, action, scheduled_at, timezone, user_id, status, executed_at, error_message)` |

### Tables that need to be created:

| Table | Purpose |
|-------|---------|
| `user_collection_permissions` | Collection-level RBAC assignments |

### Columns that need to be added:

| Table | Columns | Migration type |
|-------|---------|----------------|
| `workflow_history` | `changed_fields TEXT`, `action_type TEXT` | `ALTER TABLE ADD COLUMN` |
| `api_tokens` | `token_hash TEXT`, `token_prefix TEXT`, `allowed_collections TEXT`, `is_read_only INTEGER` | `ALTER TABLE ADD COLUMN` |
| `content` | No new columns needed for Phase 2 goals | — |

### Indexes that need to be added:

| Index | SQL |
|-------|-----|
| Slug uniqueness | `CREATE UNIQUE INDEX IF NOT EXISTS idx_content_collection_slug ON content(collection_id, slug)` |
| Collection permissions lookup | `CREATE INDEX IF NOT EXISTS idx_ucp_user ON user_collection_permissions(user_id)` |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| Client-side API filtering | Server-side D1 WHERE clauses via QueryFilterBuilder | Fix CONT-01 — the builder exists, just needs bracket-syntax parser |
| One-way status (draft→published only) | Bidirectional state machine with VALID_TRANSITIONS map | Fix CONT-02 — add validation layer to existing PUT handler |
| Status-only audit trail | Field-level diff storage in workflow_history | Fix CONT-03 — add changed_fields column |
| Plaintext API tokens | SHA-256 hashed tokens with prefix display | Fix AUTH-02 — migrate api_tokens table |
| Global role-only RBAC | Collection-level permissions table | Fix AUTH-01 — new table + middleware |
| Manual scheduled content checking | Workers cron trigger calling SchedulerService | Fix CONT-05 — wiring only, service already complete |

---

## Open Questions

1. **Content versioning modal bug #666 — exact root cause unknown**
   - What we know: CONT-04 requires fixing the version history modal close behavior and ensuring rollback is stable
   - What's unclear: The exact bug without viewing the template and running the UI — need to read `version-history.template.ts` and the admin-content route handlers that render it
   - Recommendation: Planner should allocate time for investigation before implementing the fix. The template file is at `packages/core/src/templates/components/version-history.template.ts`

2. **`SchedulerService` export from core package**
   - What we know: `SchedulerService` is in `packages/core/src/plugins/core-plugins/workflow-plugin/services/scheduler.ts`
   - What's unclear: Whether `SchedulerService` is exported from the package's `index.ts` at the top level
   - Recommendation: Check `packages/core/src/index.ts` before planning the cron trigger task. May need to add an export.

3. **Existing API tokens with plaintext storage — migration strategy**
   - What we know: `api_tokens.token` currently stores plaintext. Any existing tokens can't be re-hashed without knowing the original value.
   - What's unclear: Whether there are live tokens that need to be preserved
   - Recommendation: Invalidate all existing tokens during migration (add a note for the admin). Fresh tokens use the new hashed format.

---

## Sources

### Primary (HIGH confidence)

- Direct file reads of `sonicjs-fork/packages/core/src/db/schema.ts` — table definitions
- Direct file reads of `sonicjs-fork/packages/core/src/db/migrations-bundle.ts` — migration SQL
- Direct file reads of `sonicjs-fork/packages/core/src/utils/query-filter.ts` — QueryFilterBuilder implementation
- Direct file reads of `sonicjs-fork/packages/core/src/middleware/auth.ts` — requireAuth/requireRole/AuthManager
- Direct file reads of `sonicjs-fork/packages/core/src/routes/api.ts` — GET /api/collections/:name/content
- Direct file reads of `sonicjs-fork/packages/core/src/routes/api-content-crud.ts` — CRUD handlers
- Direct file reads of `sonicjs-fork/packages/core/src/plugins/core-plugins/workflow-plugin/services/scheduler.ts` — SchedulerService
- Direct file reads of `sonicjs-fork/packages/core/src/plugins/core-plugins/workflow-plugin/services/workflow-service.ts` — WorkflowEngine
- Direct file reads of `sonicjs-fork/packages/core/src/plugins/core-plugins/workflow-plugin/migrations.ts` — Stage 7 migration

### Secondary (MEDIUM confidence)

- `https://developers.cloudflare.com/workers/configuration/cron-triggers/` — Workers cron trigger configuration and scheduled handler syntax (verified via WebFetch)

### Tertiary (LOW confidence)

- None — all critical findings verified from source code directly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — reading actual package.json and source files
- Architecture patterns: HIGH — reading actual route handlers, services, and schema files
- Pitfalls: HIGH — identified from direct schema conflict analysis (migration 001 vs Stage 7)
- Cron trigger syntax: MEDIUM — verified from official Cloudflare docs

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (30 days — stable platform, infrequent upstream changes)
