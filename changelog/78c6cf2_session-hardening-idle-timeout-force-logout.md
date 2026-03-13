# 2026-03-12 - Session Hardening: Idle Timeout and Force Logout

**Keywords:** [FEATURE] [SECURITY] [BACKEND] [UI]
**Session:** Evening, Duration (~15 minutes)
**Commit:** 78c6cf2

## What Changed

- File: `packages/core/src/middleware/auth.ts`
  - Added KV blacklist check after token verification
  - Revoked users get cookie cleared and redirected to login with message
- File: `packages/core/src/routes/admin-settings.ts`
  - Added `GET /admin/settings/api/idle-config` endpoint returning idle timeout settings as JSON
- File: `packages/core/src/routes/admin-users.ts`
  - Added `POST /admin/users/:id/force-logout` route
  - Writes `revoked:{userId}` to KV with 24h TTL
  - Prevents self-logout, logs activity
- File: `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts`
  - Injected client-side idle timeout JS that fetches config from API
  - Tracks mouse/keyboard/click/scroll/touch activity
  - Shows warning modal with countdown before logout
  - Auto-redirects to `/auth/logout` when idle time expires
- File: `packages/core/src/templates/pages/admin-users-list.template.ts`
  - Added Force Logout button (amber, door-arrow icon) per user row
  - Added confirmation dialog and `performForceLogout()` JS function
- File: `packages/core/src/db/migrations-bundle.ts`
  - Regenerated (timestamp update only)

## Why

Completes the final two items of the security hardening roadmap. The idle timeout was already configurable in Settings but not enforced — now client-side JS reads the saved settings and enforces them. Force logout enables admins to immediately revoke a user's session via KV blacklist, which is checked on every authenticated request.

## Issues Encountered

No major issues encountered. Used DOM API instead of innerHTML for the idle warning modal to satisfy CSP/security requirements.

## Dependencies

No dependencies added.

## Testing Notes

- **What was tested:** Build passes clean, settings and cache tests pass (62/62)
- **What wasn't tested:** E2E idle timeout flow, force logout KV integration (requires running dev server with KV)
- **Edge cases:** idleTimeout=0 disables idle timeout, self-logout prevention on force-logout route

## Next Steps

- [ ] Test idle timeout warning modal in dev server
- [ ] Test force logout flow with two browser sessions
- [ ] Content RBAC — wire rbac.ts into admin-content.ts routes

---

**Branch:** feature/session-hardening
**Issue:** N/A
**Impact:** MEDIUM — adds session enforcement and admin session management
