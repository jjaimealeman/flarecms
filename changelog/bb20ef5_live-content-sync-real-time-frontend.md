# 2026-03-13 - Live Content Sync: Real-Time Frontend Updates

**Keywords:** [LIVE] [SSR] [CACHE] [SYNC] [ASTRO] [FRONTEND]
**Session:** Evening, Duration (~2 hours)
**Commit:** bb20ef5

## What Changed

- File: `packages/astro/src/live-loader.ts`
  - Import `LiveLoader` type from `astro/loaders` (was inline interface)
  - Added try/catch with console logging for debugging
  - Fixed TypeScript filter type narrowing
- File: `packages/core/src/routes/admin-sync.ts`
  - Added `content_version` KV counter (`flare:content_version` key)
  - New public endpoint `GET /api/content-version` (no auth, for frontend freshness check)
  - Bumps content version on both single approve and approve-all
  - Fixed cache invalidation: now clears BOTH `content` and `api` cache instances
  - Switched from glob-pattern invalidation to `invalidate('*')` on both caches
  - Explicit per-route auth middleware instead of blanket `/*`
- File: `packages/core/src/routes/admin-content.ts`
  - Direct content saves (admin bypass) also bump `content_version` in KV
- File: `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts`
  - Increased diff value truncation from 80 to 300 chars
- File: `packages/site/astro.config.mjs`
  - Enabled `experimental.liveContentCollections`
- File: `packages/site/src/live.config.ts` (NEW)
  - All 5 collections defined with `defineLiveCollection` + `flareLiveLoader`
  - Required by Astro: live collections must live in `live.config.ts`, not `content.config.ts`
- File: `packages/site/src/content.config.ts`
  - Emptied — all collections moved to `live.config.ts`
- File: `packages/site/src/pages/*.astro` (9 files)
  - Switched from `getCollection()` to `getLiveCollection()` with safety fallbacks
  - Pattern: `(await getLiveCollection('x'))?.entries || []`
- File: `.planning/future/live-content-sync.md` (NEW)
  - Full PRD for the live content sync feature

## Why

The Astro frontend was serving stale cached content even after Go Live approved revisions. Content collections with `flareLoader` fetched at build time and cached — defeating the purpose of SSR. Tony at Tony's Pizza updates his Football Game Special and needs it live in seconds, not after a rebuild.

The fix: switch to Astro's experimental `liveContentCollections` with `flareLiveLoader` which fetches from the CMS API at request time. Combined with proper cache invalidation (clearing both admin content cache AND public API cache), content updates are now visible on the frontend with a simple browser refresh.

## Issues Encountered

- `defineLiveCollection` must be in `src/live.config.ts` not `src/content.config.ts` (Astro enforces this)
- `getLiveCollection()` returns `{ entries, error }` not a plain array — all pages needed safety fallbacks
- API routes use `CACHE_CONFIGS.api` (keyPrefix: `api`), not `CACHE_CONFIGS.content` — the approve route was clearing the wrong cache instance for 3 debugging rounds

## Dependencies

No dependencies added

## Testing Notes

- What was tested: Full E2E flow — edit published content in admin, Go Live, refresh frontend, see updated content instantly
- What wasn't tested: Production deployment (Cloudflare Pages with live collections), error handling when CMS is unreachable
- Edge cases: Empty collections (safety fallbacks handle this), concurrent edits

## Next Steps

- [ ] Test production deployment with live content collections
- [ ] Remove debug console.log from live-loader.ts before production
- [ ] Consider KV-based caching layer for high-traffic sites (version check optimization)

---

**Branch:** feature/live-content-sync
**Issue:** N/A
**Impact:** HIGH - fundamental architecture change from build-time to request-time content fetching
