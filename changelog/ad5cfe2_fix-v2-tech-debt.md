# 2026-03-16 - Fix v2.0 Tech Debt: Migrations, Hook Names, Route Exports

**Keywords:** [FIX] [WORKFLOW] [MIGRATIONS]
**Session:** v2.0 tech debt cleanup
**Commit:** ad5cfe2

## What Changed

- File: `packages/core/migrations/010_schema_migrations.sql`
  - Copied from src/db/migrations/ to migrations/ (build directory)
  - Regenerated migrations-bundle.ts — now includes all 37 migrations

- File: `packages/core/src/plugins/core-plugins/workflow-plugin/index.ts`
  - Fixed hook names: `content:create` → `content:after-create`, `content:save` → `content:after-update`, `content:delete` → `content:before-delete`
  - Names now match HOOKS constants in types/plugin.ts

- File: `packages/core/src/routes/index.ts`
  - Added exports: `createWorkflowRoutes`, `createWorkflowAdminRoutes`
  - Added to ROUTES_INFO: `workflowRoutes`, `workflowAdminRoutes`

## Why

Four tech debt items carried forward from v2.0 milestone. Issue 1 (missing migration) broke fresh installs with 500 on /admin/schema-migrations. Issue 3 (wrong hook names) meant workflow hooks silently never fired. Issue 4 (missing exports) prevented external consumers from accessing workflow route builders.

## Issues Encountered

No major issues encountered.

## Dependencies

No dependencies added.

## Testing Notes

Build passes. Migration bundle now contains 37 migrations (was 36).

## Next Steps

- [ ] Consider activating workflowPlugin via PluginManager (Issue 2 — deferred, routes work via direct wiring)

---

**Branch:** feature/v2-tech-debt
**Issue:** N/A
**Impact:** HIGH - fixes fresh install breakage and silent hook failures
