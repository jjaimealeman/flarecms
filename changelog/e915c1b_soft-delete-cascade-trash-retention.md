# 2026-03-12 - Soft Delete Cascade with Trash Retention and Auto-Purge

**Keywords:** [FEATURE] [DATABASE] [MIGRATION] [BACKEND] [UI]
**Session:** Evening, Duration (~30 minutes)
**Commit:** e915c1b

## What Changed

- File: `packages/core/migrations/035_soft_delete_cascade.sql`
  - Added `deleted_at` column to content table
  - Backfills existing deleted content with `updated_at` timestamp
  - Added partial index on `deleted_at` for efficient trash queries
- File: `packages/core/src/db/schema.ts`
  - Added `deletedAt` field to content table definition
- File: `packages/core/src/db/migrations-bundle.ts`
  - Regenerated with migration 035
- File: `packages/core/src/services/content-state-machine.ts`
  - Added `deleted -> draft` transition for restore from trash
- File: `packages/core/src/services/settings.ts`
  - Added `trashRetentionDays` to GeneralSettings interface (default 30 days)
  - Updated `getGeneralSettings()` and `saveGeneralSettings()` to handle new field
- File: `packages/core/src/services/settings.test.ts`
  - Updated 3 test assertions to include `trashRetentionDays: 30`
- File: `packages/core/src/routes/admin-content.ts`
  - Added `purgeExpiredTrash()` function for auto-purge based on retention setting
  - Updated single and bulk delete handlers to set `deleted_at` timestamp
  - Added `POST /:id/restore` route — restore from trash to draft
  - Added `DELETE /:id/purge` route — permanent delete with cascade to versions/workflow
  - Added bulk `restore` and `purge` actions
  - Auto-purge fires on content list page load
- File: `packages/core/src/routes/admin-settings.ts`
  - Handles `trashRetentionDays` in general settings POST handler
- File: `packages/core/src/templates/pages/admin-content-list.template.ts`
  - Bulk actions swap to Restore/Delete Permanently in trash view
  - Row actions swap to Restore/Purge buttons with appropriate icons
- File: `packages/core/src/templates/pages/admin-settings.template.ts`
  - Added trash retention dropdown in General Settings (0/7/14/30/60/90 days)
- File: `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts`
  - Added Trash nav item with Trash2 icon in Content sidebar section

## Why

Fixes the known bug "Soft-delete doesn't cascade" documented in CLAUDE.md. Previously, deleting content only changed its status to 'deleted' but left orphaned `content_versions` and `workflow_history` records. There was no way to restore deleted content, no trash retention policy, and no permanent delete with proper cascade cleanup.

This implementation adds a complete trash management system: soft delete with timestamp tracking, restore to draft, permanent delete with FK cascade, configurable retention, and auto-purge of expired items.

## Issues Encountered

No major issues encountered. The existing status-based soft delete pattern was preserved and augmented with `deleted_at` timestamps for retention tracking. Pre-existing test failures (3 in admin-layout-catalyst, unrelated to these changes) were verified as pre-existing.

## Dependencies

No dependencies added.

## Testing Notes

- **What was tested:** Build passes clean, all 28 settings tests pass, pre-existing failures verified unchanged
- **What wasn't tested:** E2E restore/purge flow (requires running dev server), auto-purge timing
- **Edge cases:** `trashRetentionDays = 0` disables auto-purge (keep forever)

## Next Steps

- [ ] Test restore/purge in dev server UI
- [ ] Wire idle timeout enforcement (client-side JS using saved settings)
- [ ] Session revocation via KV blacklist + Force Logout on Users page
- [ ] Content RBAC — wire rbac.ts into admin-content.ts routes

---

**Branch:** feature/soft-delete-cascade
**Issue:** N/A
**Impact:** MEDIUM — new trash management system, migration adds column to content table
