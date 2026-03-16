# 2026-03-13 - Content Staging: Schema + RevisionService (Phase 1)

**Keywords:** [STAGING] [SCHEMA] [SERVICE] [EDITORIAL] [WORKFLOW]
**Session:** Afternoon, Duration (~1 hour)
**Commit:** b9e4631

## What Changed

- File: `packages/core/migrations/036_content_staging.sql`
  - Added `status` column to `content_versions` (default 'history', values: history/pending/approved/rejected)
  - Created `content_revision_meta` table (version_id, submitted_by, reviewed_by, review_comment, timestamps)
  - Added indexes for fast pending revision lookups
- File: `packages/core/src/services/revisions.ts`
  - New `RevisionService` with 9 exported functions
  - `createPendingRevision()` — stores edit as pending version instead of overwriting live content
  - `getPendingCount()` — lightweight count for sidebar badge
  - `getPendingRevisions()` — full list with content/collection/user details for Sync modal
  - `approveRevision()` — promotes pending data to live content table, saves old live as history
  - `approveAllRevisions()` — batch approve all pending revisions
  - `rejectRevision()` — marks rejected, live content unchanged
  - `computeDiff()` — field-by-field comparison between live and pending data
  - `hasPendingRevision()` / `getLatestPendingRevision()` — per-item checks
- File: `packages/core/src/services/index.ts`
  - Exported all RevisionService functions and types
- File: `packages/core/src/db/migrations-bundle.ts`
  - Regenerated with migration 036 (35 total migrations)
- File: `.planning/future/editorial-workflow-content-staging.md`
  - Full PRD for the editorial workflow feature

## Why

Building a content staging layer so edits to published content don't go live instantly. In SSR mode, content changes are visible immediately — this adds a safety net where changes must be reviewed and approved via a "Sync" button before going live. Particularly important for multi-user setups where authors shouldn't be able to accidentally break the live site.

## Issues Encountered

- Migration file initially placed in wrong directory (`src/db/migrations/` instead of `migrations/`) — moved and regenerated

## Dependencies

No dependencies added

## Testing Notes

- What was tested: Build passes, all tests pass (6 pre-existing failures unrelated)
- What wasn't tested: RevisionService functions against live D1 (will test in Phase 2 integration)
- Edge cases: Concurrent revision approval, orphaned revisions if content deleted

## Next Steps

- [ ] Phase 2: Modify content save route to create pending revisions for published content
- [ ] Phase 3: Build Sync modal UI (replaces Deploy button)
- [ ] Phase 4: Media staging in R2
- [ ] Phase 5: Audit trail integration

---

**Branch:** feature/workflow-staging
**Issue:** N/A
**Impact:** HIGH - foundation for entire editorial workflow feature
