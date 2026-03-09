# Phase 9: Schema Migrations UI - Research

**Researched:** 2026-03-09
**Domain:** Admin UI schema editing, D1 runtime operations, collection management
**Confidence:** HIGH

## Summary

This phase involves building a UI for non-technical users to add, edit, and remove collection fields from the Flare CMS admin dashboard. The critical architectural insight is that **Flare CMS stores content as JSON in the `data` TEXT column** of the `content` table. This means collection field changes are NOT traditional D1 DDL migrations (ALTER TABLE ADD COLUMN, etc.) -- they are **JSON schema metadata changes** stored in the `collections.schema` column.

This dramatically simplifies the "migration" concept. There are no actual D1 column-level schema changes to make when a user adds or removes a field. The "migration" is really a schema evolution record that tracks what fields were added/removed/modified and optionally transforms existing content data.

**Primary recommendation:** Build a schema evolution system on top of the existing collection JSON schema, with a `schema_migrations` table for audit history and optional data backfill. No D1 DDL (ALTER TABLE) is needed.

## Standard Stack

### Core (already in codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Hono | current | Route handlers for migration API | Already used for all admin routes |
| HTMX | current | Dynamic UI interactions | Already loaded in admin layout |
| D1 (SQLite) | Workers API | Data storage | Already the primary database |
| Tailwind CSS | v4 | UI styling (Catalyst design system) | Already used throughout admin |

### Supporting (already available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| hono/html | current | Server-side HTML templates | All admin page rendering |
| crypto.randomUUID() | Web API | ID generation | Migration record IDs |

### No Additional Libraries Needed

This phase requires zero new dependencies. All functionality builds on:
- Existing Hono route patterns (see `admin-collections.ts`)
- Existing template system (see `admin-collections-form.template.ts`)
- Existing D1 raw SQL via `db.prepare()` / `db.batch()`
- Existing HTMX patterns for dynamic forms

## Architecture Patterns

### Critical Insight: Content is JSON, Not Columnar

```
collections table:
  schema: TEXT (JSON) -- defines field structure

content table:
  data: TEXT (JSON) -- stores actual field values as schemaless JSON
```

When a user "adds a field" to a collection, the system:
1. Updates the `collections.schema` JSON to include the new field definition
2. Records the change in a `schema_migrations` table for audit
3. Optionally backfills existing content items with default values

**No D1 ALTER TABLE operations are needed.** The "migration" is a metadata + optional data transformation operation.

### Recommended Project Structure

New files to create:
```
packages/core/src/
  routes/
    admin-schema-migrations.ts           # Route handlers for migration UI + API
  templates/pages/
    admin-schema-migrations-history.template.ts  # Migration history page
  services/
    schema-migration.ts                  # Migration execution logic
  db/
    schema.ts                            # Add schema_migrations table
```

Files to modify:
```
packages/core/src/
  routes/admin-collections.ts            # Add schema editor tab/section
  templates/pages/admin-collections-form.template.ts  # Enhanced field editor UI
  routes/index.ts                        # Export new routes
  app.ts                                 # Mount new routes
  db/migrations-bundle.ts               # Add migration for new table
```

### Pattern 1: Schema Evolution Service

**What:** A service that validates schema changes, generates human-readable descriptions, applies changes atomically, and records history.
**When to use:** Every time a user modifies collection fields through the UI.

```typescript
// Source: Derived from existing admin-collections.ts patterns
interface SchemaChange {
  type: 'add_field' | 'modify_field' | 'remove_field'
  fieldName: string
  fieldConfig?: FieldConfig  // For add/modify
  previousConfig?: FieldConfig  // For modify/remove
}

interface SchemaMigration {
  id: string
  collectionId: string
  collectionName: string
  changes: SchemaChange[]
  description: string  // Human-readable: "Added 'tags' field to Blog Posts"
  sql?: string  // The raw SQL executed (for power users)
  status: 'pending' | 'applied' | 'failed' | 'rolled_back'
  appliedAt: number
  appliedBy: string  // user ID
  rollbackData?: string  // JSON snapshot of previous schema for rollback
}
```

### Pattern 2: D1 Batch for Atomic Operations

**What:** Use `db.batch()` to execute schema update + migration record + optional data backfill as a single transaction.
**When to use:** Every migration apply/rollback operation.

```typescript
// Source: Cloudflare D1 docs - batch API
// db.batch() is a real transaction - if any statement fails, all roll back

const statements = [
  // 1. Update collection schema
  db.prepare('UPDATE collections SET schema = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(newSchema), Date.now(), collectionId),

  // 2. Record migration
  db.prepare('INSERT INTO schema_migrations (id, collection_id, ...) VALUES (?, ?, ...)')
    .bind(migrationId, collectionId, ...),
]

// Optional: backfill existing content with default values
if (change.type === 'add_field' && change.fieldConfig?.default !== undefined) {
  // Update all content items in this collection
  // Content.data is JSON, so use json_set() or handle in application layer
}

await db.batch(statements)
```

### Pattern 3: Existing Field Editor Enhancement

**What:** The existing `admin-collections.ts` already has full CRUD for fields (POST `/:id/fields`, PUT `/:id/fields/:fieldId`, DELETE `/:id/fields/:fieldId`). This phase wraps those operations with migration tracking.
**When to use:** Extend, don't rewrite the existing field management code.

The current code already:
- Adds fields to schema JSON (`POST /:id/fields`)
- Updates field configs (`PUT /:collectionId/fields/:fieldId`)
- Removes fields from schema (`DELETE /:collectionId/fields/:fieldId`)
- Handles field reordering (`POST /:collectionId/fields/reorder`)

Phase 9 wraps these with: migration recording, human-readable descriptions, rollback snapshots, and a history UI.

### Pattern 4: Managed Collection Guard

**What:** Collections with `managed: true` (config-file-managed) cannot have their schema modified through the UI.
**When to use:** All field modification endpoints must check this flag.

The existing code already shows this pattern -- the collections form template shows a "Config-Managed Collection" banner and disables editing for managed collections.

### Anti-Patterns to Avoid

- **Generating D1 ALTER TABLE statements:** Content is stored as JSON in `data` column. There are no per-field columns to alter. The "migration" concept here is about schema metadata, not DDL.
- **Building a custom migration runner from scratch:** The existing `MigrationService` handles DDL migrations for system tables. Schema field changes are a different concern (JSON metadata + data transformation).
- **Treating field removal as data deletion:** When a field is removed from the schema, the JSON data in existing content items should be preserved (orphaned data is harmless). Only the schema definition changes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Transaction safety | Custom retry/rollback logic | `db.batch()` | D1 batch IS a transaction with automatic rollback on failure |
| Field type validation | Custom validator | Existing `validateCollectionConfig()` | Already validates field types, required options, etc. |
| Admin page layout | Custom HTML scaffold | `renderAdminLayoutCatalyst()` | All admin pages use this layout with sidebar nav |
| Form rendering | Custom form HTML | Existing `renderForm()` + HTMX patterns | Consistent with rest of admin UI |
| Schema diff | Custom diff algorithm | Simple before/after JSON comparison | Schema is small; deep diff libraries are overkill |

**Key insight:** The existing codebase already handles 80% of the field CRUD. This phase adds migration tracking, history UI, and safety guardrails around the existing operations.

## Common Pitfalls

### Pitfall 1: Confusing "Schema Migration" with "Database Migration"
**What goes wrong:** Attempting to generate ALTER TABLE SQL for field changes, which is unnecessary and won't work (content is JSON).
**Why it happens:** The term "migration" implies DDL changes, but this CMS uses a document-store pattern within SQLite.
**How to avoid:** The `schema_migrations` table records schema metadata changes, not DDL. The only actual D1 DDL needed is creating the `schema_migrations` table itself (a one-time migration).
**Warning signs:** Code generating `ALTER TABLE content ADD COLUMN...` statements.

### Pitfall 2: Not Preserving Rollback Data
**What goes wrong:** Cannot roll back a schema change because the previous schema state wasn't saved.
**Why it happens:** Only saving the new schema without snapshotting the old one.
**How to avoid:** Store the complete previous schema JSON in the migration record's `rollback_data` column before applying changes.
**Warning signs:** Migration records without `rollback_data`.

### Pitfall 3: Destructive Field Removal Without Warning
**What goes wrong:** User removes a field, existing content data for that field becomes invisible (still in JSON but not shown in forms/API).
**Why it happens:** Schema removal is instant with no safety check.
**How to avoid:** Show a warning with count of content items that have data for this field. Require explicit confirmation. Consider soft-delete (mark field as hidden) before hard removal.
**Warning signs:** Field removal endpoint without content item count check.

### Pitfall 4: Race Conditions on Schema Updates
**What goes wrong:** Two users modify the same collection's schema simultaneously, one overwrites the other.
**Why it happens:** Read-modify-write on the JSON schema column without locking.
**How to avoid:** Use `db.batch()` with a conditional update: `UPDATE collections SET schema = ? WHERE id = ? AND updated_at = ?` (optimistic locking). If 0 rows affected, return conflict error.
**Warning signs:** Schema update without checking `updated_at` timestamp.

### Pitfall 5: Field Name Collisions with System Fields
**What goes wrong:** User creates a field named `title`, `slug`, `status`, etc. which conflicts with system columns on the `content` table.
**Why it happens:** No validation against reserved field names.
**How to avoid:** Block field names that match content table columns: `id`, `collection_id`, `slug`, `title`, `data`, `status`, `published_at`, `author_id`, `created_at`, `updated_at`.
**Warning signs:** No reserved name check in field creation.

### Pitfall 6: Ignoring the `managed` Flag
**What goes wrong:** UI allows editing fields on config-managed collections, but next deploy/restart overwrites changes via `syncCollections()`.
**Why it happens:** Schema migration UI doesn't check the `managed` column.
**How to avoid:** All field modification endpoints must reject changes to collections where `managed = 1`. The existing UI already shows a read-only banner for managed collections.
**Warning signs:** Missing `managed` check in migration API endpoints.

## Code Examples

### New `schema_migrations` Table DDL

```sql
-- Migration 010: Schema Migrations Tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES collections(id),
  collection_name TEXT NOT NULL,
  changes TEXT NOT NULL,          -- JSON array of SchemaChange objects
  description TEXT NOT NULL,      -- Human-readable summary
  sql_executed TEXT,              -- Raw SQL for power users (optional)
  status TEXT NOT NULL DEFAULT 'applied',  -- applied, failed, rolled_back
  previous_schema TEXT,           -- Full schema JSON before change (for rollback)
  applied_by TEXT REFERENCES users(id),
  applied_at INTEGER NOT NULL,
  rolled_back_at INTEGER,
  rolled_back_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_collection
  ON schema_migrations(collection_id);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at
  ON schema_migrations(applied_at DESC);
```

### Human-Readable Description Generator

```typescript
// Source: Derived from existing patterns
function generateDescription(changes: SchemaChange[], collectionName: string): string {
  const parts = changes.map(change => {
    const fieldLabel = change.fieldConfig?.title || change.fieldName
    switch (change.type) {
      case 'add_field':
        return `Added '${fieldLabel}' (${change.fieldConfig?.type}) field`
      case 'modify_field':
        return `Modified '${fieldLabel}' field`
      case 'remove_field':
        return `Removed '${fieldLabel}' field`
    }
  })
  return `${parts.join(', ')} in ${collectionName}`
}
// Example output: "Added 'Tags' (string) field in Blog Posts"
```

### Atomic Schema Update with Migration Record

```typescript
// Source: Derived from existing admin-collections.ts + D1 batch docs
async function applySchemaChange(
  db: D1Database,
  collectionId: string,
  collectionName: string,
  newSchema: CollectionSchema,
  previousSchema: CollectionSchema,
  changes: SchemaChange[],
  userId: string
): Promise<{ success: boolean; migrationId: string; error?: string }> {
  const migrationId = crypto.randomUUID()
  const now = Date.now()
  const description = generateDescription(changes, collectionName)

  try {
    await db.batch([
      // Update schema with optimistic locking
      db.prepare(`
        UPDATE collections
        SET schema = ?, updated_at = ?
        WHERE id = ?
      `).bind(JSON.stringify(newSchema), now, collectionId),

      // Record migration
      db.prepare(`
        INSERT INTO schema_migrations
        (id, collection_id, collection_name, changes, description,
         previous_schema, status, applied_by, applied_at)
        VALUES (?, ?, ?, ?, ?, ?, 'applied', ?, ?)
      `).bind(
        migrationId, collectionId, collectionName,
        JSON.stringify(changes), description,
        JSON.stringify(previousSchema), userId, now
      ),
    ])

    return { success: true, migrationId }
  } catch (error) {
    // D1 batch auto-rolls back on failure
    return {
      success: false,
      migrationId,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
```

### Rollback Implementation

```typescript
// Source: Derived from existing migration patterns
async function rollbackMigration(
  db: D1Database,
  migrationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // Get migration record
  const migration = await db.prepare(
    'SELECT * FROM schema_migrations WHERE id = ? AND status = ?'
  ).bind(migrationId, 'applied').first()

  if (!migration) {
    return { success: false, error: 'Migration not found or already rolled back' }
  }

  const previousSchema = migration.previous_schema as string
  if (!previousSchema) {
    return { success: false, error: 'No rollback data available' }
  }

  const now = Date.now()

  try {
    await db.batch([
      // Restore previous schema
      db.prepare('UPDATE collections SET schema = ?, updated_at = ? WHERE id = ?')
        .bind(previousSchema, now, migration.collection_id as string),

      // Mark migration as rolled back
      db.prepare(`
        UPDATE schema_migrations
        SET status = 'rolled_back', rolled_back_at = ?, rolled_back_by = ?
        WHERE id = ?
      `).bind(now, userId, migrationId),
    ])

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
```

### HTMX Field Editor Pattern (Existing)

```typescript
// Source: Existing admin-collections.ts line 616+
// Fields are added via POST to /:id/fields with HTMX
// The existing pattern uses JSON responses and client-side JS to update the DOM

// Add field endpoint returns:
c.json({ success: true, fieldId: `schema-${fieldName}` })

// Update field endpoint returns:
c.json({ success: true })

// Delete field endpoint returns:
c.json({ success: true })
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `content_fields` table (legacy) | JSON schema in `collections.schema` | Already migrated | Field definitions are in JSON, not separate table rows |
| Drizzle ORM for queries | Raw D1 `db.prepare()` | Throughout admin routes | Admin routes use raw SQL, not Drizzle ORM |
| Full page reload | HTMX partial updates | Throughout admin | Existing admin UI uses HTMX for dynamic updates |

**Important note on data architecture:**
- System tables (users, content, media, etc.) use traditional columns via Drizzle schema
- Content field VALUES are stored as JSON in `content.data`
- Content field DEFINITIONS are stored as JSON in `collections.schema`
- This is a document-store pattern inside SQLite -- field changes are metadata-only

## Recommendations (Claude's Discretion Areas)

### Field Editor Placement
**Recommendation:** Keep in existing collection edit page (`/admin/collections/:id`), enhance the current field list section with better add/edit interactions. No need for a separate page -- the collection form already shows fields.

### Add/Edit Interaction
**Recommendation:** Modal dialog for adding fields (keeps context), inline expansion for editing (quick tweaks). Both patterns exist in the admin UI already.

### Field Reordering
**Recommendation:** Insertion order only (no drag-to-reorder). The existing `reorder` endpoint exists but adds UI complexity for minimal value. Defer drag-reorder.

### Auto-Apply vs Review-Then-Apply
**Recommendation:** Auto-apply with confirmation dialog. Non-technical users don't want a "pending migrations" queue. Show a summary dialog: "You're about to add 'Tags' (text) to Blog Posts. This will be available in all new and existing content items. Apply?" then apply immediately on confirm.

### Destructive Change Handling
**Recommendation:** Warning + confirm for field removal. Show count of content items with data in that field. The data stays in the JSON (harmless orphaned data), but the field disappears from forms and API output. Frame it as "This field will be hidden from all forms and API responses. Existing data is preserved but not visible."

### Batching
**Recommendation:** Multiple changes per migration. Let users make several field changes, then apply all at once. This produces cleaner history ("Added 'tags', 'category', and 'author' fields") vs three separate migrations.

### Creating New Collections
**Recommendation:** Out of scope for this phase. The existing collection creation flow (`/admin/collections/new`) already works. This phase focuses on field-level editing within existing collections.

### Migration History Location
**Recommendation:** Both per-collection (tab on collection edit page) and global (new admin page at `/admin/schema-migrations`). The global page is the primary view. Per-collection shows filtered history.

### Rollback Depth
**Recommendation:** Last migration only from the UI. Rolling back older migrations risks breaking newer ones that depend on them. Power users can see full history but can only roll back the most recent change per collection.

### Guardrails
**Recommendation:** Warn but allow for most operations. Block only truly dangerous ones:
- Block: removing the last field from a collection
- Block: field name conflicts with system columns
- Warn: removing a field with data in existing items
- Warn: changing field type (could cause display issues)
- Allow: adding fields (always safe)
- Allow: modifying field labels, help text, etc.

### Environment Scope
**Recommendation:** No dev/prod distinction. Flare CMS is a single Worker instance. Migrations apply to the one database. Keep it simple.

## Open Questions

1. **Data backfill on field addition**
   - What we know: Adding a field to the schema makes it appear in forms for new items. Existing items won't have the field in their `data` JSON.
   - What's unclear: Should existing items be backfilled with default values when a field is added? Or should the UI handle missing fields gracefully?
   - Recommendation: Don't backfill by default. The content form should handle `undefined` fields gracefully (show empty). This avoids expensive UPDATE queries on large collections. Consider an optional "backfill" button for power users.

2. **Content data cleanup on field removal**
   - What we know: Removing a field from the schema hides it from UI/API. The data remains in the JSON blob.
   - What's unclear: Should there be a "purge orphaned data" option?
   - Recommendation: No automatic purge. Orphaned data is harmless (stored as JSON). A future "database cleanup" tool could optionally remove orphaned fields from content JSON.

3. **Field type changes**
   - What we know: Changing a field's type (e.g., string to number) doesn't change the stored data.
   - What's unclear: What validation should happen? Should existing data be checked for compatibility?
   - Recommendation: Allow type changes with a warning. The form will render the field with the new type. If existing data doesn't match (e.g., "hello" stored in a now-number field), the form will show it as-is. No data transformation.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `packages/core/src/db/schema.ts` -- content table uses JSON `data` column
- Codebase analysis: `packages/core/src/routes/admin-collections.ts` -- existing field CRUD endpoints
- Codebase analysis: `packages/core/src/services/migrations.ts` -- existing migration service pattern
- Codebase analysis: `packages/core/src/types/collection-config.ts` -- FieldType and CollectionConfig types
- Codebase analysis: `packages/core/src/services/collection-sync.ts` -- managed collection sync
- Codebase analysis: `packages/core/src/templates/pages/admin-collections-form.template.ts` -- existing UI

### Secondary (MEDIUM confidence)
- [Cloudflare D1 Worker API docs](https://developers.cloudflare.com/d1/worker-api/d1-database/) -- db.batch() is a real transaction with automatic rollback
- [SQLite ALTER TABLE](https://www.sqlite.org/lang_altertable.html) -- ADD COLUMN, DROP COLUMN, RENAME COLUMN supported (but not needed for this phase)

### Tertiary (LOW confidence)
- None -- all findings verified against codebase and official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- entire stack already exists in codebase, no new dependencies
- Architecture: HIGH -- content-as-JSON pattern verified directly in schema.ts and content CRUD routes
- Pitfalls: HIGH -- derived from actual codebase patterns (managed flag, system field names, batch transactions)
- UI patterns: HIGH -- templates and HTMX patterns observed in existing admin pages

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- no external dependencies changing)
