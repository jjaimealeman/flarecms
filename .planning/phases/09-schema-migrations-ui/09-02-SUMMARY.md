---
phase: 09-schema-migrations-ui
plan: 02
subsystem: core-routes
tags: [field-crud, migrations, validation, admin]
dependency-graph:
  requires: [09-01]
  provides: [field-crud-migration-tracking, managed-collection-guard, reserved-field-validation]
  affects: [09-03, 09-04]
tech-stack:
  added: []
  patterns: [best-effort-recording, schema-snapshot-before-change, static-validation]
key-files:
  created: []
  modified:
    - packages/core/src/routes/admin-collections.ts
decisions:
  - id: "09-02-001"
    decision: "Migration recording is best-effort with try/catch wrapping"
    reason: "Schema change already succeeded in D1; migration tracking failure should not roll back the field operation"
  - id: "09-02-002"
    decision: "Moved schema update logic inside if(schema.properties[fieldName]) block for edit route"
    reason: "previousConfig variable scoping required it; also improves correctness by returning 'field not found' if field doesn't exist"
  - id: "09-02-003"
    decision: "Task 1 (exports) was already complete from plan 01"
    reason: "09-01 already added SchemaMigrationService exports to services/index.ts"
metrics:
  duration: ~4min
  completed: 2026-03-09
---

# Phase 9 Plan 2: Wire Migration Tracking into Field CRUD Summary

SchemaMigrationService wired into all three field CRUD routes (add/edit/delete) in admin-collections.ts with managed collection guard, reserved field name validation, and best-effort migration recording after each schema change.

## What Was Done

### Task 1: Export SchemaMigrationService from services index
**Status:** Already complete from plan 01. Verified exports exist at lines 100-102 of services/index.ts. Build confirmed working.

### Task 2: Add migration tracking to field add/edit/delete routes
**Commit:** e7cc4c3

Wired SchemaMigrationService into `admin-collections.ts`:

1. **Import:** Added `SchemaMigrationService` import at top of file
2. **POST /:id/fields (Add field):**
   - Added `validateFieldChange()` call before schema modification (checks managed, reserved names, duplicates)
   - Captures `previousSchema` deep clone before mutation
   - Records `add_field` migration after successful D1 update
3. **PUT /:collectionId/fields/:fieldId (Edit field):**
   - Added `validateFieldChange()` call with `changeType: 'modify_field'`
   - Captures `previousSchema` and `previousConfig` before mutation
   - Records `modify_field` migration after successful D1 update
   - Moved update logic inside `if(schema.properties[fieldName])` block for correct scoping
4. **DELETE /:collectionId/fields/:fieldId (Delete field):**
   - Added `validateFieldChange()` call with `changeType: 'remove_field'`
   - Captures `previousSchema` and `removedConfig` before deletion
   - Records `remove_field` migration after successful D1 update

All migration recording wrapped in try/catch -- failures are logged but do not affect field operations.

## Decisions Made

| ID | Decision | Reason |
|----|----------|--------|
| 09-02-001 | Best-effort migration recording | Schema change already committed to D1; tracking failure shouldn't roll back |
| 09-02-002 | Schema update moved inside field-exists check | Variable scoping for previousConfig + better error handling |
| 09-02-003 | Task 1 skipped (already done) | Plan 01 already exported SchemaMigrationService |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved schema update inside if block in edit route**
- **Found during:** Task 2
- **Issue:** `previousConfig` was declared inside the `if (schema.properties[fieldName])` block but migration recording was outside it, causing TypeScript error TS18004
- **Fix:** Moved the update and migration recording inside the if block, added a "field not found" fallback return
- **Files modified:** packages/core/src/routes/admin-collections.ts
- **Commit:** e7cc4c3

## Verification

- [x] `pnpm build` succeeds
- [x] POST /:id/fields validates and records add_field migration
- [x] PUT /:collectionId/fields/:fieldId records modify_field migration
- [x] DELETE /:collectionId/fields/:fieldId records remove_field migration
- [x] Managed collections rejected with descriptive error
- [x] Reserved field names rejected
- [x] Migration recording failures do not break field operations
- [x] 1285 tests pass (1 pre-existing failure in dynamic-field-extended.test.ts unrelated to changes)

## Next Phase Readiness

Plan 09-03 (migration history UI) can proceed -- all field CRUD routes now record migrations to the `schema_migrations` table.
