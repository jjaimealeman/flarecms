---
phase: 13-demo-page
plan: 01
subsystem: auth
tags: [cors, jwt, hono, cross-origin, cookie, demo-sandbox]

# Dependency graph
requires:
  - phase: 12-demo-authentication
    provides: POST /demo/auth/request and POST /demo/auth/verify endpoints, demo-sandbox plugin, OTP auth flow

provides:
  - CORS middleware on demoAuthAPI allowing flarecms.dev and localhost:4321
  - token field in POST /verify response (JWT in response body for cross-origin callers)
  - GET /demo/auth/exchange endpoint (JWT validation, cookie setting, /admin redirect)
  - Production CORS_ORIGINS including flarecms.dev in wrangler.toml

affects:
  - 13-demo-page plan 02 (Astro demo.astro page that calls /demo/auth/request and redirects to /demo/auth/exchange)

# Tech tracking
tech-stack:
  added: [hono/cors]
  patterns:
    - Cross-domain auth handoff via token-in-URL exchange (SameSite=Strict cookie limitation workaround)
    - CORS middleware registered before route handlers on Hono sub-app

key-files:
  created: []
  modified:
    - packages/core/src/plugins/core-plugins/demo-sandbox/index.ts
    - packages/cms/wrangler.toml

key-decisions:
  - "Exchange endpoint validates JWT then sets same-site cookies to bridge cross-origin gap (SameSite=Strict cannot be set cross-origin)"
  - "CORS credentials:true required so Astro site fetch includes cookies for session continuity"
  - "token field added to verify response body (not header) so cross-origin JS can read it"
  - "Exchange invalid/expired token redirects to flarecms.dev/demo?error=invalid_token (not a 4xx) to give user a friendly recovery path"
  - "flarecms.dev added alongside flare-site.pages.dev as CORS_ORIGINS fallback retained"

patterns-established:
  - "Cross-domain cookie handoff: verify response carries token in body, Astro redirects to /exchange?token=JWT, Worker sets cookies same-origin"
  - "GET exchange route: verify JWT with hono/jwt verify(), set httpOnly auth_token + JS-readable csrf_token, redirect to /admin"

# Metrics
duration: 5min
completed: 2026-03-16
---

# Phase 13 Plan 01: Demo Page Backend Wiring Summary

**CORS middleware + token-in-body exchange pattern enabling cross-domain OTP auth handoff from flarecms.dev Astro site to admin.flarecms.dev Worker**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-16T21:33:02Z
- **Completed:** 2026-03-16T21:38:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `hono/cors` middleware to `demoAuthAPI` allowing `http://localhost:4321` and `https://flarecms.dev` with credentials
- Added `token: demoToken` field to POST /verify response so cross-origin callers can receive the JWT in the response body (SameSite=Strict cookies cannot be set cross-origin)
- Added GET /demo/auth/exchange endpoint that validates the JWT, sets httpOnly auth_token and JS-readable csrf_token cookies same-origin, then redirects to /admin
- Updated production `CORS_ORIGINS` in wrangler.toml to include `https://flarecms.dev` alongside the existing pages.dev fallback

## Task Commits

Each task was committed atomically:

1. **Task 1: CORS, token field, and exchange endpoint** - `cc5d475` (feat)
2. **Task 2: Update production CORS_ORIGINS** - `c1af35d` (chore)

**Plan metadata:** (created after summary)

## Files Created/Modified

- `packages/core/src/plugins/core-plugins/demo-sandbox/index.ts` - Added cors import, CORS middleware, verify import, token field in verify response, GET /exchange route
- `packages/cms/wrangler.toml` - Added https://flarecms.dev to production CORS_ORIGINS

## Decisions Made

- **Cross-domain cookie handoff pattern:** SameSite=Strict cookies cannot be set via cross-origin fetch. Solution: verify returns the JWT in the response body; Astro reads it and redirects the browser to `/demo/auth/exchange?token=JWT`; the Worker receives a same-origin request (browser navigating to admin.flarecms.dev), sets httpOnly cookies, and redirects to /admin.
- **Token in response body (not header):** Cross-origin fetch can read response body when CORS + credentials are configured. Custom headers require explicit `Access-Control-Expose-Headers`.
- **Redirect on exchange error:** Invalid or expired JWT returns a 302 to `flarecms.dev/demo?error=invalid_token` rather than a 4xx, giving the user a graceful recovery path back to the demo page.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - build passed on first attempt with no TypeScript errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CMS backend is fully wired for cross-domain demo auth
- Plan 02 (Astro demo.astro page) can now implement the fetch flow:
  1. POST to `/demo/auth/request` (cross-origin fetch with credentials)
  2. POST to `/demo/auth/verify` — read `token` from response body
  3. `window.location = 'https://admin.flarecms.dev/demo/auth/exchange?token=' + token`
- No blockers

---
*Phase: 13-demo-page*
*Completed: 2026-03-16*
