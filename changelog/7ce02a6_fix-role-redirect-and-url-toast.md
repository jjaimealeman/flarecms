# 2026-03-12 - Fix Role Redirect to Dashboard with Toast Notification

**Keywords:** [SECURITY] [UI] [BUG_FIX]
**Session:** Afternoon, Duration (~15 minutes)
**Commit:** 7ce02a6

## What Changed

- File: `packages/core/src/middleware/auth.ts`
  - Changed `requireRole` redirect from `/auth/login?error=...` to `/admin?error=...`
  - Unauthorized users now land on dashboard with toast instead of being dumped to login
- File: `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts`
  - Added URL param toast reader that picks up `?error=` and `?message=` query params
  - Shows notification via existing `showNotification()` system
  - Cleans URL after displaying toast (replaceState)

## Why

When a non-admin user manually navigates to a restricted route (e.g. `/admin/settings`), the `requireRole` middleware was redirecting to the login page — confusing for an already-authenticated user. Now they get redirected to the dashboard with a clear "You do not have permission" toast notification. Combined with the sidebar filtering from the previous commit, restricted routes are both hidden from navigation and gracefully handled if accessed directly.

## Issues Encountered

No major issues encountered. The `showNotification()` function and `notification-container` element already existed in the layout — just needed to wire up URL param reading.

## Dependencies

No dependencies added.

## Testing Notes

- What was tested: Build succeeds, code paths verified
- What wasn't tested: Live browser testing (pending deploy)
- Edge cases: URL cleanup handles missing params gracefully

## Next Steps

- [ ] Merge to develop, then main for deploy
- [ ] Test with organizedfellow@gmail.com viewer account on production
- [ ] Verify sidebar items are hidden AND direct URL access redirects properly

---

**Branch:** feature/roles-enforcement
**Issue:** N/A
**Impact:** MEDIUM - security UX improvement for role-based access
