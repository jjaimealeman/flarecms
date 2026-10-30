---
phase: 14-reset-cleanup
plan: 01
subsystem: infra
tags: [cron, cloudflare-workers, d1, kv, demo-sandbox, scheduled-handler]

# Dependency graph
requires:
  - phase: 13-demo-page
    provides: demo-sandbox plugin, OTP auth, demo user creation, KV mutation tracking
  - phase: 11-demo-auth-plugin
    provides: demo user model (username LIKE 'demo-%'), KV key pattern (demo-mutations:{userId})
  - phase: 12-demo-sandbox-collection
    provides: demo-sandbox-collection with seed rows (IDs demo-sandbox-seed-1/2/3)
provides:
  - DemoResetService class with run(), resetSandboxContent(), purgeExpiredUsers()
  - 6-hour Cloudflare cron trigger ("0 */6 * * *") in wrangler.toml
  - Scheduled handler dispatch in cms/src/index.ts (cron-matched routing)
affects: [deploy, production-maintenance, demo-sandbox]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - cron-matched dispatch in scheduled() handler (controller.cron === '...' branching)
    - INSERT OR REPLACE for idempotent seed row restoration
    - FK-safe deletion order (content_versions before content, otp_codes before users)
    - Explicit IN-clause placeholders for D1 (no array bind support)
    - KV key absence as expiry signal (demo-mutations:{userId} TTL-based)

key-files:
  created:
    - packages/core/src/plugins/core-plugins/demo-sandbox/reset-service.ts
  modified:
    - packages/core/src/services/index.ts
    - packages/core/src/index.ts
    - packages/cms/src/index.ts
    - packages/cms/wrangler.toml

key-decisions:
  - "DemoResetService lives in core (not cms) so it can be tested and reused independently"
  - "KV key absence signals expiry (demo-mutations TTL 86400s); 48h age fallback for local dev where KV is absent"
  - "INSERT OR REPLACE (not INSERT OR IGNORE) restores seed rows even if visitor edited them"
  - "Cron dispatch via controller.cron string match — exact match to wrangler.toml expression"
  - "user_collection_permissions cleans via ON DELETE CASCADE; demo_signups.user_id is SET NULL (analytics preserved)"

patterns-established:
  - "Cron dispatch pattern: controller.cron === 'expression' in scheduled() handler"
  - "D1 batch() for multi-row INSERT OR REPLACE operations"

# Metrics
duration: 3min
completed: 2026-03-18
---

# Phase 14 Plan 01: Reset Cleanup Summary

**6-hour Cloudflare cron that resets demo-sandbox content to seed state and purges expired demo users via KV key absence detection**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-18T15:55:15Z
- **Completed:** 2026-03-18T15:58:17Z
- **Tasks:** 2 of 2
- **Files modified:** 5

## Accomplishments

- Created `DemoResetService` with `resetSandboxContent()` (FK-safe delete + INSERT OR REPLACE seed restore) and `purgeExpiredUsers()` (KV expiry detection + FK-safe user deletion)
- Wired 6-hour cron trigger `"0 */6 * * *"` in `wrangler.toml` alongside existing every-minute content scheduler
- Updated `cms/src/index.ts` scheduled handler to dispatch by `controller.cron` string match — DemoResetService for 6-hour reset, SchedulerService for all other crons
- Exported `DemoResetService` from `@flare-cms/core` via services/index.ts and index.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DemoResetService and export from core** - `507c176` (feat)
2. **Task 2: Wire cron trigger and scheduled handler dispatch** - `c43140e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/core/src/plugins/core-plugins/demo-sandbox/reset-service.ts` - DemoResetService class with run(), resetSandboxContent(), purgeExpiredUsers()
- `packages/core/src/services/index.ts` - Added DemoResetService export
- `packages/core/src/index.ts` - Added DemoResetService to named re-exports
- `packages/cms/src/index.ts` - Added DemoResetService import, cron-dispatched scheduled handler
- `packages/cms/wrangler.toml` - Added "0 */6 * * *" to crons array

## Decisions Made

- **KV expiry as signal**: KV key `demo-mutations:{userId}` has 86400s TTL. When gone, user is expired. No separate expiry timestamp needed.
- **48h fallback for local dev**: `CACHE_KV` is absent in `wrangler dev` without `--kv` binding. Fallback uses `created_at < Date.now() - 48h` to purge stale demo users.
- **INSERT OR REPLACE not INSERT OR IGNORE**: Seeds must be restored to their original content even if a demo visitor edited them.
- **Explicit IN placeholders**: D1 does not support binding arrays — built `IN (?, ?, ?)` with spread args.
- **user_collection_permissions cascade**: No explicit delete needed; FK ON DELETE CASCADE handles cleanup when user row is deleted.
- **demo_signups preserved**: `user_id` is SET NULL on delete, so signup analytics survive user purge.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing test failures (11 of 1539 tests) confirmed via `git stash` regression check — all 11 were failing before this plan and are unrelated to reset-service changes (auth-registration, auth-validation, admin-layout-catalyst, dynamic-field-extended, admin-plugins test suites).

## User Setup Required

None - no external service configuration required. The cron trigger is declared in wrangler.toml and activates automatically upon deployment.

## Next Phase Readiness

- Phase 14 Plan 01 is the only plan in this phase — phase is complete
- v2.1 Live Demo milestone is now fully shipped:
  - Phase 11: Demo auth plugin (OTP + demo user creation)
  - Phase 12: Demo sandbox collection (seeded content, RBAC middleware)
  - Phase 13: Demo page frontend + nav links
  - Phase 14: Auto-reset cron (this plan)
- Ready for v2.1 tag, merge to develop, and production deploy

---
*Phase: 14-reset-cleanup*
*Completed: 2026-03-18*
