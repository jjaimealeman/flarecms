# Phase 11: Sandbox Foundation - Research

**Researched:** 2026-03-16
**Domain:** Cloudflare Workers / Hono / D1 / KV — demo sandbox, RBAC extension, mutation rate limiting, upload restrictions, signup capture
**Confidence:** HIGH (all findings based on direct codebase inspection)

## Summary

This phase adds a plugin (`demo-sandbox`) that gates public demo access with a sandboxed role. The codebase already ships all the primitives needed: collection-scoped RBAC (`rbac.ts` + `user_collection_permissions` table), KV-based rate limiting (`rate-limit.ts`), and a media upload validation schema (`api-media.ts`). The plugin pattern is well-established via `magic-link-auth`, `otp-login-plugin`, and others.

The key insight is that "demo role" is NOT a new global role in the `users.role` column. Instead it is implemented as a global role value of `'viewer'` (read-only to everything) combined with a `user_collection_permissions` record granting `'editor'` on the `demo-sandbox` collection. The JWT already carries `role` — adding a literal `'demo'` value requires no schema change if the middleware handles it, but the simpler path is using `viewer` + collection permission, which the existing RBAC code already supports.

The mutation counter (SAND-04, 50 per session) cannot use the existing `rateLimit()` middleware directly because that is IP-keyed per time window, not user-session-keyed per-lifetime. A KV counter keyed on `demo-mutations:{userId}` with a TTL matching the JWT session (24h) is the correct approach. The upload restriction (SAND-05) is a simple middleware wrapping `apiMediaRoutes` for demo users that enforces `image/*` + 2 MB before the existing upload path runs.

**Primary recommendation:** Build this as a standalone plugin in `packages/core/src/plugins/core-plugins/demo-sandbox/`. Register it in `app.ts` alongside the email and OTP plugins. Add one migration (038) bundled via `migrations-bundle.ts`.

## Standard Stack

### Core (already in repo — no new dependencies)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Hono | existing | Routes, middleware | Plugin uses `new Hono()` pattern from magic-link-auth |
| Drizzle / raw D1 | existing | SQL queries | Use raw `db.prepare()` as all other routes do |
| Cloudflare KV (`CACHE_KV`) | existing | Mutation counter per demo user | TTL = JWT expiry |
| Zod | existing | Input validation | Used throughout |
| `crypto.randomUUID()` | runtime | IDs | No external dep |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `AuthManager` (core) | existing | Token generation for new demo accounts | Same as OTP plugin |
| `checkCollectionPermission` (rbac.ts) | existing | Enforce sandbox-only writes | Already wired into api-content-crud.ts |
| `grantCollectionPermission` (rbac.ts) | existing | Assign `editor` on demo-sandbox at signup | Called during user creation |

### No New npm Packages Needed

**Installation:**
```bash
# No new packages. Everything is already in the monorepo.
```

## Architecture Patterns

### Plugin File Structure
```
packages/core/src/plugins/core-plugins/demo-sandbox/
├── index.ts              # createDemoSandboxPlugin() factory — Plugin interface
├── manifest.json         # Plugin metadata for admin UI
├── routes.ts             # Hono routes: signup, demo-status
├── middleware.ts         # Mutation counter + upload guard middleware
├── demo-service.ts       # Business logic: create demo user, seed sandbox content
└── migration.sql         # SQL for demo_signups table (referenced by migration 038)
```

### Migration Number
The last migration in `migrations-bundle.ts` is `id: '037'` (Audit Log). The next must be `038`. It must be:
1. Added as a `.sql` file in `packages/core/src/db/migrations/` (filename `038_demo_sandbox.sql`)
2. Added to `bundledMigrations` array in `migrations-bundle.ts`

### Pattern 1: Plugin Registration in app.ts
The email and OTP plugins are imported directly in `app.ts` and registered via `pluginManager.install()`. The demo sandbox plugin follows the same pattern:

```typescript
// Source: packages/core/src/app.ts (existing pattern)
import { createDemoSandboxPlugin } from './plugins/core-plugins/demo-sandbox'
// ...inside createFlareApp, near emailPlugin/otpLoginPlugin registration:
await pluginManager.install(createDemoSandboxPlugin(), { enabled: true })
```

### Pattern 2: Demo Role Implementation

**Decision: use `role = 'viewer'` on the user row + `editor` collection permission on `demo-sandbox`.**

Why: The existing `checkCollectionPermission` in `rbac.ts` already handles this:
- `globalRole === 'admin'` — bypasses all checks (not demo)
- `globalRole` is anything else — checks `user_collection_permissions`
- No `user_collection_permissions` row → no access (viewer can only read)
- Row with `role = 'editor'` on `demo-sandbox` → full CRUD on that collection

This means demo users automatically get read-only on all other collections (viewer default) and full CRUD on demo-sandbox (editor permission). Zero changes to RBAC middleware needed.

```typescript
// Source: packages/core/src/services/rbac.ts (existing)
// At demo user creation time:
await grantCollectionPermission(db, {
  userId: demoUserId,
  collectionId: demoSandboxCollectionId,
  role: 'editor',
  grantedBy: 'system'
})
```

**The JWT `role` field should be `'viewer'`** so existing `requireRole('admin')` and `requireRole('editor')` guards automatically block demo users from admin-only pages.

### Pattern 3: Mutation Counter Using KV

The existing `rateLimit()` in `rate-limit.ts` uses IP + time window. The demo needs a *per-user lifetime counter* (not a sliding window reset). Use KV directly:

```typescript
// Source: pattern derived from packages/core/src/middleware/rate-limit.ts
const MUTATION_LIMIT = 50

async function checkAndIncrementMutationCount(
  kv: KVNamespace,
  userId: string,
  sessionTtlSeconds: number
): Promise<{ allowed: boolean; count: number }> {
  const key = `demo-mutations:${userId}`
  const raw = await kv.get(key)
  const count = raw ? parseInt(raw, 10) : 0

  if (count >= MUTATION_LIMIT) {
    return { allowed: false, count }
  }

  await kv.put(key, String(count + 1), { expirationTtl: sessionTtlSeconds })
  return { allowed: true, count: count + 1 }
}
```

**TTL strategy:** Set KV expiry to `86400` seconds (24h, matching the JWT expiry in `AuthManager.generateToken`). When the JWT expires the demo session is over anyway; this avoids a separate cleanup job.

### Pattern 4: Upload Restriction Middleware for Demo Users

Rather than modifying `api-media.ts`, add a middleware in the demo sandbox plugin that intercepts `POST /api/media/upload` when user role is `viewer` (demo):

```typescript
// Applied only when user is a viewer uploading files
export const demoUploadGuard = () => async (c: Context, next: Next) => {
  const user = c.get('user')
  if (!user || user.role !== 'viewer') return next()

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return next()

  if (!file.type.startsWith('image/')) {
    return c.json({ error: 'Demo accounts can only upload images.' }, 400)
  }
  if (file.size > 2 * 1024 * 1024) {
    return c.json({ error: 'Demo image uploads are limited to 2 MB.' }, 400)
  }

  // Re-attach formData for downstream handler (Hono caveat — body consumed once)
  // Solution: store validated file in context, not re-read formData
  return next()
}
```

**Hono body consumption caveat (HIGH confidence):** In Hono, `c.req.formData()` consumes the body. The middleware cannot call it and then let the route handler call it again. Two approaches:
1. Store the parsed formData on `c.set('parsedFormData', formData)` and modify the upload route to check for it.
2. Apply the guard check at the route level before parsing, using `Content-Length` header + `Content-Type` header inspection (doesn't require parsing body).

**Recommended approach:** Option 2 — check `Content-Type: image/*` via the `Content-Type` header of the multipart field is not directly available before parsing. Instead, use approach 1 and set a context variable. Modify `api-media.ts` to check `c.get('demoFile')` if available, or fall through to normal parsing. This is a minor, targeted change to one route.

Alternative: apply the upload guard as a named route on the demo plugin that shadows `/api/media/upload` for demo users — but Hono route precedence makes this fragile. **Stick with context variable approach.**

### Pattern 5: demo_signups Table and Capture

```sql
-- Migration 038 (partial)
CREATE TABLE IF NOT EXISTS demo_signups (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  user_id TEXT REFERENCES users(id),
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_demo_signups_email ON demo_signups(email);
CREATE INDEX IF NOT EXISTS idx_demo_signups_created_at ON demo_signups(created_at DESC);
```

Capture at the moment a demo account is created (inside `demo-service.ts` `createDemoUser()`).

### Pattern 6: demo-sandbox Collection

The collection is created as a **code-based collection** via the plugin's `activate()` or `install()` lifecycle hook — exactly like how the OTP plugin creates its `otp_codes` table via migration. The collection definition uses the existing `CollectionConfig` format:

```typescript
// Source: CLAUDE.md collection schema format
const DEMO_SANDBOX_COLLECTION = {
  id: 'demo-sandbox-collection',
  name: 'demo-sandbox',
  displayName: 'Sandbox',
  description: 'Your personal sandbox — create, edit, and delete freely',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', title: 'Title', required: true },
      content: { type: 'string', title: 'Content', format: 'richtext' },
      status: {
        type: 'string',
        title: 'Status',
        enum: ['draft', 'published'],
        default: 'draft'
      }
    },
    required: ['title']
  }
}
```

The collection row is inserted via the migration SQL (idempotent `INSERT OR IGNORE`). Sample rows (3-5 seed items) are also inserted in the migration so every fresh install has pre-populated content.

### Anti-Patterns to Avoid
- **Adding `'demo'` as a global role value in the `users` table**: This would require changes to every `requireRole()` call in the admin routes. Use `viewer` + collection permission instead.
- **Storing mutation count in D1**: Too slow for per-request counters, and introduces write contention. KV is correct.
- **Calling `c.req.formData()` in middleware AND route handler**: Body is consumed once. Use context variable pattern.
- **Creating demo-sandbox collection outside of a migration**: Must be in migration 038 with `INSERT OR IGNORE` so it survives future migrations and re-deploys.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collection-level permissions | Custom permission table | `user_collection_permissions` + `checkCollectionPermission()` (rbac.ts) | Already wired into all content CRUD routes |
| Rate limit check | Custom KV loop | KV `get`/`put` with TTL (see Pattern 3) | The existing `rateLimit()` is IP+window, not user+lifetime — direct KV is 5 lines |
| Token generation | Custom JWT | `AuthManager.generateToken()` + `AuthManager.setAuthCookie()` | Already handles JWT secret, cookie flags, expiry |
| Plugin DB migration | Ad-hoc SQL | `bundledMigrations` array in `migrations-bundle.ts` | This is THE migration system — all plugins use it |
| Email sending | Direct Resend API call | `emailPlugin` (already in app.ts) | Resend API key is plugin-managed; tested in prod |

**Key insight:** The entire permission model already supports exactly what demo needs. The `viewer` global role with a targeted `editor` collection permission is a first-class use case, not a hack.

## Common Pitfalls

### Pitfall 1: Demo User Can Access `/admin` Settings and Users Pages
**What goes wrong:** A `viewer`-role user can navigate to `/admin/settings` or `/admin/users` in the HTML admin — these pages check `requireRole(['admin'])` for writes but may not block reads.
**Why it happens:** The demo user has a valid auth cookie and can visit any `/admin/*` URL.
**How to avoid:** Add an explicit check in the mutation counter middleware: if `user.role === 'viewer'`, check whether the request path is within `/admin/settings`, `/admin/users`, `/admin/plugins` etc. and return 403. Or rely on the existing `requireRole('admin')` guards — verify they are present on those routes.
**Warning signs:** Demo user can submit the settings form or invite users.

### Pitfall 2: KV Expiry Race on High-Frequency Mutations
**What goes wrong:** Two simultaneous mutations from the same demo user both read `count = 49`, both check `49 < 50`, both write `50`. Effective limit becomes 51+.
**Why it happens:** KV `get`+`put` is not atomic in Cloudflare Workers.
**How to avoid:** For a 50-mutation demo limit this is acceptable — off-by-one doesn't matter. If strict enforcement is needed, use `cf-workers-atomic-counter` pattern or accept the small race. **Accept the race for v2.1.**
**Warning signs:** Only matters if limit is security-critical (it isn't — demo abuse is handled by account TTL).

### Pitfall 3: Mutation Middleware Runs on GET Requests
**What goes wrong:** `GET /api/content` counts toward the mutation limit.
**Why it happens:** Middleware applied at `*` catches all methods.
**How to avoid:** In the mutation counter middleware, check `c.req.method` — only count `POST`, `PUT`, `PATCH`, `DELETE`.

### Pitfall 4: Demo Signup Allows Spam
**What goes wrong:** The same email signs up 1000 times, creating 1000 demo accounts.
**Why it happens:** No check for existing demo user with same email.
**How to avoid:** Before creating a demo user, check `SELECT id FROM users WHERE email = ?`. If exists and role is `viewer`, either reuse the account (reset KV counter) or return 409. Do not create duplicates.

### Pitfall 5: demo-sandbox Collection Appears in Read-Only Mode for Demo Users
**What goes wrong:** The admin UI shows the collection as read-only because the user's `globalRole` is `viewer`.
**Why it happens:** The admin UI templates may check `user.role === 'admin'` or `user.role === 'editor'` to show/hide edit buttons, without consulting `user_collection_permissions`.
**How to avoid:** The API layer already handles this correctly via RBAC. The UI layer (Catalyst templates) may show read-only UI for viewers. The planner needs to investigate which admin HTML templates control the edit/create/delete button visibility and add a special case for demo-sandbox collection.
**Warning signs:** Demo user can write via API (`POST /api/content`) but sees no "New Content" button in the admin UI.

### Pitfall 6: migrations-bundle.ts Must Be Regenerated
**What goes wrong:** A new `.sql` file is added to `packages/core/src/db/migrations/` but not added to `migrations-bundle.ts`, so the migration never runs on Cloudflare Workers (no filesystem at runtime).
**Why it happens:** The bundle is generated by `scripts/generate-migrations.ts` but this script is not always run automatically.
**How to avoid:** Manually add the migration object to `bundledMigrations` in `migrations-bundle.ts` as part of the plan. There is already a precedent: the last migration `037` shows the exact format to copy.

## Code Examples

### Create Demo User (demo-service.ts pattern)
```typescript
// Source: Derived from packages/core/src/plugins/available/magic-link-auth/index.ts
export async function createDemoUser(
  db: D1Database,
  kv: KVNamespace,
  email: string,
  ipAddress: string,
  jwtSecret: string | undefined
): Promise<{ token: string; isNew: boolean }> {
  const normalizedEmail = email.toLowerCase()

  // Check for existing demo user
  const existing = await db.prepare(
    'SELECT id, role FROM users WHERE email = ?'
  ).bind(normalizedEmail).first<{ id: string; role: string }>()

  if (existing) {
    // Reset mutation counter for returning demo user
    await kv.put(`demo-mutations:${existing.id}`, '0', { expirationTtl: 86400 })
    const token = await AuthManager.generateToken(existing.id, normalizedEmail, 'viewer', jwtSecret)
    return { token, isNew: false }
  }

  // Create new demo user
  const userId = crypto.randomUUID()
  const now = Date.now()
  const username = `demo-${userId.substring(0, 8)}`

  await db.prepare(`
    INSERT INTO users (id, email, username, first_name, last_name, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, 'Demo', 'User', 'viewer', 1, ?, ?)
  `).bind(userId, normalizedEmail, username, now, now).run()

  // Grant editor on demo-sandbox
  await grantCollectionPermission(db, {
    userId,
    collectionId: 'demo-sandbox-collection',
    role: 'editor',
    grantedBy: 'system'
  })

  // Record signup
  await db.prepare(`
    INSERT INTO demo_signups (id, email, user_id, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(crypto.randomUUID(), normalizedEmail, userId, ipAddress, now).run()

  const token = await AuthManager.generateToken(userId, normalizedEmail, 'viewer', jwtSecret)
  return { token, isNew: true }
}
```

### Migration 038 SQL (demo_sandbox migration)
```sql
-- Migration 038: Demo Sandbox
-- Creates demo_signups table and seeds the demo-sandbox collection.

CREATE TABLE IF NOT EXISTS demo_signups (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_demo_signups_email ON demo_signups(email);
CREATE INDEX IF NOT EXISTS idx_demo_signups_created_at ON demo_signups(created_at DESC);

-- Register demo-sandbox plugin
INSERT OR IGNORE INTO plugins (
  id, name, display_name, description, version, author, category, icon,
  status, is_core, permissions, installed_at, last_updated
) VALUES (
  'demo-sandbox',
  'demo-sandbox',
  'Demo Sandbox',
  'Public demo sandbox — one-collection playground for demo visitors',
  '1.0.0',
  'Flare CMS Team',
  'demo',
  '🏖️',
  'active',
  TRUE,
  '[]',
  unixepoch(),
  unixepoch()
);

-- Create demo-sandbox collection
INSERT OR IGNORE INTO collections (
  id, name, display_name, description, schema, is_active, managed, created_at, updated_at
) VALUES (
  'demo-sandbox-collection',
  'demo-sandbox',
  'Sandbox',
  'Your personal sandbox — create, edit, and delete content freely',
  '{"type":"object","properties":{"title":{"type":"string","title":"Title","required":true},"content":{"type":"string","title":"Content","format":"richtext"},"status":{"type":"string","title":"Status","enum":["draft","published"],"default":"draft"}},"required":["title"]}',
  1,
  1,
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
);
```

### Mutation Counter Middleware
```typescript
// Source: packages/core/src/middleware/rate-limit.ts (adapted)
export const demoMutationGuard = () => async (c: Context, next: Next) => {
  const user = c.get('user')
  if (!user || user.role !== 'viewer') return next()

  // Only count write operations
  const method = c.req.method
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next()

  const kv = (c.env as any)?.CACHE_KV
  if (!kv) return next() // Graceful degrade if no KV

  const key = `demo-mutations:${user.userId}`
  const raw = await kv.get(key)
  const count = raw ? parseInt(raw, 10) : 0

  if (count >= 50) {
    return c.json({
      error: 'You have reached the demo limit of 50 changes. Start a new demo session to continue.'
    }, 429)
  }

  await kv.put(key, String(count + 1), { expirationTtl: 86400 })
  c.header('X-Demo-Mutations-Remaining', String(49 - count))
  return next()
}
```

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|-----------------|-------|
| Global role `demo` | `viewer` role + collection permission | No schema change, uses existing RBAC |
| Custom permission table | `user_collection_permissions` (migration 034) | Already shipped in v2.0 |
| In-memory rate limiting | KV-based counters | Required for Workers (stateless per-request) |

## Open Questions

1. **Admin UI button visibility for demo users**
   - What we know: API layer correctly enforces RBAC. The `checkCollectionPermission` call in `api-content-crud.ts` will allow writes to demo-sandbox.
   - What's unclear: The admin HTML templates (Catalyst layout) check `user.role` for showing create/edit buttons. It is unknown whether they check collection permissions or only global role.
   - Recommendation: Plan 11-01 must include a task to inspect the admin content list template and add a demo-sandbox-specific check, or expose a `canWrite` flag derived from collection permissions.

2. **Demo user cleanup / TTL on demo accounts**
   - What we know: JWT expires in 24h. KV counter expires in 24h.
   - What's unclear: User rows accumulate in D1 indefinitely. No cleanup job exists.
   - Recommendation: Out of scope for Phase 11. Add a note to the deferred list. For now, demo users stay in the DB as inactive after JWT expiry.

3. **OTP vs magic-link for demo signup**
   - What we know: OTP login plugin is wired and email (Resend) is working in prod. Magic link plugin is `inactive`.
   - What's unclear: The phase goal says "minimal gate, get into admin fast." OTP requires email round-trip. Magic link also requires email. An even simpler gate could be email-only (create account + send link in one step).
   - Recommendation: OTP is the established working path. Use it. The planner should note that demo signup calls `POST /auth/otp/request` → user enters 6-digit code → `POST /auth/otp/verify` → redirect to `/admin`. No new auth flow needed.

## Sources

### Primary (HIGH confidence)
- Direct inspection: `packages/core/src/services/rbac.ts` — `checkCollectionPermission`, `grantCollectionPermission`, `user_collection_permissions` table
- Direct inspection: `packages/core/src/middleware/rate-limit.ts` — KV-based sliding window rate limiter
- Direct inspection: `packages/core/src/middleware/auth.ts` — `AuthManager`, JWT claims, `requireRole`
- Direct inspection: `packages/core/src/routes/api-content-crud.ts` — how RBAC is invoked on create/edit/delete
- Direct inspection: `packages/core/src/routes/api-media.ts` — file validation schema, upload flow, body consumption
- Direct inspection: `packages/core/src/db/migrations-bundle.ts` — migration format, last ID is `037`
- Direct inspection: `packages/core/src/plugins/core-plugins/otp-login-plugin/index.ts` — plugin factory pattern
- Direct inspection: `packages/core/src/plugins/available/magic-link-auth/index.ts` — user creation pattern in plugins
- Direct inspection: `packages/core/src/app.ts` — how plugins are registered, `Bindings` type

### Secondary (MEDIUM confidence)
- Inferred from Hono documentation (training data): `c.req.formData()` consumes the body once — standard Web API behavior, applies to Hono

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in repo, versions confirmed by inspection
- Architecture patterns: HIGH — patterns derived directly from working plugin code
- Migration format: HIGH — copied from inspected migrations-bundle.ts
- RBAC integration: HIGH — rbac.ts fully read and understood
- Upload body consumption: MEDIUM — standard Web API behavior, Hono-specific behavior inferred
- Admin UI button visibility: LOW — not inspected; templates not read

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable codebase, no fast-moving external deps)
