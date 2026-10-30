---
phase: 11-sandbox-foundation
plan: 02
subsystem: api
tags: [demo, middleware, rate-limiting, kv, hono, upload, sandbox]

requires:
  - phase: 11-sandbox-foundation
    plan: 01
    provides: demo-sandbox plugin, createDemoUser service with KV counter init (demo-mutations:{userId})

provides:
  - demoMutationGuard middleware: KV-based 50-mutation limit per demo session
  - demoUploadGuard middleware: image-only, 2MB max uploads for demo users
  - Variables interface updated with parsedFormData?: FormData
  - formData double-consumption solved via context variable

affects:
  - 12-demo-ui (demo status endpoint reads remaining mutations)
  - 13-demo-frontend (X-Demo-Mutations-Remaining header available for UI)

tech-stack:
  added: []
  patterns:
    - "Demo user detection via KV key existence (demo-mutations:{userId}), NOT role check"
    - "formData body-consumption: parse once in guard, store on context as parsedFormData, reuse downstream"
    - "Graceful degradation: both guards skip silently if CACHE_KV binding absent"

key-files:
  created:
    - packages/core/src/plugins/core-plugins/demo-sandbox/middleware.ts
  modified:
    - packages/core/src/app.ts
    - packages/core/src/routes/api-media.ts

key-decisions:
  - "Demo user detection uses KV key existence check, not role check — avoids false-positive on viewer role shared by API tokens and standard users"
  - "Middleware wired in app.ts (not in plugin index.ts) so guards apply to existing API routes (/api/content/*, /api/media/*)"
  - "demoUploadGuard parses formData and stores it on context as parsedFormData to prevent double body-consumption error downstream"
  - "Upload guard applied separately to /api/media/upload (not /api/media/*) to avoid interfering with non-upload media routes"

patterns-established:
  - "KV key existence as user-type flag: demo-mutations:{userId} present = demo user, absent = non-demo user"
  - "Context variable pattern for consumed request body: c.set('parsedFormData', formData) in guard, c.get('parsedFormData') ?? fallback in route"

duration: 3min
completed: 2026-03-16
---

# Phase 11 Plan 02: Demo Sandbox Middleware Summary

**KV-based mutation rate limiter (50/session) and image-only upload guard for demo users, with no impact on admin/editor/API token users**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T19:13:06Z
- **Completed:** 2026-03-16T19:15:43Z
- **Tasks:** 2
- **Files modified:** 3 (1 created)

## Accomplishments

- `demoMutationGuard` middleware counts writes via KV (POST/PUT/PATCH/DELETE), returns 429 at 50 with descriptive error
- `demoUploadGuard` middleware validates demo user uploads: images only, max 2MB, clear rejection messages
- Demo user detection uses KV key existence (`demo-mutations:{userId}`), not role — API token viewers and standard viewers pass through unaffected
- `parsedFormData` context variable pattern solves Hono's one-time body-consumption constraint

## Task Commits

Each task was committed atomically:

1. **Task 1: Mutation counter and upload guard middleware** - `635f414` (feat)
2. **Task 2: Wire middleware into app.ts, update media route and Variables type** - `700e4c2` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/core/src/plugins/core-plugins/demo-sandbox/middleware.ts` - `demoMutationGuard` and `demoUploadGuard` exports
- `packages/core/src/app.ts` - Import + apply guards on `/api/content/*`, `/api/media/*`, `/api/media/upload`; add `parsedFormData?: FormData` to Variables interface
- `packages/core/src/routes/api-media.ts` - Reuse `parsedFormData` from context when available in POST /upload handler

## Decisions Made

- **KV key existence check, not role check:** The `viewer` role is shared by API token users and standard registered users. Using role would incorrectly limit them. The KV key `demo-mutations:{userId}` only exists for users created via the demo signup flow.
- **Wire in app.ts, not plugin index:** Guards need to apply to existing routes (`/api/content/*`, `/api/media/*`). Plugin index is for plugin-specific routes that don't exist yet (Phase 12).
- **Separate upload guard path:** `/api/media/upload` gets `demoUploadGuard` applied specifically. Other `/api/media/*` paths (list, delete, etc.) only get the mutation guard.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing test failures (6 files, 11 tests) confirmed via `git stash` comparison — all failures existed before this plan and are unrelated to demo sandbox middleware.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Middleware is wired and tested; demo users (KV key present) are rate-limited and upload-restricted
- Phase 11 complete — Phase 12 (demo UI: signup page, routes, token return) can proceed
- The `X-Demo-Mutations-Remaining` response header is available for frontend use in Phase 13

---
*Phase: 11-sandbox-foundation*
*Completed: 2026-03-16*
