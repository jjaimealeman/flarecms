---
phase: 05-production-deployment
plan: 01
subsystem: infra
tags: [logging, observability, workers-logs, cloudflare, structured-logging]

# Dependency graph
requires:
  - phase: 04-hook-system-integration
    provides: content mutation hooks wired in api-content-crud.ts - same routes now get log calls
  - phase: 01-security-hardening
    provides: auth middleware (requireAuth/requireRole) - middleware/auth.ts now has permission_denied logging
provides:
  - Structured logger utility (lib/logger.ts) with log.info/warn/error producing JSON for Workers Logs
  - Auth event logging: auth.login, auth.login_failed, auth.register, auth.logout
  - Permission event logging: auth.permission_denied (in requireRole middleware)
  - Content mutation logging: content.created, content.updated, content.published, content.unpublished, content.deleted
  - Content access denied logging: content.access_denied (API token scope enforcement)
affects:
  - Phase 5 remaining plans (DEPLOY-04 Workers Logs observability)
  - Any future plans adding new route handlers (should import log from lib/logger)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Structured JSON logging via JSON.stringify to console methods — Workers Logs indexes fields automatically"
    - "Non-blocking log placement: log calls placed AFTER successful DB ops, BEFORE response return"
    - "log.info for success events, log.warn for security events (failed login, permission denied)"
    - "ts field (epoch ms) in every log entry for Workers Logs correlation"

key-files:
  created:
    - sonicjs-fork/packages/core/src/lib/logger.ts
  modified:
    - sonicjs-fork/packages/core/src/index.ts
    - sonicjs-fork/packages/core/src/routes/auth.ts
    - sonicjs-fork/packages/core/src/routes/api.ts
    - sonicjs-fork/packages/core/src/routes/api-content-crud.ts
    - sonicjs-fork/packages/core/src/middleware/auth.ts

key-decisions:
  - "Content CRUD log calls placed in api-content-crud.ts (not api.ts) — that is where the actual handlers live; api.ts got import + content.access_denied for token scope denials"
  - "logout route lacks user context (no requireAuth) — log.info('auth.logout') includes only IP, no userId"
  - "log.warn used for login_failed and permission_denied — security events that should be visible as warnings"
  - "No try/catch around log calls — console methods don't throw, non-blocking by design"

patterns-established:
  - "Pattern: import { log } from '../lib/logger' in any route/middleware file that needs observability"
  - "Pattern: log event names use dot notation (domain.event) — auth.login, content.created"
  - "Pattern: always include userId, relevant IDs, and IP where available as log fields"

# Metrics
duration: 8min
completed: 2026-03-02
---

# Phase 5 Plan 01: Structured Logging for Workers Logs Observability Summary

**Lightweight JSON logger utility added to sonicjs-fork, with auth events (login/failed/register/permission_denied) and content mutations (created/updated/published/unpublished/deleted) emitting structured fields that Workers Logs indexes automatically**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-02T18:26:41Z
- **Completed:** 2026-03-02T18:34:56Z
- **Tasks:** 2
- **Files modified:** 5 (+ 1 created)

## Accomplishments
- Created `lib/logger.ts` with `log.info`, `log.warn`, `log.error` — each produces `JSON.stringify({ level, event, ts, ...fields })` to the appropriate console method
- Instrumented all 5 auth events: `auth.login` (success with userId/email/IP), `auth.login_failed` (with reason: user_not_found or invalid_password), `auth.register`, `auth.logout`, `auth.permission_denied` (in requireRole middleware)
- Instrumented all 5 content mutation events: `content.created`, `content.updated`, `content.published`, `content.unpublished`, `content.deleted` — each includes contentId, collectionId, userId

## Task Commits

Each task was committed atomically:

1. **Task 1: Create structured logger utility** - `505a7594` (feat)
2. **Task 2: Instrument auth and content routes** - `44d185b8` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `sonicjs-fork/packages/core/src/lib/logger.ts` - Lightweight structured logger (new file)
- `sonicjs-fork/packages/core/src/index.ts` - Added `export { log } from './lib/logger'`
- `sonicjs-fork/packages/core/src/routes/auth.ts` - auth.login, auth.login_failed, auth.register, auth.logout log calls
- `sonicjs-fork/packages/core/src/routes/api.ts` - content.access_denied log call for API token scope denial
- `sonicjs-fork/packages/core/src/routes/api-content-crud.ts` - content.created/updated/published/unpublished/deleted log calls
- `sonicjs-fork/packages/core/src/middleware/auth.ts` - auth.permission_denied log call in requireRole

## Decisions Made
- Content CRUD log calls live in `api-content-crud.ts` (not `api.ts`) — that is where POST/PUT/DELETE handlers are. api.ts got the import and a `content.access_denied` log for API token scope enforcement, satisfying the must_have artifact check.
- `log.warn` used for security events (login failures, permission denied); `log.info` for normal operations.
- logout route has no `requireAuth()`, so no userId is available — logged with IP only.
- No try/catch wrapping log calls — `console.*` methods never throw; log calls are inherently non-blocking.

## Deviations from Plan

None - plan executed exactly as written. The only minor note: the plan mentioned `routes/api.ts` as the content mutation file but actual handlers are in `api-content-crud.ts` (which is imported into api.ts). Both files now import and use the logger.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Workers Logs is already enabled via `observability.enabled = true` in `my-astro-cms/wrangler.toml`.

## Next Phase Readiness
- Logger utility ready for use in any future route handlers — just `import { log } from '../lib/logger'`
- Auth and content events will appear in Workers Logs dashboard after next `wrangler deploy`
- DEPLOY-04 observability requirement satisfied: structured JSON fields indexed automatically by Workers Logs

---
*Phase: 05-production-deployment*
*Completed: 2026-03-02*
