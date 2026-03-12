# Security Hardening

## Overview

Critical security gaps discovered during the March 12 incident where an unknown user
(aflamrip@gmail.com) registered on production. Registration was open by default because
the `isRegistrationEnabled()` function returns `true` when no `core-auth` plugin settings
exist. Password was also the default `admin123`.

**Incident resolved:** Registration disabled via DB, password changed, account deleted.

---

## 1. Registration Toggle in Admin Settings (HIGH)

Currently registration is controlled by a `core-auth` plugin row in the DB with no UI.
The only way to toggle it is direct SQL.

### Requirements
- Add "Allow Public Registration" toggle to `/admin/settings`
- Default: **disabled** (flip the current default — secure by default)
- When disabled, hide "Create one here" link on login page (currently still shows, just errors)
- When enabled, optionally set default role for new registrations (currently hardcoded to `viewer`)

### Code Locations
- `packages/core/src/services/auth-validation.ts:39` — `return true` default needs to flip to `false`
- `packages/core/src/templates/pages/auth-login.template.ts` — "Create one here" link needs conditional
- `packages/core/src/routes/admin-settings.ts` — add registration settings section

---

## 2. Roles & Permissions Enforcement (CRITICAL)

Roles exist as labels (`admin`, `editor`, `author`, `viewer`) and are **partially enforced**.

### What works (tested March 12 with viewer account):
- `/admin/users` — blocked with "You do not have permission" (redirects to login)
- `/admin/plugins` — blocked with "Access denied"
- `/admin/content` — loads but shows empty (no collection permissions assigned)

### What doesn't work:
- Sidebar still shows links to pages the user can't access (Users, Plugins, Settings, etc.)
- No middleware for Collections, Forms, FAQs, Cache, Migrations, Deploy, Settings pages
- No UI button hiding/disabling based on role
- `user_collection_permissions` table controls content access but there's no UI to manage it
- See `roles-permissions-audit-demo.md` for full plan

---

## 3. Password Salt (MEDIUM)

`packages/core/src/middleware/auth.ts:80` has:
```js
const data = encoder.encode(password + 'salt-change-in-production')
```

This is a hardcoded salt inherited from SonicJS. PBKDF2 with 100k iterations is still
strong, but the salt should be per-user (it already is via the stored hash format
`pbkdf2:iterations:salt:hash`, so this line may be dead code or only used for initial
hashing). Needs audit.

---

## 4. Secure Defaults Audit (HIGH)

Things that should be secure by default but aren't:

| Setting | Current Default | Should Be |
|---------|----------------|-----------|
| Public registration | enabled | **disabled** |
| Default new user role | viewer | viewer (OK) |
| API rate limiting | basic | needs per-endpoint tuning |
| CORS | permissive | restrict to known origins |
| Admin path | `/admin` (guessable) | consider custom prefix option |

---

## 5. Session & Auth Hardening (MEDIUM)

- No session expiry — cookies persist indefinitely
- No "force logout all sessions" capability
- No login attempt lockout (rate limit exists but no account lockout)
- No email verification requirement (users can skip)
- Password minimum is 8 chars — consider requiring complexity

---

## 6. API Security (MEDIUM)

- Public API endpoints (`/v1/*`) have basic rate limiting but no API key auth
- No per-collection access control (all or nothing)
- No request size limits beyond Cloudflare defaults
- Missing `X-Content-Type-Options`, `X-Frame-Options` headers on API responses

---

## 7. Missing Tables — Code References Non-Existent Tables (HIGH)

Multiple tables referenced in code but never created by migrations. Causes hard crashes
for non-admin users and on user edit pages.

### Tables created manually (March 12):
- `user_profiles` — referenced by `/admin/users/:id/edit`, caused "Failed to load user" error
- `user_collection_permissions` — referenced by `/admin/content`, caused D1_ERROR for viewers

### Fix applied:
- Tables created on both local and remote D1
- `user_profiles` query wrapped in try/catch in `admin-users.ts` for resilience

### TODO:
- Audit ALL table references in code vs actual migrations to find more gaps
- Add these tables to the migration bundle so fresh installs work
- Consider a startup health check that verifies all expected tables exist

---

## 8. Soft Delete Bug (LOW)

Known inherited bug: soft-delete doesn't cascade and doesn't actually remove data.
The Aflam Rip account was "deleted" via UI but remained in DB as `is_active: 0`.
Hard delete required direct SQL.

---

## Priority Order

1. **Registration toggle + secure default** — prevents the exact incident that happened
2. **Missing tables in migrations** — causes hard crashes for non-admin users
3. **Roles enforcement** — the #1 feature blocker (also blocks live demo)
4. **Sidebar nav filtering by role** — don't show links users can't access
5. **Session hardening** — expiry, force logout
6. **Password salt audit** — verify it's not actually a vulnerability
7. **API security headers** — quick wins
8. **Soft delete cascade** — fix inherited bug

---

## Related Plans
- `roles-permissions-audit-demo.md` — full roles/permissions/audit/demo system
- `admin-settings-overhaul-PRD.md` — settings page improvements
