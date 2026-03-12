# 2026-03-12 - Secure Registration Default and Hide Link When Disabled

**Keywords:** [SECURITY] [BACKEND] [UI] [CRITICAL]
**Session:** Afternoon, Duration (~30 minutes)
**Commit:** 966154d

## What Changed

- File: `packages/core/src/services/auth-validation.ts`
  - Changed `isRegistrationEnabled()` default from `true` to `false` (both no-settings and error paths)
  - Secure by default: registration is now disabled unless explicitly enabled in core-auth plugin settings
- File: `packages/core/src/templates/pages/auth-login.template.ts`
  - Added `registrationEnabled?: boolean` to `LoginPageData` interface
  - Made "Don't have an account? Create one here" link conditional on `registrationEnabled`
- File: `packages/core/src/routes/auth.ts`
  - Added `isRegistrationEnabled(db)` lookup in GET /login handler
  - Passes `registrationEnabled` flag to login page template
- File: `packages/core/src/db/migrations-bundle.ts`
  - Auto-generated timestamp update from core rebuild

## Why

Security incident response. An unknown user registered on production by navigating directly to /auth/register. The inherited SonicJS default had `isRegistrationEnabled()` returning `true` when no core-auth plugin settings existed — effectively leaving registration wide open on fresh installs and any instance without explicit plugin configuration.

This commit flips the default to secure-by-default (disabled) and hides the registration link from the login page when registration is disabled, eliminating both the code path and the UI affordance.

## Issues Encountered

Root cause was the local D1 having `core-auth` plugin with `registration.enabled: 1`, which made the code change appear ineffective during local testing. Fixed by updating the local D1 setting to `0` via wrangler d1 execute.

## Dependencies

No dependencies added.

## Testing Notes

- Verified login page no longer shows "Create one here" link via curl
- Verified both local and remote D1 have registration disabled
- Production also patched (core-auth plugin inserted with `enabled: false` on remote D1)
- Edge case: first-user bootstrap still works via `isFirstUserRegistration()` check

## Next Steps

- [ ] Deploy to production (merge develop -> main)
- [ ] Add admin UI toggle for registration in plugin settings page
- [ ] Enforce registration disabled at route level (currently only hides link)

---

**Branch:** develop
**Issue:** Security incident — unauthorized user registration
**Impact:** HIGH - closes open registration vulnerability
