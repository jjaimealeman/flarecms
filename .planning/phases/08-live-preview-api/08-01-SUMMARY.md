---
phase: 08-live-preview-api
plan: 01
subsystem: api
tags: [hono, kv, cloudflare, preview, draft]

# Dependency graph
requires:
  - phase: core-routes
    provides: Hono route patterns, requireAuth middleware, KV bindings
provides:
  - Draft content API endpoints (POST /api/preview/draft, GET /api/preview/draft/:token)
  - KV-based ephemeral draft storage with 5-min TTL
  - Deterministic preview key pattern (preview:{userId}:{collectionId}:{contentId})
affects: [08-02 preview page UI, 08-03 Astro preview route]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Selective auth: requireAuth as inline middleware on POST only, GET unauthenticated for cross-origin access"
    - "Deterministic KV keys for preview drafts: preview:{userId}:{collectionId}:{contentId}"

key-files:
  created:
    - packages/core/src/routes/admin-preview.ts
  modified:
    - packages/core/src/routes/index.ts
    - packages/core/src/app.ts

key-decisions:
  - "GET /draft/:token is unauthenticated -- token acts as auth for cross-origin Astro iframe"
  - "KV key is deterministic per user/collection/content to prevent race conditions from rapid typing"
  - "Mount only at /api/preview (not /admin/preview) -- preview page route deferred to Plan 02"

patterns-established:
  - "Selective middleware: requireAuth() applied per-route not per-router for mixed auth endpoints"

# Metrics
duration: 2min
completed: 2026-03-09
---

# Phase 8 Plan 1: Draft Content API Summary

**KV-backed draft API with POST (auth-protected) and GET (token-based) endpoints at /api/preview/draft for live preview**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T15:13:58Z
- **Completed:** 2026-03-09T15:16:18Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- POST /api/preview/draft stores draft JSON in KV with 5-min TTL, returns deterministic token
- GET /api/preview/draft/:token retrieves draft without auth (cross-origin safe for Astro iframe)
- Route exported from core and mounted in app following existing codebase conventions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Draft API route file** - `f1b588f` (feat)
2. **Task 2: Register route in core exports and app** - `c456dd7` (feat)

## Files Created/Modified
- `packages/core/src/routes/admin-preview.ts` - Draft API endpoints (POST + GET)
- `packages/core/src/routes/index.ts` - Added adminPreviewRoutes export and ROUTES_INFO entry
- `packages/core/src/app.ts` - Imported and mounted at /api/preview

## Decisions Made
- GET /draft/:token is unauthenticated -- the token itself is the credential (opaque, short-lived). This enables cross-origin Astro iframe to fetch drafts without CMS JWT cookies.
- Mounted at /api/preview only (not /admin/preview) -- the preview page HTML route will be added in Plan 02.
- Used inline `requireAuth()` middleware on POST only rather than blanket `app.use('*', requireAuth())` to allow unauthenticated GET.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Draft API ready for Plan 02 (preview page UI) to POST draft data from admin editor
- Draft API ready for Plan 03 (Astro preview route) to GET draft data via token
- CACHE_KV binding already configured in wrangler.toml

---
*Phase: 08-live-preview-api*
*Completed: 2026-03-09*
