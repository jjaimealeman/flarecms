# Architecture Research

**Domain:** Edge-native headless CMS on Cloudflare Workers
**Researched:** 2026-03-01
**Confidence:** HIGH (verified against actual source code + official Cloudflare docs)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE EDGE NETWORK                        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │               MIDDLEWARE STACK (Hono)                     │    │
│  │                                                           │    │
│  │  1. Metrics  2. Bootstrap  3. Security  4. CORS           │    │
│  │  5. Rate Limit  6. [beforeAuth]  7. Auth  8. [afterAuth]  │    │
│  └─────────────────────────┬─────────────────────────────────┘   │
│                            │                                      │
│  ┌──────────┬──────────────┼──────────────┬────────────────┐     │
│  │          │              │              │                │     │
│  │  /api/*  │  /admin/*    │  /auth/*     │  /files/*      │     │
│  │  (Public │  (HTMX UI   │  (JWT login  │  (R2 media     │     │
│  │   REST)  │   + Admin    │   + OTP)     │   serve)       │     │
│  │          │   API)       │              │                │     │
│  └────┬─────┴──────┬───────┴──────┬───────┴───────┬────────┘     │
│       │            │              │               │               │
│  ┌────▼────────────▼──────────────▼───────────────▼────────┐     │
│  │                    SERVICE LAYER                          │    │
│  │                                                           │    │
│  │  ContentService   MediaService   AuthService              │    │
│  │  CacheService     PluginManager  MigrationService         │    │
│  └─────┬────────────────┬────────────────┬───────────────────┘   │
│        │                │                │                       │
│  ┌─────▼──────┐  ┌──────▼──────┐  ┌─────▼──────────────────┐   │
│  │ D1 SQLite  │  │  R2 Bucket  │  │    Three-Tier Cache      │   │
│  │ (via       │  │  (media     │  │                          │   │
│  │  Drizzle)  │  │   files)    │  │  Memory → KV → Database  │   │
│  └────────────┘  └─────────────┘  └──────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │               PLUGIN HOOK SYSTEM                          │    │
│  │                                                           │    │
│  │  HookSystemImpl  →  Priority Queue  →  ScopedHookSystem   │    │
│  │  22 named hooks  →  content:*, media:*, auth:*, app:*     │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Current State | Communicates With |
|-----------|----------------|---------------|-------------------|
| Hono App | Route dispatch, middleware chain | Working | All layers |
| Middleware Stack | Security, auth, rate limiting | Partially wired | Routes |
| Bootstrap Middleware | Migrations, collection sync, plugin init | Working (once per instance) | DB, PluginManager |
| Auth Middleware | JWT verify via cookie/header, KV caching | Working | KV, Hono context |
| Metrics Middleware | Request counting for analytics | Working | In-memory only |
| API Routes (`/api/*`) | Public REST endpoints for content/media | Partial (filters broken) | Services, Cache |
| Admin Routes (`/admin/*`) | HTMX-driven admin UI | Working | Services, DB |
| Plugin System | Hook-based extensibility, route injection | Architecture solid, wiring gaps | All services |
| Cache Plugin | Three-tier memory/KV/DB cache | Architecture solid, KV not wired | KV binding, DB |
| Media Pipeline | R2 upload, metadata to D1, public serve | Upload works; R2 binding gap in instance | R2, D1 |
| HookSystem | Priority-ordered event dispatch | Working | Plugins, Services |

---

## Middleware Stack: Current vs Target

### Current Order (what exists in `app.ts`)

```
1. appVersion setter
2. metricsMiddleware()         ← tracks all requests
3. bootstrapMiddleware()       ← migrations + plugin init (once per instance)
4. config.middleware.beforeAuth[]   ← user extension point (empty placeholder)
5. logging (no-op placeholder)
6. security (no-op placeholder)    ← ⚠ NOTHING ACTUALLY SET
7. config.middleware.afterAuth[]   ← user extension point (empty placeholder)
8. route handlers
```

### Target Order (production-grade)

```
1. appVersion setter           ← existing
2. metricsMiddleware()         ← existing
3. bootstrapMiddleware()       ← existing (once per instance guard)
4. securityHeadersMiddleware() ← NEW: CSP, HSTS, X-Frame, COEP
5. corsMiddleware()            ← NEW: built-in Hono cors()
6. rateLimitMiddleware()       ← NEW: Cloudflare Rate Limiting binding
7. config.middleware.beforeAuth[]
8. authMiddleware()            ← existing requireAuth() on protected routes
9. config.middleware.afterAuth[]
10. route handlers
```

**Why this order matters:**
- Security headers must fire before auth checks (defense in depth)
- CORS preflight (OPTIONS) must resolve before hitting auth (avoids CORS errors on 401)
- Rate limiting before auth prevents DoS on the auth verification path itself
- Bootstrap before everything else because plugins may register middleware

---

## Middleware Stack: Detailed Specification

### Security Headers Middleware

**What to set** (verified: [Cloudflare security headers docs](https://developers.cloudflare.com/workers/examples/security-headers/)):

```typescript
// Headers to ADD
'X-Content-Type-Options': 'nosniff'
'X-Frame-Options': 'DENY'
'X-XSS-Protection': '0'           // Disable broken XSS auditor
'Referrer-Policy': 'strict-origin-when-cross-origin'
'Cross-Origin-Opener-Policy': 'same-site'
'Cross-Origin-Embedder-Policy': 'require-corp'
'Cross-Origin-Resource-Policy': 'same-site'
'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'

// Headers to REMOVE (information leakage)
'X-Powered-By'          // reveals runtime
'X-AspNet-Version'      // reveals framework

// CSP (HTMX-aware — must allow unsafe-inline for HTMX attrs)
'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://pub-*.r2.dev"
```

**HTMX constraint:** HTMX attributes are inline; strict CSP requires `'unsafe-inline'` for scripts. This is a known HTMX limitation. Nonce-based CSP is the alternative but complex.

**Media URLs constraint:** Public R2 URLs (`pub-{name}.r2.dev`) must be in `img-src`.

### CORS Middleware

Use Hono's built-in `cors()` — do NOT write custom CORS logic.

```typescript
import { cors } from 'hono/cors'

// Different policy for API vs Admin
app.use('/api/*', cors({
  origin: (origin) => origin, // or restrict to known frontends
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-Cache-Status', 'X-Response-Time'],
  maxAge: 86400,
  credentials: false,  // API is stateless JWT
}))

app.use('/admin/*', cors({
  origin: ['http://localhost:8787', 'https://your-domain.workers.dev'],
  credentials: true,   // Admin uses cookies
}))
```

### Rate Limiting Middleware

Use Cloudflare's native Rate Limiting binding (declared in `wrangler.toml`), not application-level rate limiting. Native rate limiting has zero latency overhead — it reads from locally-cached counters, not network calls.

```toml
# wrangler.toml
[[unsafe.bindings]]
type = "ratelimit"
name = "RATE_LIMITER"
namespace_id = "1001"
simple = { limit = 100, period = 60 }
```

**Key design decision:** Rate limit by user ID for authenticated requests, by IP prefix for anonymous. Do NOT use raw IP as key — Cloudflare docs note IPs may be shared by many valid users.

**Important caveat:** Cloudflare native rate limits are per-edge-location with eventual consistency. They are intentionally "permissive" — not designed for exact accounting. Perfect for DDoS protection, not for billing-critical limits.

---

## Content Lifecycle State Machine

### Current State (from schema.ts + CLAUDE.md)

The `content` table already has multiple state-tracking columns:

```sql
status          TEXT  -- 'draft', 'published', 'archived'
review_status   TEXT  -- 'none', 'pending', 'approved', 'rejected'
workflow_state_id TEXT -- FK (nullable)
published_at    INT
scheduled_publish_at INT
scheduled_unpublish_at INT
embargo_until   INT
expires_at      INT
```

The `workflow_history` table tracks transitions:
```
workflow_history(id, content_id, action, from_status, to_status, user_id, comment, created_at)
```

### Current Bug: Status is One-Way

Confirmed in SONICJS-ISSUES.md: published content cannot be unpublished. This is a missing state transition, not an architectural flaw.

### Target State Machine

```
                    DRAFT
                   /     \
            save()         submit-for-review()
              |                    |
           DRAFT             REVIEW-PENDING
              |              /         \
         auto-save()    approve()    reject()
              |              |           |
           DRAFT         SCHEDULED    DRAFT (with notes)
                            |
                        publish()
                            |
                        PUBLISHED ──── unpublish() ──── DRAFT
                            |
                        archive()
                            |
                        ARCHIVED ──── restore() ──── DRAFT
```

**Valid transitions (what to enforce):**

| From | To | Who |
|------|----|-----|
| draft | draft (autosave) | author |
| draft | review-pending | author |
| draft | published | editor, admin |
| draft | scheduled | editor, admin |
| review-pending | approved (→ published/scheduled) | reviewer, admin |
| review-pending | rejected (→ draft) | reviewer, admin |
| published | archived | editor, admin |
| published | draft (unpublish) | editor, admin |
| archived | draft (restore) | admin |
| scheduled | published | system (cron) |
| scheduled | draft (cancel) | editor, admin |

**Hook integration points for state transitions:**

```
content:before-publish  → validate, SEO check, notify
content:after-publish   → invalidate cache, webhook, search index
content:before-archive  → check references
content:before-delete   → cascade children (content_versions, workflow_history)
```

### Workflow State Machine: Build as Pure Function

The state machine logic should be a pure function (no side effects) with transitions as data:

```typescript
// Pure transition validator — no DB calls
function canTransition(
  currentStatus: ContentStatus,
  targetStatus: ContentStatus,
  userRole: UserRole
): { allowed: boolean; reason?: string } {
  const transitions = ALLOWED_TRANSITIONS[currentStatus]
  if (!transitions) return { allowed: false, reason: 'Unknown current status' }
  const transition = transitions.find(t => t.to === targetStatus)
  if (!transition) return { allowed: false, reason: `Cannot transition from ${currentStatus} to ${targetStatus}` }
  if (!transition.roles.includes(userRole)) return { allowed: false, reason: 'Insufficient permissions' }
  return { allowed: true }
}
```

Side effects (cache invalidation, event firing) happen in the route handler after DB write.

---

## Media Pipeline

### Current Implementation (verified from `api-media.ts`)

```
Client → POST /api/media/upload
  → requireAuth() middleware
  → validate file type + size (Zod schema)
  → generate UUID-based filename
  → upload ArrayBuffer to R2 (c.env.MEDIA_BUCKET.put)
  → extract image dimensions (manual JPEG/PNG header parsing)
  → INSERT record into media table (D1)
  → return { id, publicUrl, r2Key, ... }

Client → GET /files/{r2-key}
  → no auth required
  → c.env.MEDIA_BUCKET.get(objectKey)
  → stream response with 1-year Cache-Control
```

### Current Gap: R2 Binding Name Mismatch

The app code uses `c.env.MEDIA_BUCKET` but `wrangler.toml` in `my-astro-cms` binds as `BUCKET`. This causes the R2 operations to silently fail. This is the "R2 binding currently broken" issue from the project context.

**Fix:** Either rename the binding in `wrangler.toml` to `MEDIA_BUCKET`, or update the core to accept a configurable binding name.

### Target Media Pipeline

```
UPLOAD FLOW:
Client → POST /api/media/upload
  → Auth gate (requireAuth)
  → File validation (type, size, malware sig check)
  → Generate ID + R2 key: {folder}/{uuid}.{ext}
  → Stream upload to R2 (avoid buffering full file in memory)    ← use TransformStream
  → Extract metadata (dimensions, content hash)                   ← header parsing, not library
  → Fire MEDIA_UPLOAD hook (plugins can transform, watermark)
  → Write media record to D1
  → Invalidate media cache
  → Return { id, publicUrl, thumbnailUrl? }

SERVE FLOW:
Client → GET /files/{key}
  → Check Cache API first (local edge cache)                     ← NEW
  → Fetch from R2 if not cached
  → Put response in Cache API with Cache-Control
  → Stream to client (never buffer)

IMAGE TRANSFORM FLOW (optional, future):
Client → GET /files/{key}?w=800&h=600&fit=cover
  → Use Cloudflare Images binding (c.env.IMAGES)                ← conditional on binding
  → Transform on-the-fly with Images API
  → Cache transformed result in Cache API
```

### Cache API for Media Serving

Use **Cache API** (not KV) for media files:
- Media files are binary, large; KV is better for small JSON values
- Cache API is free (KV has per-read costs)
- Media rarely changes after upload; Cache API's local-only scope is fine
- Use `Cache-Control: public, max-age=31536000, immutable` (files are content-addressed by UUID)

### Presigned URL Pattern (for large uploads)

For files > 10MB, proxy through Workers is wasteful (128MB memory limit). Use presigned URLs:

```typescript
// Worker generates presigned URL
// Client uploads directly to R2 (bypasses Worker memory)
// Worker receives notification, creates DB record
```

Requires `aws4fetch` library (not AWS SDK — not Worker-compatible).

---

## Caching Strategy

### Three-Tier Architecture (already designed in cache plugin)

```
Request for content
    ↓
[Tier 1] In-Memory Cache (Map, per-instance, ~100ms TTL for hot data)
    ↓ MISS
[Tier 2] KV Cache (global, eventually consistent, 5min-2hr TTL)
    ↓ MISS
[Tier 3] D1 Database (source of truth, always consistent)
    ↓
Write back to KV + Memory
```

### When to Use Each Cache Layer

| Layer | What to cache | TTL | Notes |
|-------|--------------|-----|-------|
| Memory (Map) | Auth token payloads, hot content, collection schemas | 60-300s | Lost on worker restart/scale |
| KV | API list responses, rendered content, user sessions | 5min-2hr | Global, ~60s propagation lag |
| Cache API | Binary media files, static assets, HTML fragments | 1 year (immutable) | Local edge only, free |
| D1 | Everything (source of truth) | N/A | Always consistent |

### Cache Invalidation Strategy

The cache plugin already implements event-based invalidation via an internal event bus. The gap is wiring it to actual content mutations.

**Pattern: Write-through invalidation**

```
Content updated in D1
  → emitEvent('content.update', { id, collectionId })
  → cache-invalidation.ts listeners fire
  → delete specific item key
  → invalidate list pattern: 'content:list:*'
  → invalidate api pattern: 'api:*'
  → KV.delete() for KV-backed keys            ← needs KV binding wired
```

**KV invalidation gap:** KV global propagation takes up to 60 seconds. For admin workflows where an editor publishes content and immediately checks the frontend, they may see stale content. This is expected behavior — document it, don't fight it.

### Cache Key Design

Follow the existing pattern from `cache-config.ts`:

```
Format: {namespace}:{type}:{identifier}:{version}
Examples:
  content:item:abc123:v1
  content:list:blog-posts:v1
  api:collection:blog-posts:v1
  media:item:xyz789:v1
  auth:{token-prefix-20chars}    ← already implemented in auth.ts
```

Version in the key enables cache busting without invalidation: bump `version` in config to instantly invalidate all old keys.

### What NOT to Cache

- Content in `draft` or `review-pending` status (unpublished content must never reach CDN)
- Auth tokens themselves (only verified payloads)
- Mutation responses (POST/PUT/DELETE)
- Admin routes (always serve fresh from DB)

---

## Plugin Hook Integration Points

### Current Hook Registry (from `types.ts` HOOKS constant)

```typescript
// Application lifecycle
APP_INIT, APP_READY, APP_SHUTDOWN

// Request lifecycle
REQUEST_START, REQUEST_END, REQUEST_ERROR

// Authentication
AUTH_LOGIN, AUTH_LOGOUT, AUTH_REGISTER, USER_LOGIN, USER_LOGOUT

// Content lifecycle
CONTENT_CREATE, CONTENT_UPDATE, CONTENT_DELETE, CONTENT_PUBLISH, CONTENT_SAVE

// Media lifecycle
MEDIA_UPLOAD, MEDIA_DELETE, MEDIA_TRANSFORM

// Plugin lifecycle
PLUGIN_INSTALL, PLUGIN_UNINSTALL, PLUGIN_ACTIVATE, PLUGIN_DEACTIVATE

// Admin interface
ADMIN_MENU_RENDER, ADMIN_PAGE_RENDER

// Database
DB_MIGRATE, DB_SEED
```

### Missing Hooks for Production (gaps to fill)

```typescript
// Content workflow (not yet in HOOKS)
CONTENT_BEFORE_PUBLISH = 'content:before-publish'
CONTENT_AFTER_PUBLISH = 'content:after-publish'
CONTENT_SUBMIT_REVIEW = 'content:submit-review'
CONTENT_APPROVE = 'content:approve'
CONTENT_REJECT = 'content:reject'
CONTENT_UNPUBLISH = 'content:unpublish'
CONTENT_SCHEDULE = 'content:schedule'

// Media pipeline
MEDIA_BEFORE_UPLOAD = 'media:before-upload'    // validate, virus scan
MEDIA_AFTER_UPLOAD = 'media:after-upload'      // thumbnails, CDN notify
MEDIA_SERVE = 'media:serve'                    // access logging

// Cache
CACHE_HIT = 'cache:hit'
CACHE_MISS = 'cache:miss'
CACHE_INVALIDATE = 'cache:invalidate'
```

### Hook Execution Pattern in Routes

The gap between hook definitions and route code: routes call `emitEvent()` (a simplified logger), not the actual `HookSystemImpl`. The wiring between content mutations and the hook system needs to be completed.

**Current (route code):**
```typescript
// In api-media.ts
await emitEvent('media.upload', { id, filename })  // just console.log
```

**Target:**
```typescript
// In route handlers
const hookSystem = getHookSystem()  // singleton
await hookSystem.execute(HOOKS.MEDIA_UPLOAD, { id, filename }, { user, env: c.env })
```

### Plugin Middleware Registration Gap

Plugins can declare `middleware` in their definition, but `app.ts` does not iterate plugin middleware during route setup. Only plugin routes are registered. Plugin middleware must be explicitly registered by the plugin in its `activate()` lifecycle hook.

**Recommended pattern:**
```typescript
// In plugin activate()
async activate(context: PluginContext) {
  // Plugins register middleware through the app reference
  // NOT available in current PluginContext — needs to be added
  context.app.use('/api/*', this.rateLimitMiddleware)
}
```

This requires `app` reference in `PluginContext`, which does not currently exist.

---

## Recommended Project Structure

### sonicjs-fork (engine)

```
packages/core/src/
├── app.ts                    # Factory: createSonicJSApp()
├── middleware/
│   ├── bootstrap.ts          # Migrations + plugin init (existing)
│   ├── auth.ts               # JWT verify + KV cache (existing)
│   ├── metrics.ts            # Request counting (existing)
│   ├── security-headers.ts   # NEW: CSP, HSTS, X-Frame, etc.
│   ├── cors.ts               # NEW: Hono cors() wrapper
│   └── rate-limit.ts         # NEW: CF native rate limiting binding
├── plugins/
│   ├── hook-system.ts        # Priority-ordered event dispatch (existing)
│   ├── plugin-manager.ts     # Plugin lifecycle (existing)
│   ├── cache/                # Three-tier cache (existing, wire KV)
│   └── core-plugins/         # Email, OTP, AI Search (existing)
├── services/
│   ├── content-workflow.ts   # NEW: State machine transitions
│   ├── cache.ts              # Cache service (existing)
│   ├── migrations.ts         # DB migration runner (existing)
│   └── media.ts              # NEW: Extract media logic from route
├── routes/
│   ├── api.ts                # Content CRUD REST
│   ├── api-media.ts          # Media upload/serve
│   ├── auth.ts               # JWT + OTP login
│   └── admin-*.ts            # HTMX admin UI routes
└── types/
    └── index.ts              # Shared types + HOOKS constant
```

### my-astro-cms (instance)

```
src/
├── index.ts                  # createSonicJSApp() + registerCollections()
├── collections/
│   ├── blog-posts.collection.ts
│   ├── news.collection.ts
│   └── pages.collection.ts
├── plugins/                  # Custom plugins (autoLoad: false currently)
└── wrangler.toml             # Bindings: DB, MEDIA_BUCKET, CACHE_KV, RATE_LIMITER
```

---

## Architectural Patterns

### Pattern 1: Layered Cache with Write-Through Invalidation

**What:** Cache reads cascade through memory → KV → DB. Writes always go to DB, then invalidate relevant cache keys via events.

**When to use:** All read-heavy API endpoints (content listing, single item fetch, collection schemas).

**Trade-offs:**
- Pro: Dramatic read performance improvement at edge
- Pro: Memory cache serves repeat requests within the same Worker instance at zero cost
- Con: KV has ~60s global propagation lag (acceptable for content, not for auth)
- Con: Memory cache is per-instance; not shared between Worker instances

**Example:**
```typescript
async function getContent(id: string, db: D1Database, kv: KVNamespace) {
  const key = generateCacheKey('content', 'item', id)

  // Tier 1: Memory
  const memHit = memoryCache.get(key)
  if (memHit) return memHit

  // Tier 2: KV
  if (kv) {
    const kvHit = await kv.get(key, 'json')
    if (kvHit) {
      memoryCache.set(key, kvHit)  // populate memory tier
      return kvHit
    }
  }

  // Tier 3: DB
  const result = await db.prepare('SELECT * FROM content WHERE id = ?').bind(id).first()
  if (result) {
    await kv?.put(key, JSON.stringify(result), { expirationTtl: 3600 })
    memoryCache.set(key, result)
  }
  return result
}
```

### Pattern 2: Hook-Mediated Side Effects

**What:** Route handlers mutate data, then fire hooks. Plugins subscribe to hooks to add behavior (cache invalidation, webhooks, search indexing) without coupling to route code.

**When to use:** Any content lifecycle operation (create, update, publish, delete).

**Trade-offs:**
- Pro: Plugins can add behavior without modifying core routes
- Pro: Hooks can be cancelled (e.g., block publish if validation fails)
- Con: Hook errors can silently swallow if not handled (use try/catch in hook handlers)
- Con: Async hook execution in Workers must complete within the request lifetime or use `ctx.waitUntil()`

**Example:**
```typescript
// In route handler
await db.prepare('UPDATE content SET status = ? WHERE id = ?')
  .bind('published', id).run()

// Fire hook — plugins react
await hookSystem.execute(HOOKS.CONTENT_PUBLISH, { id, title, collectionId }, { env: c.env })
// Hook handlers: cache invalidation, sitemap update, webhook delivery
```

### Pattern 3: State Machine as Pure Data

**What:** Define all valid content status transitions as a plain data structure. Validate transitions with a pure function. Apply side effects separately.

**When to use:** Any workflow with restricted state transitions (content status, plugin states, media states).

**Trade-offs:**
- Pro: Testable without DB or Workers runtime
- Pro: Adding new transitions is a data change, not code change
- Con: Business logic lives in data; harder to discover by reading code

**Example:**
```typescript
const ALLOWED_TRANSITIONS: Record<ContentStatus, Array<{
  to: ContentStatus
  roles: UserRole[]
}>> = {
  draft: [
    { to: 'published', roles: ['editor', 'admin'] },
    { to: 'scheduled', roles: ['editor', 'admin'] },
    { to: 'review-pending', roles: ['author', 'editor', 'admin'] },
  ],
  published: [
    { to: 'archived', roles: ['editor', 'admin'] },
    { to: 'draft', roles: ['editor', 'admin'] },  // unpublish (fixes existing bug)
  ],
  // ...
}
```

### Pattern 4: Streaming for Large Payloads

**What:** Never buffer large request/response bodies. Use `TransformStream` to pipe data through the Worker without holding it in memory.

**When to use:** File uploads, large content exports, bulk operations.

**Trade-offs:**
- Pro: Prevents 128MB memory limit crashes on large uploads
- Pro: Better time-to-first-byte for responses
- Con: Cannot inspect full body before streaming (must validate metadata separately)

**Current gap:** The media upload route uses `file.arrayBuffer()` which buffers the entire file. For files > a few MB, this is problematic.

---

## Data Flow

### API Read Request Flow

```
GET /api/collections/blog-posts/content
    ↓
metricsMiddleware (count++)
    ↓
bootstrapMiddleware (skip if already done)
    ↓
securityHeadersMiddleware (set headers on response)
    ↓
corsMiddleware (if cross-origin, add CORS headers)
    ↓
rateLimitMiddleware (check counter; pass through)
    ↓
Route handler: apiRoutes
    ↓
Check Cache API (for GET requests)          [NEW]
    ↓ MISS
Check KV cache (content:list:blog-posts:v1)
    ↓ MISS
D1 query: SELECT * FROM content WHERE collection_id = ?
    ↓
Filter to status = 'published'             [client-side currently; fix in DB query]
    ↓
Write to KV (TTL 300s)
    ↓
Write to Cache API (TTL 300s)              [NEW]
    ↓
Return JSON with X-Cache-Status: MISS
```

### Content Publish Flow

```
PUT /admin/content/:id/publish
    ↓
requireAuth() → requireRole('editor', 'admin')
    ↓
Load current content: SELECT status FROM content WHERE id = ?
    ↓
canTransition('draft', 'published', user.role)  ← pure function, no DB
    ↓ ALLOWED
Fire CONTENT_BEFORE_PUBLISH hook
    ↓ (plugins may cancel, e.g., SEO validation)
D1: UPDATE content SET status='published', published_at=? WHERE id=?
    ↓
D1: INSERT INTO workflow_history (from='draft', to='published', user_id=?)
    ↓
Fire CONTENT_AFTER_PUBLISH hook
    ↓
HookHandler: invalidate cache (content:*, api:*)
HookHandler: KV.delete('content:item:{id}:v1')
HookHandler: KV.delete pattern 'content:list:*'
    ↓
Return { success: true, newStatus: 'published' }
```

### Media Upload Flow

```
POST /api/media/upload (multipart/form-data)
    ↓
requireAuth()
    ↓
Parse FormData → File object
    ↓
Validate: type in allowlist, size < 50MB (Zod)
    ↓
Generate: fileId = crypto.randomUUID(), r2Key = {folder}/{fileId}.{ext}
    ↓
Fire MEDIA_BEFORE_UPLOAD hook (plugins: malware scan, image optimization)
    ↓
Stream to R2: MEDIA_BUCKET.put(r2Key, file.stream(), metadata)    [fix: use stream not arrayBuffer]
    ↓
Extract dimensions: header parsing (JPEG/PNG — existing implementation)
    ↓
D1: INSERT INTO media (id, r2_key, public_url, ...)
    ↓
Fire MEDIA_AFTER_UPLOAD hook (plugins: thumbnail generation, CDN notify)
    ↓
Return { id, publicUrl }
```

---

## Anti-Patterns

### Anti-Pattern 1: Using Module-Level State as Worker State

**What people do:** Use module-level variables (outside the handler) to store request data or cache.

**Why it's wrong:** Workers share module scope across requests in the same instance. Module-level state can leak between requests (e.g., `bootstrapComplete = false` reset causing re-bootstrap).

**Do this instead:** Module-level variables are acceptable for true process-lifetime data (like the `bootstrapComplete` flag). Request-scoped data must stay in Hono's `c` context or be passed explicitly.

### Anti-Pattern 2: Buffering Large Files in Memory

**What people do:** `const buffer = await file.arrayBuffer()` then `bucket.put(key, buffer)`.

**Why it's wrong:** The 128MB Worker memory limit applies. A 50MB upload plus Worker overhead can crash the instance. Current implementation does this.

**Do this instead:** Use streaming upload: `bucket.put(key, file.stream(), metadata)`. R2 `put()` accepts ReadableStream.

### Anti-Pattern 3: Rate Limiting After Auth

**What people do:** Apply rate limiting middleware only to authenticated routes.

**Why it's wrong:** The auth verification path (JWT decode, KV lookup) is itself expensive. Unauthenticated DoS can overwhelm auth middleware.

**Do this instead:** Apply rate limiting before auth. Use a looser limit for unauthenticated paths, stricter for mutation endpoints.

### Anti-Pattern 4: Global Cache Invalidation on Every Mutation

**What people do:** `await cache.invalidate('content:*')` on every content update.

**Why it's wrong:** Nukes the entire content cache for a single item update. Cold cache causes a thundering herd on the DB.

**Do this instead:** Precise invalidation: delete the specific item key, then invalidate list patterns that include that collection. Keep schema/config caches intact.

### Anti-Pattern 5: Blocking Hook Execution

**What people do:** Long-running operations (webhook delivery, email sending) inside hook handlers, blocking the response.

**Why it's wrong:** Workers have a 30-second CPU limit. Webhook delivery to slow external services can time out.

**Do this instead:** Use `ctx.waitUntil()` for non-critical post-response work. The hook can fire the async work without blocking the HTTP response.

```typescript
// In route handler
c.executionCtx.waitUntil(
  hookSystem.execute(HOOKS.CONTENT_PUBLISH, data)
)
return c.json({ success: true })  // responds immediately
```

### Anti-Pattern 6: String 'null' in FK Columns

**What people do:** Insert the string `'null'` into nullable FK columns in D1.

**Why it's wrong:** D1 interprets it as a string value, causing FK constraint violations on related tables.

**Do this instead:** Always use SQL `NULL` for nullable FKs. Confirmed issue in this project — see SONICJS-ISSUES.md.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k req/day | Current architecture is fine. KV not needed; in-memory cache sufficient. |
| 1k-100k req/day | Wire KV cache. Enable Cache API for media. Rate limiting becomes important. |
| 100k+ req/day | KV cache for all content API responses. Durable Objects for real-time features. Consider Queues for webhook delivery. Media via Cloudflare Images (not R2 direct). |

### First Bottleneck: D1 Read Latency

D1 is SQLite on distributed infrastructure. Cold reads (cache miss) can be 100-300ms. The three-tier cache solves this for the happy path, but cache warming matters.

The current `cache-warming.ts` file exists but needs to be triggered at bootstrap (currently not wired).

### Second Bottleneck: Bootstrap Overhead

The `bootstrapMiddleware` runs migrations + collection sync + plugin init on the first request per Worker instance. On cold starts under load, multiple instances may bootstrap simultaneously, causing a burst of D1 writes.

**Fix:** Make bootstrap idempotent (already mostly is) and add a KV-based distributed lock for the migration step to prevent concurrent migration runs.

---

## Build Order Implications

The architecture has these dependency layers. Work must proceed in this order:

**Layer 1 — Foundation (no dependencies):**
- Fix R2 binding name mismatch in `wrangler.toml`
- Add security headers middleware
- Add CORS middleware (Hono built-in)
- Add rate limiting middleware (CF native binding)

**Layer 2 — Core Services (depends on Layer 1):**
- Wire KV binding into cache plugin
- Implement content workflow state machine (pure function)
- Fix API filter bug (server-side WHERE clause instead of client-side filter)

**Layer 3 — Content Lifecycle (depends on Layer 2):**
- Connect route handlers to HookSystem (replace `emitEvent` stubs)
- Implement write-through cache invalidation
- Implement content state transitions with workflow_history audit trail
- Fix unpublish (status one-way bug)

**Layer 4 — Media Pipeline (depends on Layer 1):**
- Fix upload to use streaming (not arrayBuffer)
- Wire MEDIA_BEFORE_UPLOAD / MEDIA_AFTER_UPLOAD hooks
- Add Cache API for media serve route

**Layer 5 — Plugin Integration (depends on Layers 2-4):**
- Add `app` reference to PluginContext (enables plugin middleware registration)
- Add missing workflow hooks to HOOKS constant
- Wire plugin-declared middleware into app.use()

**Cross-cutting:**
- Security headers can be added independently of all layers
- Cache warming should be added when KV is wired (Layer 2)
- Rate limiting is independent of content/media work

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Cloudflare D1 | `c.env.DB` — Drizzle ORM | Direct binding, no network hop |
| Cloudflare R2 | `c.env.MEDIA_BUCKET` — native API | Binding name mismatch currently |
| Cloudflare KV | `c.env.CACHE_KV` — native API | Not yet wired into cache plugin |
| Cloudflare Images | `c.env.IMAGES` — native API | Optional; requires separate binding |
| Cloudflare Rate Limit | `c.env.RATE_LIMITER` — native API | Not yet added |
| SendGrid | Via Queue + email plugin | Worker → Queue → email plugin consumer |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Middleware → Routes | Hono context `c` (user, requestId, startTime) | Well-defined via Variables type |
| Routes → Services | Direct function call | No abstraction layer currently |
| Services → Cache | CacheService.getOrSet() | Consistent key format needed |
| Services → HookSystem | hookSystem.execute() | Currently stubbed as emitEvent() |
| Plugins → Core | PluginContext (db, kv, r2, hooks, services) | app reference missing |
| Cache Plugin → KV | KV.get/put/delete | KV namespace not passed to cache plugin yet |
| Media Route → R2 | c.env.MEDIA_BUCKET | Binding name fix needed |

---

## Sources

- Cloudflare Workers Best Practices (Feb 2026): https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
- Cloudflare Cache API docs: https://developers.cloudflare.com/workers/runtime-apis/cache/
- Cloudflare Security Headers example: https://developers.cloudflare.com/workers/examples/security-headers/
- Cloudflare Rate Limiting binding: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Cloudflare KV docs: https://developers.cloudflare.com/kv/
- Hono CORS middleware: https://hono.dev/docs/middleware/builtin/cors
- SonicJS source: `sonicjs-fork/packages/core/src/` (verified directly)
- SonicJS schema: `sonicjs-fork/packages/core/src/db/schema.ts` (verified directly)
- SonicJS app factory: `sonicjs-fork/packages/core/src/app.ts` (verified directly)

---
*Architecture research for: edge-native headless CMS on Cloudflare Workers (SonicJS fork)*
*Researched: 2026-03-01*
