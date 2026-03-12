# 2026-03-12 - Configurable Security Settings Page

**Keywords:** [SECURITY] [FEATURE] [UI] [BACKEND]
**Session:** Afternoon, Duration (~30 minutes)
**Commit:** 0653ddb

## What Changed

- File: `packages/core/src/services/settings.ts`
  - Added `SecuritySettings` interface with 14 configurable fields
  - Added `SECURITY_DEFAULTS` constant with sensible defaults
  - Added `getSecuritySettings()` method to load from DB with fallback defaults
  - Added `saveSecuritySettings()` method to persist to DB
- File: `packages/core/src/routes/admin-settings.ts`
  - Security GET route now loads real settings from DB via SettingsService
  - Added POST `/admin/settings/security` handler to save security settings
  - Updated mock settings to match new SecuritySettings interface shape
- File: `packages/core/src/templates/pages/admin-settings.template.ts`
  - Rewrote `renderSecuritySettings()` from scratch — replaced WIP mock with functional form
  - Three card sections: Session, Password Rules, Login Protection
  - All dropdowns use human-readable labels (e.g. "30 minutes" not "30")
  - Every setting has a description explaining what it does and why
  - Remember Me toggle shows/hides duration dropdown
  - Save button wired to fetch POST with loading state and toast notification
  - Updated SecuritySettings interface to match new fields

## Why

The security settings page was a non-functional WIP mock. This makes it real — admin can configure idle timeout, session duration, remember me, password rules, login lockout, and IP whitelist. All settings persist to the D1 `settings` table under the `security` category. Designed to support different deployment scenarios: a personal blog can disable idle timeout, while a law firm can set 15-minute idle timeout with 1-device max sessions and forced password expiry.

## Issues Encountered

No major issues encountered. Build initially failed due to `ipWhitelist: []` being inferred as `never[]` — fixed with explicit `as string[]` annotation.

## Dependencies

No dependencies added.

## Testing Notes

- What was tested: Build passes clean, type checking passes
- What wasn't tested: Live browser testing (pending deploy), actual idle timeout enforcement (settings page only — enforcement is next commit)
- Edge cases: Default values via nullish coalescing ensure first load works with no DB rows

## Next Steps

- [ ] Implement client-side idle timeout using saved settings
- [ ] Wire session duration into JWT generation in auth middleware
- [ ] Add session revocation via KV blacklist
- [ ] Add "Force Logout" button on Users page
- [ ] Enforce password rules on registration/password change
- [ ] Implement login lockout using maxFailedAttempts + lockoutDuration

---

**Branch:** feature/session-hardening
**Issue:** N/A
**Impact:** HIGH - first functional security settings, foundation for all session hardening
