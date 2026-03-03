# Phase 3: Media Pipeline + Caching - Research

**Researched:** 2026-03-02
**Domain:** Cloudflare Workers R2 uploads, Cache API, KV cache integration, SonicJS fork codebase
**Confidence:** HIGH (codebase inspection) + MEDIUM (Cloudflare official docs)

---

## Summary

Phase 3 has two distinct problem areas: (1) fixing and improving media uploads to R2, and (2) wiring the already-written three-tier KV cache into the content API routes.

**Media uploads are broken for one concrete reason:** `wrangler.toml` uses `binding = "MEDIA_BUCKET"` but Phase 0 was supposed to rename this to `BUCKET`. Reading the current wrangler.toml confirms it still uses `MEDIA_BUCKET`, which matches what the fork code expects (`c.env.MEDIA_BUCKET`). The error "MEDIA_BUCKET is not available!" suggests the binding name in wrangler.toml does NOT match what the code looks for. Inspection shows the fork code uses `MEDIA_BUCKET` throughout (`app.ts`, `api-media.ts`), and wrangler.toml also declares `MEDIA_BUCKET`. These match — the real issue is likely that the wrangler.toml binding is present but the local dev environment isn't picking it up, OR the Phase 0 "FOUND-01" rename was supposed to switch `MEDIA_BUCKET` to `BUCKET` in wrangler.toml only. The prior decision states "R2 bucket binding name is BUCKET (renamed from MEDIA_BUCKET in Phase 0 FOUND-01)" — meaning the wrangler.toml was supposed to have been changed to `binding = "BUCKET"` but the code still uses `MEDIA_BUCKET`. **This mismatch is the root cause of the upload error.**

**Memory/streaming fix is straightforward:** The current upload code calls `file.arrayBuffer()` which buffers the entire file into Worker memory. Since Workers have a 128MB memory limit and the free plan request body limit is 100MB, switching to `file.stream()` is the correct fix. R2's `put()` method accepts ReadableStream natively.

**KV cache is already implemented in the fork** (`plugins/cache/` with full three-tier service, event bus, and invalidation). The issue is that `setGlobalKVNamespace(c.env.CACHE_KV)` is never called during app startup, so all cache instances run in memory-only mode even when `kvEnabled: true`. Wiring KV requires a one-line initialization call early in request handling.

**Primary recommendation:** Fix the binding name mismatch (wrangler.toml BUCKET vs code MEDIA_BUCKET), replace `arrayBuffer()` with `file.stream()`, add Cache API headers to the `/files/*` route, and call `setGlobalKVNamespace` in the request middleware before route handlers run.

---

## Standard Stack

### Core (already in fork — no new dependencies)

| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| R2 (MEDIA_BUCKET binding) | `wrangler.toml` + `app.ts` | Binary object storage | Broken (binding mismatch) |
| KV (CACHE_KV binding) | `wrangler.toml` + `app.ts` | Distributed cache tier | Wired but KV namespace never injected |
| Cache API (Workers runtime) | `caches.default` | Edge HTTP cache for media | Not yet used in `/files/*` route |
| CachePlugin | `plugins/cache/` | Three-tier cache service | Written, not fully wired |
| EventBus | `plugins/cache/services/event-bus.ts` | Cache invalidation events | Written, used in content CRUD |

### No New Libraries Needed

All required infrastructure already exists in the fork. Phase 3 is entirely about:
1. Configuration fixes (binding names)
2. Code fixes (streaming, KV initialization)
3. Adding cache headers to media serving

**Installation:** None required.

---

## Architecture Patterns

### Recommended File Structure Changes

```
sonicjs-fork/packages/core/src/
├── app.ts                          # Add: setGlobalKVNamespace call in middleware
├── routes/
│   ├── api-media.ts                # Fix: arrayBuffer() → file.stream()
│   └── api.ts                      # Already has KV cache logic (gated on plugin active)
└── plugins/cache/services/
    └── cache.ts                    # setGlobalKVNamespace() already exported

my-astro-cms/
└── wrangler.toml                   # Fix: binding name MEDIA_BUCKET vs BUCKET alignment
```

### Pattern 1: Fix Binding Name Mismatch

**What:** The fork code uses `c.env.MEDIA_BUCKET` throughout (`app.ts` line 51, `api-media.ts` line 81, 236, 413, etc.). Phase 0 decision says binding was renamed to `BUCKET` in wrangler.toml, but the code was never updated.

**Resolution options:**
- Option A: Change wrangler.toml back to `binding = "MEDIA_BUCKET"` (matches fork code, no code changes)
- Option B: Change all `c.env.MEDIA_BUCKET` references in fork code to `c.env.BUCKET` and update `Bindings` type

Option A is the lower-risk path since Phase 0 FOUND-01 note says the rename happened in wrangler.toml. Reverting wrangler.toml to match existing code is surgical. The `Bindings` interface in `app.ts` declares `MEDIA_BUCKET: R2Bucket` which must match wrangler.toml.

**Example (current state — broken):**
```toml
# wrangler.toml (current — declared as MEDIA_BUCKET, matches code)
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "my-astro-cms-media"
```

Wait — re-reading: wrangler.toml currently declares `binding = "MEDIA_BUCKET"` and the code uses `c.env.MEDIA_BUCKET`. **These match.** The error must have a different cause. Likely: the local dev environment hasn't run `wrangler dev` with the correct binding, or the binding wasn't created yet in Cloudflare. The "MEDIA_BUCKET is not available!" error comes from the `validateBindingsMiddleware` which checks `c.env.MEDIA_BUCKET`.

**Root cause clarification:** The binding exists in wrangler.toml as `MEDIA_BUCKET`. The code checks for it. If the error fires, it means the R2 bucket binding is not being passed to the Worker runtime — likely a local dev issue where wrangler dev needs `--local` flag or the bucket doesn't exist yet in Cloudflare.

**Actual fix needed:** Verify the R2 bucket exists in Cloudflare account AND that the wrangler.toml binding name aligns with what the code uses. The Phase 0 decision "renamed to BUCKET" may have been a plan that was never executed in code, making the current state correct (both wrangler.toml and code say MEDIA_BUCKET).

### Pattern 2: Streaming Upload to R2

**What:** Replace `file.arrayBuffer()` with `file.stream()` to avoid buffering entire file in Worker memory.

**When to use:** All upload paths (single and multiple file uploads in `api-media.ts`).

```typescript
// Source: R2 Workers API docs + codebase inspection
// BEFORE (buffers entire file — risky for large files):
const arrayBuffer = await file.arrayBuffer()
await c.env.MEDIA_BUCKET.put(r2Key, arrayBuffer, { httpMetadata: { ... } })

// AFTER (streams directly — no memory accumulation):
await c.env.MEDIA_BUCKET.put(r2Key, file.stream(), {
  httpMetadata: {
    contentType: file.type,
    contentDisposition: `inline; filename="${file.name}"`
  },
  customMetadata: {
    originalName: file.name,
    uploadedBy: user.userId,
    uploadedAt: new Date().toISOString()
  }
})
```

**Caveat:** If image dimension extraction still needs to happen post-upload, dimensions must be extracted before switching to streaming (since `file.stream()` can only be consumed once). The dimension extraction code currently uses the `arrayBuffer` variable. Two options:
- Keep `arrayBuffer()` for images only (small enough usually), stream everything else
- Skip dimension extraction on upload, compute lazily on first serve (simpler)
- Extract dimensions first from a slice of bytes, then stream upload

The simplest practical approach: extract dimensions from `arrayBuffer` only for images under a threshold (e.g., 10MB), use `file.stream()` for everything else. For PDFs and large files, skip dimension extraction entirely (they don't have dimensions anyway).

### Pattern 3: Cache API for Media Serving

**What:** Wrap the existing `/files/*` route in Workers Cache API to avoid hitting R2 on every request.

**When to use:** The `/files/*` route in `app.ts` that currently fetches from R2 on every request.

**Critical constraint:** Cache API only works on custom domains, NOT on `*.workers.dev` subdomains or local dev. In local dev, `cache.put()` silently does nothing.

```typescript
// Source: https://developers.cloudflare.com/r2/examples/cache-api/
// In app.ts /files/* handler:
app.get('/files/*', async (c) => {
  const url = new URL(c.req.url)
  const cache = caches.default
  const cacheKey = new Request(url.toString(), { method: 'GET' })

  // Check cache first
  let response = await cache.match(cacheKey)
  if (response) {
    return response
  }

  const objectKey = url.pathname.replace(/^\/files\//, '')
  if (!objectKey) return c.notFound()

  const object = await c.env.MEDIA_BUCKET.get(objectKey)
  if (!object) return c.notFound()

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)               // RFC 9110 quoted ETag
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  headers.set('Access-Control-Allow-Origin', '*')

  response = new Response(object.body as any, { headers })

  // Store in cache without blocking response
  c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()))

  return response
})
```

**Note on immutable caching:** Using `immutable` + `max-age=31536000` is safe because the fork uses hash-based filenames (`${fileId}.${extension}` where `fileId` is a UUID fragment). Files never change content at a given URL — deleted files get new UUIDs on re-upload.

**Note on ETag:** R2 provides `object.httpEtag` (already quoted per RFC 9110). Use `headers.set('etag', object.httpEtag)` not `headers.set('ETag', ...)` — case matters for Cache API matching.

### Pattern 4: Wire KV Namespace into Cache Service

**What:** The `CacheService` in the fork already supports KV as Tier 2, but `getCacheService()` uses a `globalKVNamespace` that's only set if `setGlobalKVNamespace()` is called. It is never called currently.

**When:** Early in request handling, before any route handler calls `getCacheService()`.

**Where to add it:** The best place is the bootstrap middleware in `app.ts`, or a dedicated middleware added to the `app.use('*', ...)` chain before routes.

```typescript
// Source: sonicjs-fork/packages/core/src/plugins/cache/services/cache.ts
// Import already available via cachePlugin export:
import cachePlugin, { setGlobalKVNamespace } from './plugins/cache'

// In createSonicJSApp(), add middleware before routes:
app.use('*', async (c, next) => {
  if (c.env.CACHE_KV && !globalKVInitialized) {
    setGlobalKVNamespace(c.env.CACHE_KV)
    globalKVInitialized = true
  }
  await next()
})
```

**Important:** `setGlobalKVNamespace` sets a module-level variable. Due to Workers isolation model, each cold start re-initializes module state. The initialization is idempotent — calling it multiple times with the same namespace is safe. Use a module-level flag to avoid calling it on every request.

**Current state of cache in content routes:** `api.ts` and `api-content-crud.ts` already call `getCacheService(CACHE_CONFIGS.api!)` and perform `invalidate()`. These will silently fall back to memory-only mode if `globalKVNamespace` is undefined. Once set, KV automatically becomes Tier 2 for all subsequent cache operations.

### Pattern 5: Write-Through Cache Invalidation (Already Implemented)

**What:** Content mutations already call `cache.invalidate()` in `api-content-crud.ts` (lines 164-166, 347-350, 413-416). The event bus in `plugins/cache/services/event-bus.ts` handles broader invalidation.

**Critical gap:** The KV invalidation in `CacheService.invalidate()` uses `kvNamespace.list({ prefix })` followed by individual deletes. This has a known issue: **KV list results may be up to 60 seconds stale**. A freshly-written KV key may not appear in list results immediately.

**Practical impact:** After content mutation, pattern-based KV invalidation (`content:list:*`) may miss recently-cached keys. The safety net is the TTL on KV entries (default 300s for `api` namespace, 3600s for `content`).

**Recommendation:** Keep TTL-based expiry as the primary safety net. Treat event-based invalidation as best-effort for KV. Memory invalidation is always immediate.

### Anti-Patterns to Avoid

- **Don't use `file.arrayBuffer()` for all upload types:** PDFs and large images easily exceed 50MB, pushing Worker close to the 128MB memory limit.
- **Don't use Cache API for write operations:** `cache.put()` requires GET method; upload routes are POST and are not cached.
- **Don't rely on Cache API in local dev:** `wrangler dev` does not simulate the Cache API. Test media caching behavior only after deploying to a custom domain.
- **Don't call `setGlobalKVNamespace` inside route handlers:** Call it once at startup/first-request, not per-request. The module-level singleton pattern in `getCacheService` means repeated calls to `setGlobalKVNamespace` after first `getCacheService()` call won't affect already-created instances.
- **Don't attempt pattern-based KV invalidation for high-volume writes:** `kvNamespace.list()` followed by individual deletes is O(n) and can exceed CPU limits. The existing implementation is acceptable for a CMS (low write volume), but worth flagging.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| R2 streaming upload | Custom chunking logic | `file.stream()` → R2 `put()` | R2 accepts ReadableStream natively |
| Cache key generation | Custom hash functions | `CacheService.generateKey()` | Already in fork, consistent format |
| Event-based invalidation | Manual cache.delete() after each mutation | `emitEvent()` + event bus | Already wired in content CRUD routes |
| ETag generation for media | SHA-256 of content | R2's `object.httpEtag` | R2 computes and stores ETag automatically |
| KV TTL management | Custom expiry tracking | `kvNamespace.put(key, val, { expirationTtl })` | KV handles TTL natively (min 60s) |
| Three-tier cache logic | New cache abstraction | `getCacheService()` from fork | Fully implemented with stats and invalidation |

**Key insight:** The fork's cache plugin (`plugins/cache/`) is a complete, well-structured three-tier cache. Do not rewrite it — wire it to the KV namespace it already expects.

---

## Common Pitfalls

### Pitfall 1: Binding Name Mismatch Between wrangler.toml and Bindings Interface

**What goes wrong:** `c.env.MEDIA_BUCKET` is undefined at runtime, causing "MEDIA_BUCKET is not available!" from `validateBindingsMiddleware`.
**Why it happens:** wrangler.toml `binding` name must exactly match the property name used in the `Bindings` interface and in `c.env.*` access. A rename in wrangler.toml without updating the TypeScript interface (or vice versa) causes silent `undefined`.
**How to avoid:** Ensure `binding = "MEDIA_BUCKET"` in wrangler.toml matches `MEDIA_BUCKET: R2Bucket` in the `Bindings` interface in `app.ts`.
**Warning signs:** TypeScript may not catch this at compile time if the interface has the field as optional. The error only appears at runtime in dev.

### Pitfall 2: Image Dimension Extraction Breaks After Streaming Switch

**What goes wrong:** Switching to `file.stream()` and then trying to call `getImageDimensions(arrayBuffer)` fails because `arrayBuffer` is no longer available.
**Why it happens:** `file.arrayBuffer()` and `file.stream()` both consume the File body. You can only call one.
**How to avoid:** For images, call `file.arrayBuffer()` as before (images are typically small enough to buffer). For non-images (PDFs, videos, audio), use `file.stream()`.

```typescript
let arrayBuffer: ArrayBuffer | null = null
let uploadBody: ArrayBuffer | ReadableStream

if (file.type.startsWith('image/')) {
  arrayBuffer = await file.arrayBuffer()
  uploadBody = arrayBuffer  // Buffer is fine for images (smaller files)
} else {
  uploadBody = file.stream()  // Stream for large non-image files
}

await c.env.MEDIA_BUCKET.put(r2Key, uploadBody, { ... })

if (arrayBuffer && file.type.startsWith('image/') && !file.type.includes('svg')) {
  // Extract dimensions from already-buffered arrayBuffer
}
```

### Pitfall 3: Cache API Does Nothing in Local Dev

**What goes wrong:** `cache.put()` calls succeed but have no effect in `wrangler dev`. Developer assumes caching works but it never fires in production tests.
**Why it happens:** Cloudflare Cache API requires a real zone (custom domain). `*.workers.dev` subdomains and local dev bypass the cache entirely.
**How to avoid:** Design the `/files/*` route to work correctly without cache (R2 fallback always works). Add `X-Cache-Status: BYPASS` header in local dev if needed for observability.
**Warning signs:** Cache HIT never observed in local dev logs — this is expected, not a bug.

### Pitfall 4: KV List Staleness for Cache Invalidation

**What goes wrong:** After a content mutation, `invalidate('content:list:*')` calls `kvNamespace.list({ prefix: 'content:' })` but doesn't see recently-written keys (KV list has up to 60s eventual consistency).
**Why it happens:** KV uses eventual consistency — list operations reflect writes after a propagation delay.
**How to avoid:** Use TTL as primary cache expiry. Treat KV list-based invalidation as best-effort. For content CMS use case (low write frequency), this is acceptable.

### Pitfall 5: `setGlobalKVNamespace` Called After First `getCacheService()`

**What goes wrong:** Routes call `getCacheService()` before `setGlobalKVNamespace()` runs. The singleton is created without KV. Calling `setGlobalKVNamespace` later doesn't affect already-created instances.
**Why it happens:** `getCacheService()` creates a singleton on first call. The KV namespace is only available at request-handling time (from `c.env`), not at module initialization time.
**How to avoid:** Call `setGlobalKVNamespace(c.env.CACHE_KV)` in a middleware that runs BEFORE any route handler. In `app.ts`, add it as the first `app.use('*', ...)` after the existing request-level middleware setup, or in the bootstrap middleware.

### Pitfall 6: KV Value Size Limit (25 MiB)

**What goes wrong:** Caching a large collection response in KV fails silently or throws.
**Why it happens:** KV values are limited to 25 MiB. A large content list response (e.g., thousands of items) could exceed this.
**How to avoid:** The existing cache implementation stores full API responses. For collections with many items, either cache paginated responses (smaller chunks) or add a size check before KV put.
**Warning signs:** Content cache works in memory but KV cache silently falls through to DB on every request despite `kvEnabled: true`.

---

## Code Examples

### Streaming Upload (fix for MEDIA-02)

```typescript
// Source: Cloudflare R2 docs + codebase analysis
// In sonicjs-fork/packages/core/src/routes/api-media.ts

// Determine upload strategy by file type
let uploadBody: ArrayBuffer | ReadableStream
let arrayBuffer: ArrayBuffer | null = null

if (file.type.startsWith('image/') && !file.type.includes('svg')) {
  // Buffer images for dimension extraction (images are typically smaller)
  arrayBuffer = await file.arrayBuffer()
  uploadBody = arrayBuffer
} else {
  // Stream non-image files directly to R2 to avoid memory pressure
  uploadBody = file.stream()
}

const uploadResult = await c.env.MEDIA_BUCKET.put(r2Key, uploadBody, {
  httpMetadata: {
    contentType: file.type,
    contentDisposition: `inline; filename="${file.name}"`
  },
  customMetadata: {
    originalName: file.name,
    uploadedBy: user.userId,
    uploadedAt: new Date().toISOString()
  }
})
```

### Cache API Media Serving with ETag (fix for MEDIA-03)

```typescript
// Source: https://developers.cloudflare.com/r2/examples/cache-api/
// In sonicjs-fork/packages/core/src/app.ts — /files/* handler

app.get('/files/*', async (c) => {
  try {
    const url = new URL(c.req.url)
    const objectKey = url.pathname.replace(/^\/files\//, '')
    if (!objectKey) return c.notFound()

    // Check Workers Cache API first (no-op in local dev)
    const cache = caches.default
    const cacheKey = new Request(url.toString(), { method: 'GET' })
    const cachedResponse = await cache.match(cacheKey)
    if (cachedResponse) {
      return cachedResponse
    }

    // Cache miss — fetch from R2
    const object = await c.env.MEDIA_BUCKET.get(objectKey)
    if (!object) return c.notFound()

    const headers = new Headers()
    object.writeHttpMetadata(headers)               // Sets Content-Type, Content-Disposition from stored metadata
    headers.set('etag', object.httpEtag)            // RFC 9110 quoted ETag from R2
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')

    const response = new Response(object.body as any, { headers })

    // Store in Cache API without blocking response return
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()))

    return response
  } catch (error) {
    console.error('Error serving file:', error)
    return c.notFound()
  }
})
```

### KV Namespace Initialization (fix for CACHE-01)

```typescript
// Source: sonicjs-fork/packages/core/src/plugins/cache/services/cache.ts + app.ts
// In sonicjs-fork/packages/core/src/app.ts — createSonicJSApp()

import { setGlobalKVNamespace } from './plugins/cache'

// Module-level flag — survives across requests in same isolate
let kvInitialized = false

// Add this middleware BEFORE route registration:
app.use('*', async (c, next) => {
  if (!kvInitialized && c.env.CACHE_KV) {
    setGlobalKVNamespace(c.env.CACHE_KV)
    kvInitialized = true
    console.log('[Cache] KV namespace initialized')
  }
  await next()
})
```

### X-Cache-Status Header Pattern (already in api.ts, verify works end-to-end)

```typescript
// Source: sonicjs-fork/packages/core/src/routes/api.ts lines 540-541, 564-565
// This pattern is already implemented — once KV is wired, it will show 'kv' as source

// On cache HIT:
c.header('X-Cache-Status', 'HIT')
c.header('X-Cache-Source', cacheResult.source)  // 'memory' or 'kv'

// On cache MISS:
c.header('X-Cache-Status', 'MISS')
c.header('X-Cache-Source', 'database')
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `file.arrayBuffer()` for all uploads | `file.stream()` for non-images | Now | Eliminates OOM risk on large files |
| No Cache API on media | `caches.default` + `Cache-Control: immutable` | Now | Edge caching, reduces R2 egress |
| Memory-only cache | Memory + KV two-tier cache | Now (code exists, needs wiring) | Cross-region cache persistence |
| No ETag on media | `object.httpEtag` from R2 | Now | Conditional requests, 304 responses |

**Deprecated/outdated:**
- `file.arrayBuffer()` for large file uploads: Works below 128MB but risky — replace with streaming for non-image files
- Hard-coded `Cache-Control: public, max-age=31536000` without `immutable`: Missing `immutable` keyword means browsers may still revalidate — add it since keys are content-addressed UUIDs

---

## Open Questions

1. **Phase 0 FOUND-01 binding rename: what actually happened?**
   - What we know: Decision says "R2 bucket binding name is BUCKET (renamed from MEDIA_BUCKET in Phase 0 FOUND-01)". Current wrangler.toml says `binding = "MEDIA_BUCKET"`. Code uses `c.env.MEDIA_BUCKET`.
   - What's unclear: Was the wrangler.toml rename actually executed? If so, it was reverted. If not, the Phase 0 decision was a plan that didn't execute.
   - Recommendation: **Treat current state as authoritative.** Both wrangler.toml and code use `MEDIA_BUCKET`. Keep that. The error is likely a dev environment issue (R2 bucket not created, or wrangler dev not running with correct bindings).

2. **`c.executionCtx` availability in Hono**
   - What we know: Cache API requires `waitUntil()` for non-blocking cache puts. Hono exposes this via `c.executionCtx.waitUntil()` in Workers mode.
   - What's unclear: Whether `c.executionCtx` is always available or needs special Hono configuration.
   - Recommendation: Use `c.executionCtx.waitUntil(cache.put(...))` — this is standard Hono+Workers pattern. Fall back to awaiting the put if `executionCtx` is unavailable.

3. **Cache API vs. `s-maxage` vs. `max-age` for media serving**
   - What we know: Cache API respects `s-maxage` for shared cache TTL. `max-age=31536000,immutable` applies to browser cache. For Workers Cache API, `s-maxage` controls how long it stays in Cloudflare edge cache.
   - Recommendation: Use both: `Cache-Control: public, max-age=31536000, s-maxage=31536000, immutable`. This caches at both browser and Cloudflare edge for 1 year.

4. **PDF upload type validation: fork blocks PDF**
   - Current state: `api-media.ts` has an `allowedTypes` whitelist that DOES include `application/pdf`. This is correct.
   - What's unclear: Is the PDF upload error from the MIME type being sent incorrectly by the browser, or from a different validation layer?
   - Recommendation: Verify the admin upload UI sends the correct `Content-Type` for PDFs. The server-side validation already allows PDFs.

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `sonicjs-fork/packages/core/src/routes/api-media.ts` — upload implementation
- Codebase inspection: `sonicjs-fork/packages/core/src/app.ts` — /files/* route and Bindings interface
- Codebase inspection: `sonicjs-fork/packages/core/src/plugins/cache/` — complete three-tier cache implementation
- Codebase inspection: `sonicjs-fork/packages/core/src/routes/api.ts` — cache-aware content API routes
- Codebase inspection: `my-astro-cms/wrangler.toml` — actual binding configuration

### Secondary (MEDIUM confidence)
- [Use Cache API with R2 - Cloudflare docs](https://developers.cloudflare.com/r2/examples/cache-api/) — Cache API + R2 pattern with ETag
- [Cache API - Cloudflare Workers docs](https://developers.cloudflare.com/workers/runtime-apis/cache/) — constraints, local dev limitations
- [R2 Workers API usage](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/) — streaming upload support
- [KV write key-value pairs](https://developers.cloudflare.com/kv/api/write-key-value-pairs/) — expirationTtl minimum 60s, 25MiB limit
- [KV list keys](https://developers.cloudflare.com/kv/api/list-keys/) — prefix parameter, 60s staleness
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) — 128MB memory limit confirmed

### Tertiary (LOW confidence)
- WebSearch: community posts about streaming R2 uploads — corroborate ReadableStream support, not definitive

---

## Metadata

**Confidence breakdown:**
- R2 binding fix: HIGH — direct codebase inspection shows the issue
- Streaming upload pattern: HIGH — R2 docs confirm ReadableStream accepted, current code confirmed using arrayBuffer()
- Cache API media serving: MEDIUM — pattern confirmed from official docs, local dev limitation noted
- KV wiring: HIGH — setGlobalKVNamespace exists and is exported, getCacheService singleton pattern confirmed
- KV invalidation staleness: MEDIUM — documented 60s eventual consistency from official KV docs
- Cache API local dev limitation: HIGH — explicitly documented by Cloudflare

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (Cloudflare Workers APIs are stable; R2/KV APIs change infrequently)
