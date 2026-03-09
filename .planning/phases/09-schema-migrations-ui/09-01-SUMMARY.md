---
phase: 09-schema-migrations-ui
plan: 01
subsystem: core-services
tags: [d1, migrations, schema, drizzle]
dependency-graph:
  requires: []
  provides: [schema_migrations-table, SchemaMigrationService]
  affects: [09-02, 09-03, 09-04]
tech-stack:
  added: []
  patterns: [migration-recording, schema-snapshots, field-validation]
key-files:
  created:
    - packages/core/src/db/migrations/010_schema_migrations.sql
    - packages/core/src/services/schema-migration.ts
  modified:
    - packages/core/src/db/migrations-bundle.ts
    - packages/core/src/services/index.ts
decisions:
  - id: "09-01-001"
    decision: "Migration bundle ID 032 (next after 031) rather than 010 as filename suggests"
    reason: "Bundle IDs are sequential and last was 031; filename follows migrations folder convention"
  - id: "09-01-002"
    decision: "No FK constraints on collection_id or applied_by in schema_migrations"
    reason: "Avoids FK issues if collection or user is deleted after migrations are recorded"
  - id: "09-01-003"
    decision: "validateFieldChange uses changeType param to selectively check duplicates"
    reason: "Only add_field operations should reject duplicate names; modify/remove should not"
metrics:
  duration: ~3min
  completed: 2026-03-09
---

# Phase 9 Plan 01: Schema Migrations Foundation Summary

**One-liner:** D1 schema_migrations table and SchemaMigrationService with record/query/validate methods for tracking collection schema evolution.

## What Was Done

### Task 1: Schema Migrations Table DDL
Created `010_schema_migrations.sql` with a `schema_migrations` table containing columns for tracking every schema change: id, collection_id, collection_name, changes (JSON), description (human-readable), sql_executed, status, previous_schema (JSON snapshot), applied_by, applied_at, rolled_back_at, rolled_back_by. Three indexes on collection_id, applied_at DESC, and status. Registered as migration 032 in the bundled migrations array.

### Task 2: SchemaMigrationService
Created the service class with:
- **generateDescription()** -- produces human-readable summaries like "Added 'tags' field to Blog Posts" or "Added 'tags', modified 'title' in Blog Posts"
- **recordMigration()** -- stores changes with previous schema snapshot, generates UUID, inserts into D1
- **getMigrationHistory()** -- paginated query with optional collection filter, parses JSON changes
- **getLastMigration()** -- most recent migration for a collection (rollback support)
- **updateMigrationStatus()** -- marks migration as rolled_back with timestamp
- **validateFieldChange()** (static) -- rejects managed collections, reserved system fields (id, slug, title, status, etc.), and duplicate field names on add

Exported service and types (SchemaChange, SchemaMigration) from services index.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript strict null check on array access**
- **Found during:** Task 2 build verification
- **Issue:** `changes[0]` could be undefined per strict TypeScript
- **Fix:** Added non-null assertion `changes[0]!` (safe because guarded by `changes.length === 1`)
- **Files modified:** packages/core/src/services/schema-migration.ts
- **Commit:** b7c32d4

**2. [Rule 3 - Blocking] Migration bundle ID mismatch**
- **Found during:** Task 1
- **Issue:** Plan specified ID '010' but bundle IDs go up to '031'
- **Fix:** Used ID '032' as the next sequential bundle ID; kept filename as `010_schema_migrations.sql` per migrations folder convention
- **Commit:** 7634a0d

## Verification

- [x] `pnpm build` succeeds in packages/core
- [x] Migration bundle includes schema_migrations DDL
- [x] SchemaMigrationService compiles with proper TypeScript types
- [x] Human-readable description generation covers single and multiple change cases
- [x] Validation rejects managed collections and reserved field names

## Next Phase Readiness

Plan 02 can wire SchemaMigrationService into existing field CRUD routes in `admin-collections.ts`. The service is fully self-contained with no external dependencies beyond D1Database.
