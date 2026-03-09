---
phase: 09-schema-migrations-ui
verified: 2026-03-09T17:15:00Z
status: gaps_found
score: 13/14 must-haves verified
gaps:
  - truth: "schema_migrations table is created on app startup via migration bundle"
    status: failed
    reason: "SQL file exists but was never added to migrations-bundle.ts as entry 032"
    artifacts:
      - path: "packages/core/src/db/migrations-bundle.ts"
        issue: "No entry for schema_migrations DDL -- bundle ends at migration 031"
      - path: "packages/core/src/db/migrations/010_schema_migrations.sql"
        issue: "File exists but is orphaned -- not bundled"
    missing:
      - "Add migration entry with id '032' to bundledMigrations array in migrations-bundle.ts referencing 010_schema_migrations.sql DDL"
---

# Phase 9: Schema Migrations UI Verification Report

**Phase Goal:** Non-technical users can add/modify collection fields from the admin dashboard without touching code or running CLI commands
**Verified:** 2026-03-09T17:15:00Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | schema_migrations table DDL exists with all required columns | VERIFIED | 010_schema_migrations.sql has id, collection_id, collection_name, changes, description, sql_executed, status, previous_schema, applied_by, applied_at, rolled_back_at, rolled_back_by + 3 indexes |
| 2 | schema_migrations DDL is bundled for auto-creation on startup | FAILED | migrations-bundle.ts ends at migration 031 -- no entry 032 for schema_migrations |
| 3 | SchemaMigrationService can record schema changes with human-readable descriptions | VERIFIED | recordMigration() inserts to D1, generateDescription() produces "Added 'tags' field to Blog Posts" style output |
| 4 | Service stores previous schema JSON for rollback | VERIFIED | previousSchema captured as JSON.stringify in recordMigration() |
| 5 | Validation rejects managed collections, reserved fields, duplicates | VERIFIED | validateFieldChange() static method checks managed flag, RESERVED_FIELDS list, duplicate on add_field |
| 6 | Adding a field records add_field migration | VERIFIED | POST /:id/fields calls SchemaMigrationService.recordMigration with type add_field at line 744 |
| 7 | Editing a field records modify_field migration | VERIFIED | PUT /:collectionId/fields/:fieldId calls recordMigration with type modify_field at line 948 |
| 8 | Deleting a field records remove_field migration | VERIFIED | DELETE /:collectionId/fields/:fieldId calls recordMigration with type remove_field at line 1070 |
| 9 | /admin/schema-migrations shows paginated migration list | VERIFIED | Route registered in app.ts at line 279, template renders paginated list with Previous/Next and up to 10 page numbers |
| 10 | Each entry shows description, collection, timestamp, user, status badge | VERIFIED | Template renders description, collectionName, relativeTime(), appliedBy, statusBadge() (green/amber/red) |
| 11 | Collection filtering works via query param | VERIFIED | Route reads ?collection= param, queries D1 with WHERE clause, template has filter dropdown |
| 12 | Expandable details show changes JSON | VERIFIED | HTML details/summary element with changeTypeBadge() for each field change |
| 13 | Page accessible from admin sidebar | VERIFIED | admin-layout-catalyst.template.ts has "Schema Migrations" nav item at /admin/schema-migrations |
| 14 | Last applied migration can be rolled back | VERIFIED | rollbackMigration() in service validates status/recency, uses D1 batch for atomic restore + audit entry; POST /rollback/:id endpoint; rollback button shown only for latest applied per collection |
| 15 | Field deletion shows confirmation with content impact count | VERIFIED | GET /:collectionId/fields/:fieldId/impact returns contentCount; admin-collections-form.template.ts fetches impact and shows "This collection has N content items" in dialog |

**Score:** 13/14 truths verified (Truth 2 failed)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/db/migrations/010_schema_migrations.sql` | DDL for schema_migrations table | EXISTS, SUBSTANTIVE (23 lines), ORPHANED | File exists but not bundled in migrations-bundle.ts |
| `packages/core/src/services/schema-migration.ts` | SchemaMigrationService class | VERIFIED (444 lines) | Full implementation: record, query, validate, rollback, getLatestApplied |
| `packages/core/src/routes/admin-schema-migrations.ts` | Migration history routes | VERIFIED (175 lines) | GET / (HTML), GET /api (JSON), POST /rollback/:id |
| `packages/core/src/templates/pages/admin-schema-migrations-history.template.ts` | Migration history page | VERIFIED (346 lines) | Pagination, filtering, status badges, expandable details, rollback button |
| `packages/core/src/routes/admin-collections.ts` | Field CRUD with migration tracking | VERIFIED | SchemaMigrationService wired at lines 652, 743, 851, 947, 1022, 1070 |
| `packages/core/src/templates/pages/admin-collections-form.template.ts` | Delete confirmation with impact | VERIFIED | Fetches /impact endpoint, shows content count in dialog |
| `packages/core/src/db/migrations-bundle.ts` | Migration 032 for schema_migrations | MISSING ENTRY | Bundle ends at 031 -- no entry for schema_migrations DDL |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| admin-collections.ts | schema-migration.ts | import + new SchemaMigrationService(db) | WIRED | Import at line 5, instantiated in all 3 CRUD routes |
| admin-schema-migrations.ts | schema-migration.ts | import + new SchemaMigrationService(db) | WIRED | Import at line 3, used in GET and POST handlers |
| app.ts | admin-schema-migrations.ts | app.route('/admin/schema-migrations', ...) | WIRED | Mounted at line 279 |
| routes/index.ts | admin-schema-migrations.ts | export | WIRED | Exported at line 39 |
| services/index.ts | schema-migration.ts | export | WIRED | Service + types exported at lines 101-102 |
| admin-layout-catalyst.template.ts | /admin/schema-migrations | sidebar nav item | WIRED | Nav item at line 584-585 |
| admin-collections-form.template.ts | /:collectionId/fields/:fieldId/impact | fetch() in delete handler | WIRED | Fetches impact data before showing confirmation dialog |
| migrations-bundle.ts | 010_schema_migrations.sql | bundled migration entry | NOT WIRED | No entry 032 in bundledMigrations array |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | No anti-patterns detected in any phase 9 files |

### Human Verification Required

### 1. Visual Appearance of Migration History Page
**Test:** Navigate to /admin/schema-migrations in the admin dashboard
**Expected:** Page renders with proper Catalyst admin layout, status badges are colored correctly (green/amber/red), expandable details work
**Why human:** Visual rendering cannot be verified programmatically

### 2. End-to-End Field Add/Edit/Delete with Migration Recording
**Test:** Add a field to a collection, then check /admin/schema-migrations for the new entry
**Expected:** Migration appears with "Added 'fieldname' field to CollectionName" description, status "Applied"
**Why human:** Requires running D1 database and verifying full request cycle

### 3. Rollback Flow
**Test:** Click "Rollback" button on most recent migration, confirm, check collection schema
**Expected:** Schema reverts to previous state, migration shows "Rolled Back" status, rollback audit entry appears
**Why human:** Requires live D1 batch operation and UI interaction

### 4. Delete Confirmation with Impact Count
**Test:** Click delete on a field in a collection that has content items
**Expected:** Dialog shows field name and content count ("This collection has N content items")
**Why human:** Requires running app with real content data

### Gaps Summary

One gap found: the `schema_migrations` table DDL (010_schema_migrations.sql) exists as a file but was **never added to the migrations bundle** (migrations-bundle.ts). The bundle ends at migration 031 (ai_search_plugin). Without entry 032, the `schema_migrations` table will never be auto-created when the app starts, causing all SchemaMigrationService operations to fail with a "table not found" error at runtime. This is a blocking gap -- the entire migration tracking system depends on this table existing.

All other must-haves are verified: the service implementation is complete (444 lines, no stubs), field CRUD routes are properly wired with migration recording, the history page template is fully implemented with pagination/filtering/expandable details, rollback support uses atomic D1 batch, and the delete confirmation dialog fetches content impact counts.

---

_Verified: 2026-03-09T17:15:00Z_
_Verifier: Claude (gsd-verifier)_
