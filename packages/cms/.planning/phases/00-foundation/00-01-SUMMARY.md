---
phase: 00-foundation
plan: 01
subsystem: infra
tags: [cloudflare-workers, wrangler, hono, middleware, r2, d1, bindings]

# Dependency graph
requires: []
provides:
  - Correct R2 binding name (MEDIA_BUCKET) matching @sonicjs-cms/core Bindings interface
  - Startup binding validation middleware that fails fast on missing D1/R2
  - Staging environment block in wrangler.toml for migration testing
affects: [00-02, 00-03, phase-1, phase-2, phase-3]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hono middleware factory pattern: function returning async middleware fn"
    - "Fail-fast binding validation on every request startup"

key-files:
  created:
    - src/middleware/validate-bindings.ts
  modified:
    - wrangler.toml
    - src/index.ts

key-decisions:
  - "MEDIA_BUCKET chosen over BUCKET to match @sonicjs-cms/core Bindings interface exactly"
  - "CACHE_KV treated as optional (warn only) to avoid blocking requests when KV not provisioned"
  - "Middleware cast to MiddlewareFn type alias to satisfy SonicJS beforeAuth array type"
  - "Staging DB ID is a placeholder — created in Plan 03 via wrangler d1 create"

patterns-established:
  - "Middleware pattern: validate-bindings.ts exports a factory function returning the actual middleware"
  - "Config wiring: middleware.beforeAuth in SonicJSConfig is the injection point for startup checks"

# Metrics
duration: 8min
completed: 2026-03-01
---

# Phase 0 Plan 01: Fix R2 Binding and Add Startup Validation Summary

**R2 binding renamed BUCKET -> MEDIA_BUCKET to match SonicJS core interface, plus fail-fast middleware checking DB/MEDIA_BUCKET on every request with optional CACHE_KV warning**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-01T00:00:00Z
- **Completed:** 2026-03-01T00:08:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Fixed the silent R2 binding mismatch that caused cryptic media upload failures (`BUCKET` -> `MEDIA_BUCKET`)
- Created `validate-bindings.ts` middleware that returns 500 with clear error when DB or MEDIA_BUCKET missing
- Added staging environment block to wrangler.toml with placeholder D1 ID (to be replaced in Plan 03)
- Wired validation middleware into SonicJS config via `middleware.beforeAuth`

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix R2 binding and add staging environment** - `3bfc4e4` (fix)
2. **Task 2: Create binding validation middleware and wire into SonicJS config** - `ad3a4c2` (feat)

**Plan metadata:** (see docs commit below)

## Files Created/Modified
- `wrangler.toml` - R2 binding renamed to MEDIA_BUCKET; staging env block added with placeholder DB ID
- `src/middleware/validate-bindings.ts` - Startup binding validation middleware (DB required, MEDIA_BUCKET required, CACHE_KV optional/warn)
- `src/index.ts` - Import and wire validateBindingsMiddleware via config.middleware.beforeAuth

## Decisions Made
- **CACHE_KV is optional**: KV caching is deferred to Phase 3; making it required would break dev/staging before that phase runs. Warn only.
- **Middleware factory pattern**: `validateBindingsMiddleware()` is a factory returning the middleware fn, not the fn itself. This matches Hono conventions and keeps the API extensible for future config params.
- **MiddlewareFn type alias**: SonicJS `beforeAuth` expects `Promise<void>` return, but `c.json()` returns a typed Response. Used `await c.json(...); return` pattern to satisfy the type contract without unsafe casts.
- **Staging D1 placeholder**: The staging DB ID is `REPLACE_WITH_STAGING_DB_ID` — intentional. Will be replaced in Plan 03 when `wrangler d1 create my-astro-cms-db-staging` is run.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Middleware return type mismatch with SonicJS beforeAuth signature**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** `c.json()` returns `JSONRespondReturn<..., 500>` but `beforeAuth` expects `Promise<void>`. Using `return c.json(...)` caused TS2322 type error.
- **Fix:** Added `MiddlewareFn` type alias matching the SonicJS signature; restructured to `await c.json(...); return` so function always returns `void`.
- **Files modified:** src/middleware/validate-bindings.ts
- **Verification:** `tsc --noEmit` shows zero errors in new/modified files after fix
- **Committed in:** ad3a4c2 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor type fix required to satisfy SonicJS middleware interface. No scope creep. Behavior is identical to plan spec.

## Issues Encountered
- Pre-existing TypeScript error in `src/collections/blog-posts.collection.ts` (`type: 'quill'` not assignable to `FieldType`). This is a known SonicJS v2.8.0 type definition issue documented in `SONICJS-ISSUES.md`. Not introduced by this plan.

## User Setup Required
None - no external service configuration required. Staging D1 creation is handled in Plan 03.

## Next Phase Readiness
- wrangler.toml is correct and ready for Plans 02 and 03
- Binding validation will surface misconfigured environments immediately on request
- Staging environment is scaffolded (DB placeholder to be replaced in Plan 03)
- Pre-existing `quill` type error in blog-posts collection should be tracked — may need upstream fix or type assertion

---
*Phase: 00-foundation*
*Completed: 2026-03-01*
