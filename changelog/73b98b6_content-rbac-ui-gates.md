# 2026-03-12 - Content RBAC UI Gates for Collection Picker, Create, and Edit Forms

**Keywords:** [SECURITY] [BACKEND] [ROUTING] [FEATURE]
**Session:** Night, Duration (~30 minutes)
**Commit:** 73b98b6

## What Changed

- File: `packages/core/src/routes/admin-content.ts`
  - Added RBAC filtering to "New Content" collection picker — non-admin users only see collections where they have editor or author role
  - Added empty state message when user has no create-eligible collections
  - Added `checkCollectionPermission` gate before rendering the create content form
  - Added `checkCollectionPermission` + `isAuthorAllowedToEdit` gate before rendering the edit content form
  - Authors are blocked from editing content they didn't author

## Why

The RBAC service (`rbac.ts`), database table (migration 034), and API-level gates on create/update/delete were already built in previous sessions. The content list was already filtering by `allowedCollectionIds`. However, the admin UI still had gaps — the "New Content" collection picker showed all collections regardless of permissions, and the create/edit form routes had no permission checks. This closes those gaps so RBAC is enforced at both the UI and API layers.

## Issues Encountered

No major issues encountered. The `migrations-bundle.ts` timestamp changed from the build but has no functional impact.

## Dependencies

No dependencies added.

## Testing Notes

- What was tested: Build passes, existing tests unaffected (6 pre-existing failures, none RBAC-related)
- What wasn't tested: Manual UI testing with non-admin user planned for next session
- Edge cases: Viewer-only users should see empty collection picker; authors should be blocked from editing others' content

## Next Steps

- [ ] Test as organizedfellow with viewer/author/editor roles on different collections
- [ ] Verify author ownership check works correctly on edit form
- [ ] Verify empty state renders when user has no create-eligible collections

---

**Branch:** feature/content-rbac
**Issue:** N/A
**Impact:** MEDIUM — completes per-collection RBAC enforcement across all admin UI surfaces
