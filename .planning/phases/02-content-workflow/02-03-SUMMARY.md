---
phase: 02-content-workflow
plan: 03
subsystem: audit, database, api, admin
tags: [workflow_history, audit-trail, field-diff, D1, sqlite, alter-table]

# Dependency graph
requires:
  - phase: 02-02
    provides: Content state machine with status transitions already enforced
  - phase: 02-06
    provides: RBAC guards already in API and admin routes (same files wired here)
provides:
  - logStatusChange() — records every status transition with user_id, fromStatus, toStatus, timestamp
  - logContentEdit() — records field-level diffs with old/new values per changed field
  - computeFieldDiff() — helper that computes changed fields between two content snapshots
  - workflow_history schema extended with changed_fields TEXT and action_type TEXT columns
  - Full audit trail wired into POST and PUT in both API and admin routes
affects: [phase-03-scheduling, phase-04-webhooks, phase-05-reporting, future-audit-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Audit-as-service: all audit calls go through service functions, never raw SQL in routes
    - Non-blocking audit: every audit call wrapped in try/catch — log failure never blocks request
    - Field-level diff: computeFieldDiff compares flattened content snapshots (top-level + data fields)
    - action_type column distinguishes 'status_change' from 'content_edit' for query filtering

key-files:
  created:
    - sonicjs-fork/packages/core/src/services/audit-trail.ts
  modified:
    - sonicjs-fork/packages/core/src/services/index.ts
    - sonicjs-fork/packages/core/src/index.ts
    - sonicjs-fork/packages/core/src/routes/api-content-crud.ts
    - sonicjs-fork/packages/core/src/routes/admin-content.ts

key-decisions:
  - "Non-blocking audit: audit failures are logged but never surface as HTTP errors"
  - "logContentEdit uses from_status=to_status (current status) — content_edit is not a status transition"
  - "computeFieldDiff flattens title/slug from top-level plus all data fields into one snapshot for diffing"
  - "Admin route replaced raw workflow_history INSERT with logStatusChange() for consistency"

patterns-established:
  - "Audit calls: always try/catch with console.error('[audit] ...) — non-blocking"
  - "Field diff: spread existing data, override with updated values, pass all known field keys"

# Metrics
duration: 10min
completed: 2026-03-02
---

# Phase 2 Plan 03: Workflow History Audit Trail Summary

**Audit trail service with field-level diffs wired into all content create/update paths in API and admin routes, with workflow_history schema extended to capture action_type and changed_fields**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-02T07:03:00Z
- **Completed:** 2026-03-02T07:13:36Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Extended `workflow_history` table with `changed_fields TEXT` and `action_type TEXT DEFAULT 'status_change'` columns via D1 ALTER TABLE
- Created `services/audit-trail.ts` with three exported functions: `logStatusChange`, `logContentEdit`, `computeFieldDiff`
- Wired audit logging into POST and PUT handlers in both `api-content-crud.ts` and `admin-content.ts`
- All audit calls are non-blocking (wrapped in try/catch) so audit failures never disrupt content operations
- Admin route's raw `workflow_history` INSERT replaced with structured `logStatusChange()` call for consistency

## Task Commits

Each task was committed atomically (within sonicjs-fork repo):

1. **Task 1: Migrate workflow_history schema and create audit trail service** - `fbd4e485` (feat)
2. **Task 2: Wire audit trail into API and admin content routes** - `e4985bcb` (feat)

**Plan metadata:** (see docs commit below)

## Files Created/Modified

- `sonicjs-fork/packages/core/src/services/audit-trail.ts` - New service: logStatusChange, logContentEdit, computeFieldDiff
- `sonicjs-fork/packages/core/src/services/index.ts` - Added audit-trail exports
- `sonicjs-fork/packages/core/src/index.ts` - Added audit-trail re-exports to core package
- `sonicjs-fork/packages/core/src/routes/api-content-crud.ts` - Import + call audit functions in POST and PUT
- `sonicjs-fork/packages/core/src/routes/admin-content.ts` - Import + call audit functions in POST and PUT

## Decisions Made

- **Non-blocking audit design:** Audit failures must never break content operations. Every `logStatusChange` and `logContentEdit` call is wrapped in `try/catch` with a console.error. This is correct for production — audit infrastructure may lag, but content must flow.
- **logContentEdit uses from_status = to_status:** A content_edit entry records what the content's status was at time of edit, not a transition. Both status columns hold the current status, which is semantically correct.
- **computeFieldDiff flattens content structure:** Title and slug live at the top level of the content row, but other fields live inside `data` JSON. The diff helper builds a unified snapshot merging both, so all user-visible field changes are captured in one diff record.
- **Admin raw INSERT replaced:** The admin POST handler had a raw `INSERT INTO workflow_history` for content creation. This was replaced with `logStatusChange()` to ensure `action_type` is set consistently. The raw insert would leave `action_type = NULL` on old schema rows.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **sonicjs-fork is a separate git repository:** The parent repo at `/home/jaime/www/_github/sonicjs` does not track `sonicjs-fork/` — the fork has its own `.git`. All commits for Task 1 and Task 2 were made within the `sonicjs-fork` repo, consistent with prior phase work patterns.
- **audit-trail.ts committed under prior label:** The Task 1 source file was included in commit `fbd4e485` (labeled `feat(02-05)`) because it was staged during a prior dist rebuild session. The service was created fresh in this execution and is present in git as expected.

## User Setup Required

None - no external service configuration required. Schema migration runs against local D1 automatically.

Note: The `workflow_history` schema changes (ALTER TABLE) were applied to local D1 only. Before staging/production deployment, run:
```bash
npx wrangler d1 execute DB --remote --command "ALTER TABLE workflow_history ADD COLUMN changed_fields TEXT;"
npx wrangler d1 execute DB --remote --command "ALTER TABLE workflow_history ADD COLUMN action_type TEXT DEFAULT 'status_change';"
```

## Next Phase Readiness

- Audit trail foundation is complete — every content operation now leaves a trace
- `workflow_history` can be queried by `action_type` to separate status transitions from field edits
- `changed_fields` JSON enables future UI to show "what changed" in audit log view
- Phase 04 (scheduling) and Phase 05 (webhooks) can use audit trail to track automated status transitions

---
*Phase: 02-content-workflow*
*Completed: 2026-03-02*
