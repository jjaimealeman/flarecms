# 2026-03-12 - Fix Missing Tables, Disable Registration, Security Hardening Plan

**Keywords:** [BUG_FIX] [DATABASE] [SECURITY]
**Session:** Late night, Duration (~1 hour)
**Commit:** 1e93118

## What Changed

- File: `packages/core/src/routes/admin-users.ts`
  - Wrapped `user_profiles` query in try/catch so user edit page loads even if table is missing
- File: `packages/core/src/db/migrations-bundle.ts`
  - Regenerated timestamp (rebuild artifact)
- File: `.planning/future/security-hardening.md`
  - Created comprehensive security hardening plan with 8 prioritized items
  - Documented the March 12 incident (unknown user registered on production)
  - Documented missing tables pattern, partial role enforcement findings, secure defaults audit

## Why

An unknown user (aflamrip@gmail.com) registered on production because registration defaults to enabled when no `core-auth` plugin settings exist. The user edit page crashed with "Failed to load user" because `user_profiles` table was never created by migrations. Content page crashed for non-admin users because `user_collection_permissions` table was also missing. Both tables were created directly on local and remote D1. Registration was disabled via direct DB insert of `core-auth` plugin settings. Admin password changed from default `admin123`.

## Issues Encountered

- `isRegistrationEnabled()` returns `true` by default when no settings exist — insecure default
- Multiple tables referenced in code but never created by migrations (inherited from SonicJS)
- Soft-delete doesn't actually remove users — had to hard delete via SQL
- "Create one here" link still shows on login page even when registration is disabled

## Dependencies

No dependencies added

## Testing Notes

- Verified registration blocked on production (redirects to login with error)
- Verified user edit page loads with try/catch fix
- Verified content page loads after `user_collection_permissions` table created
- Tested viewer role: blocked from Users and Plugins, content shows empty (no permissions assigned)

## Next Steps

- [ ] Flip `isRegistrationEnabled` default to `false` (secure by default)
- [ ] Hide "Create one here" link when registration disabled
- [ ] Add registration toggle to admin Settings UI
- [ ] Add missing tables to migration bundle
- [ ] Audit all table references vs actual migrations
- [ ] Filter sidebar nav links by user role

---

**Branch:** hotfix/missing-tables-and-registration
**Issue:** N/A
**Impact:** HIGH - security fix, prevents unauthorized registration, fixes crash on user edit
