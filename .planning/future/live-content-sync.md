# Live Content Sync — Real-Time Frontend Updates via KV Versioning

## Problem

Astro's content layer (flareLoader) fetches data at build time and caches it. When content is published via Go Live/Sync in the CMS admin, the frontend serves stale data until the next rebuild. This defeats the purpose of SSR for content-driven sites.

Tony at Tony's Pizza updates his Football Game Special price → clicks Go Live → refreshes the menu page → still sees the old price. Unacceptable.

## Solution

Add a **KV-based content version check** to the Astro frontend. The flareLoader stays for DX (type safety, schema validation, Astro collections API). A lightweight middleware layer checks whether the cached data is fresh, and fetches from the API if not.

## How It Works

### CMS Side (Worker)
1. KV key: `content_version` — an integer counter
2. Every time Go Live/Sync approves revisions, bump `content_version` in KV
3. New API endpoint: `GET /api/content-version` → returns `{ version: 42 }`

### Astro Side (Pages)
1. flareLoader fetches content at build time (current behavior, unchanged)
2. flareLoader stores the `content_version` it was built with
3. Astro middleware runs on every request:
   - Reads `content_version` from CMS KV (shared namespace, or lightweight API call)
   - Compares with the version baked into the build
   - **Same version** → `getCollection()` returns cached data (fast path, no extra work)
   - **New version** → fetches fresh data from CMS API, serves that instead
4. After fresh fetch, cache the new data + version in KV so subsequent requests are fast again

### Shared KV Namespace
Both the CMS Worker and the Astro Pages site are on Cloudflare. They can share a KV namespace:
- CMS writes: `content_version`, and optionally pre-serialized collection data
- Astro reads: version check + fresh data if needed

Alternatively, the Astro middleware calls the CMS API (one fetch) instead of sharing KV.

## Performance

| Scenario | Cost |
|----------|------|
| No content changes | 1 KV read (~1ms) per request |
| Content just changed | 1 KV read + 1 API fetch (first request), then cached |
| Subsequent requests after refresh | 1 KV read (version matches again) |

Most requests add ~1ms. Only the first request after a Go Live does extra work.

## Architecture

```
[CMS Admin] → Go Live → bump content_version in KV
                                    ↓
[Astro Page Request] → middleware checks KV version
                                    ↓
                        same? → serve cached (fast)
                        new?  → fetch API → serve fresh → cache
```

## What Changes

### `@flare-cms/astro` package
- flareLoader stores `content_version` alongside fetched data
- New export: `createFreshnessMiddleware()` for Astro middleware

### Astro site (`packages/site/`)
- Add middleware that calls `createFreshnessMiddleware()`
- No page changes — `getCollection()` calls remain the same
- The middleware intercepts and provides fresh data when needed

### CMS (`packages/core/`)
- Sync approve route bumps `content_version` in KV after approving
- New lightweight API endpoint: `GET /api/content-version`
- KV namespace shared with Astro site (or API-based check)

### Cloudflare config
- Shared KV namespace binding in both `wrangler.toml` files
- Or: Astro site calls CMS API for version check (simpler, no shared binding)

## Implementation Phases

### Phase 1: CMS version counter
- Add `content_version` KV key management
- Bump on Go Live approve
- `GET /api/content-version` endpoint

### Phase 2: Astro middleware
- `createFreshnessMiddleware()` in `@flare-cms/astro`
- Checks version, fetches fresh if stale
- Caches refreshed data for subsequent requests

### Phase 3: flareLoader integration
- Store version alongside collection data
- Expose version for middleware comparison
- Graceful fallback if KV/API unavailable (serve cached)

## What We Keep
- flareLoader for DX, type safety, Astro content layer integration
- `getCollection()` API in Astro pages (no page changes)
- Build-time data as the fast default

## What We Add
- Near-instant content updates after Go Live (~1-2 seconds)
- KV-based cache invalidation
- Zero rebuild required for content changes

## Dependencies
- No new packages
- Shared KV namespace (or cross-Worker API call)
- Builds on the staging/Sync feature (Go Live triggers the version bump)
