# 2026-03-10 - fix(admin): dedup collections in picker, use admin layout for selection page

**Keywords:** [FIX] [ADMIN] [UI]
**Commit:** 04c43ac

## What Changed

- File: `packages/core/src/routes/admin-content.ts`
  - Content list: deduplicate `models` array by collection name before passing to template
  - "New Content" collection picker: deduplicate collections by name
  - Collection selection page: replaced raw dark-mode HTML with `renderAdminLayout` for consistent chrome

## Why

Duplicate collections could appear in the filter picker and "new content" selection page if the same collection name existed multiple times in D1. The collection selection page was also rendering outside the admin layout with hardcoded dark-mode styling that didn't match the new light-mode default.

## Test Results

- 1285 passed, 1 failed (pre-existing slug pattern test)
- Build clean

## Dependencies

No new dependencies added.

## Next Steps

- [ ] Phase 3.3: Fix "SonicJS AI" site name via Settings admin (manual DB update)

---

**Branch:** feature/admin-ui-overhaul
**Issue:** N/A
**Impact:** LOW
