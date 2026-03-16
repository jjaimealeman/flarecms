---
phase: 10-workflow-engine-activation
plan: "03"
subsystem: workflow
tags: [hono, workflow, routing, sidebar, catalyst, requireAuth, drizzle, d1]

# Dependency graph
requires:
  - phase: 10-01
    provides: type-safe workflow services (workflow-service.ts, content-workflow.ts)
  - phase: 10-02
    provides: Catalyst-layout workflow admin templates (dashboard, scheduled, content-detail)
provides:
  - Workflow routes mounted at /api/workflow/* and /admin/workflow/*
  - "Workflow" sidebar nav item in Catalyst layout (admin/editor roles)
  - Workflow enrollment wired into content creation and status changes
  - Dashboard auto-backfill for unenrolled existing content
affects:
  - Any future phase adding new admin routes (follow requireAuth pattern)
  - Notification center / badge feature (NotificationService ready, UI deferred)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "requireAuth() applied at router level in route factory functions"
    - "LEFT JOIN users on workflow history queries (users may not exist)"
    - "Auto-create default workflow per collection if missing on enrollment"
    - "Dashboard backfill pattern: enroll unenrolled content on page load"

key-files:
  created: []
  modified:
    - packages/core/src/app.ts
    - packages/core/src/templates/icons.ts
    - packages/core/src/templates/layouts/admin-layout-catalyst.template.ts
    - packages/core/src/plugins/core-plugins/workflow-plugin/routes.ts
    - packages/core/src/plugins/core-plugins/workflow-plugin/admin-routes.ts
    - packages/core/src/plugins/core-plugins/workflow-plugin/services/workflow-service.ts
    - packages/core/src/plugins/core-plugins/workflow-plugin/services/content-workflow.ts
    - packages/core/src/routes/api-content-crud.ts

key-decisions:
  - "requireAuth() added to both workflow route factories (routes.ts + admin-routes.ts) — routes checked c.get('user') but JWT was never decoded without middleware"
  - "initializeContentWorkflow auto-creates a default workflow per collection if none exists — prevents enrollment failures on fresh installs"
  - "Dashboard backfills unenrolled content on load — no migration needed, works retroactively"
  - "workflow_history actual columns are action, from_status, to_status — not from_state_id, to_state_id, workflow_id as originally coded"
  - "LEFT JOIN users on workflow history (not INNER JOIN) — users table may lack rows for older history entries"
  - "getAvailableTransitions receives user.role string — consistent with 10-01 decision"

patterns-established:
  - "Route factories call requireAuth() as first middleware — matching all other admin route files"
  - "Content CRUD hooks enroll items in workflow immediately after creation"

# Metrics
duration: 20min
completed: 2026-03-15
---

# Phase 10 Plan 03: Wire Routes and Sidebar Summary

**Workflow engine fully activated: routes mounted at /api/workflow/* and /admin/workflow/*, Catalyst sidebar navigation added, enrollment wired into content CRUD, with four auto-fixes for missing auth middleware, broken column names, and JOIN type**

## Performance

- **Duration:** ~20 min (including multiple fix iterations with user)
- **Started:** 2026-03-15
- **Completed:** 2026-03-15
- **Tasks:** 1 auto + 1 human-verify checkpoint
- **Files modified:** 8

## Accomplishments

- Workflow API routes registered at `/api/workflow/*` and admin routes at `/admin/workflow/*` in `app.ts`
- "Workflow" nav item added to Catalyst sidebar between Analytics and System section, gated to admin/editor roles
- Workflow enrollment automatically triggered on content creation and status changes via `api-content-crud.ts` hooks
- Four bugs discovered and fixed during activation: missing auth middleware, missing default workflow creation, broken `workflow_history` column names, and INNER JOIN crash on content detail page

## Task Commits

Each task was committed atomically:

1. **Task 1: Register workflow routes in app.ts and add sidebar navigation** - `d91dbc0` (feat)
2. **[Fix] Add requireAuth() middleware to workflow route files** - `07a9b9a` (fix)
3. **[Fix] Wire workflow enrollment into content creation + auto-create default workflow** - `24d4e1c` (feat)
4. **[Fix] Fix 500 on content detail page — LEFT JOIN users instead of INNER JOIN** - `bd3f58b` (fix)
5. **[Fix] Align workflow_history queries with actual DB schema columns** - `b329c5f` (fix)

**Plan metadata:** (pending — this SUMMARY.md commit)

## Files Created/Modified

- `packages/core/src/app.ts` — Added imports for createWorkflowRoutes/createWorkflowAdminRoutes, registered routes at /api/workflow and /admin/workflow
- `packages/core/src/templates/icons.ts` — Added GitBranch icon export
- `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts` — Added Workflow nav item between Analytics and System section
- `packages/core/src/plugins/core-plugins/workflow-plugin/routes.ts` — Added requireAuth() middleware to API route factory
- `packages/core/src/plugins/core-plugins/workflow-plugin/admin-routes.ts` — Added requireAuth() middleware, backfill logic for unenrolled content, error handling, LEFT JOIN fix
- `packages/core/src/plugins/core-plugins/workflow-plugin/services/workflow-service.ts` — Auto-create default workflow if missing, fix workflow_history column names (action/from_status/to_status)
- `packages/core/src/plugins/core-plugins/workflow-plugin/services/content-workflow.ts` — Fix workflow_history column names to match actual DB schema
- `packages/core/src/routes/api-content-crud.ts` — Wired workflow enrollment into content create and status change handlers

## Decisions Made

- **requireAuth() at router level:** Both workflow route factories now call `requireAuth()` as their first middleware. The routes referenced `c.get('user')` but the JWT was never decoded because no auth middleware was applied — matching the pattern used by all other admin route files.
- **Auto-create default workflow:** `initializeContentWorkflow` now creates a default draft→published workflow per collection if none exists. This prevents enrollment failures on fresh installs or collections that predate the workflow engine.
- **Dashboard backfill:** The workflow dashboard auto-enrolls any unenrolled content on page load. No data migration required — retroactive and zero-config.
- **workflow_history column names:** The actual DB schema (from 10-01 migration) uses `action`, `from_status`, `to_status`. The original service code used `from_state_id`, `to_state_id`, `workflow_id` which don't exist, causing all history queries to fail silently or error.
- **LEFT JOIN users:** Content detail page used INNER JOIN to fetch the assignee/reviewer name from users. LEFT JOIN is correct because history rows may reference user IDs that no longer exist in the users table.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added requireAuth() middleware to workflow routes**
- **Found during:** Task 1 (route registration) — discovered during user verification at checkpoint
- **Issue:** Routes called `c.get('user')` to check role but requireAuth() was never applied, so the JWT was never decoded. All workflow endpoints were effectively unauthenticated.
- **Fix:** Added `requireAuth()` as first middleware in both `createWorkflowRoutes()` and `createWorkflowAdminRoutes()` factory functions
- **Files modified:** routes.ts, admin-routes.ts
- **Verification:** Workflow dashboard loaded correctly after auth fix
- **Committed in:** 07a9b9a

**2. [Rule 1 - Bug] Fixed initializeContentWorkflow failing when no default workflow exists**
- **Found during:** After auth fix — enrollment was failing silently for new/unenrolled content
- **Issue:** `initializeContentWorkflow` assumed a workflow already existed per collection; returned early without enrolling if none found
- **Fix:** Added auto-create logic for a default draft→published workflow when none exists for a collection; also wired enrollment calls into content create and status change handlers in api-content-crud.ts
- **Files modified:** workflow-service.ts, api-content-crud.ts, admin-routes.ts (backfill)
- **Verification:** Dashboard showed correct counts (Draft: 1, Published: 10) after fix
- **Committed in:** 24d4e1c

**3. [Rule 1 - Bug] Fixed 500 on content detail page from INNER JOIN on users**
- **Found during:** Clicking a content item in the workflow dashboard
- **Issue:** Content detail query used INNER JOIN on users table for assignee/reviewer; workflow_history rows with missing user references caused a 500
- **Fix:** Changed to LEFT JOIN users — returns null for missing users rather than failing the query; pass user.role to getAvailableTransitions
- **Files modified:** admin-routes.ts
- **Verification:** Content detail page loaded with status, history, assignment, and scheduling panels
- **Committed in:** bd3f58b

**4. [Rule 1 - Bug] Aligned workflow_history column names with actual DB schema**
- **Found during:** Content detail page and dashboard history queries
- **Issue:** Service code used column names `from_state_id`, `to_state_id`, `workflow_id` — none of which exist in the actual DB schema. Actual columns are `action`, `from_status`, `to_status` (as created by the 10-01 migration)
- **Fix:** Updated all `workflow_history` SELECT/INSERT queries in workflow-service.ts and content-workflow.ts to use the correct column names
- **Files modified:** workflow-service.ts, content-workflow.ts
- **Verification:** History panel loaded correctly on content detail page
- **Committed in:** b329c5f

---

**Total deviations:** 4 auto-fixed (1 missing critical, 3 bugs)
**Impact on plan:** All four fixes were required for the workflow engine to function at all. The missing auth middleware was a security issue; the remaining three were runtime failures that would have surfaced immediately in production. No scope creep — all fixes are directly within the workflow plugin boundary.

## Issues Encountered

- The workflow_history column name mismatch (from_state_id vs from_status etc.) was a pre-existing inconsistency between the migration schema (10-01) and the service layer code. It was hidden during 10-01 and 10-02 because those plans never executed live queries against the table.
- Notification bell UI intentionally deferred: NotificationService writes to DB but no admin UI surfaces notifications yet. This is a separate future feature once the workflow engine proves stable.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 10 is complete. The workflow engine is fully activated: services, routes, templates, and sidebar navigation are all wired up and verified.
- Workflow dashboard shows real content counts. Content detail shows status history, assignment, and scheduling panels.
- Staging/Sync coexistence verified — both features work independently without conflict.
- **Remaining known gap:** Notification center UI (badge + bell) — NotificationService is ready but no admin UI surfaces it yet. Candidate for a follow-on phase.
- **Potential follow-on:** Workflow state transitions via the admin UI (currently read-only display; approve/reject actions from the detail page not yet wired to POST endpoints).

---
*Phase: 10-workflow-engine-activation*
*Completed: 2026-03-15*
