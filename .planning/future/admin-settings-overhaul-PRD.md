# PRD: Admin Settings Overhaul

## Problem

The Settings page has 7 tabs but only 3 are functional (General, Migrations, Database Tools). The remaining 4 (Appearance, Security, Notifications, Storage) show "Work in Progress" banners with mock data. Even the General tab is underutilized — the site name only feeds into OTP login emails.

Settings values are hardcoded throughout the codebase instead of reading from the `SettingsService`. This makes the admin feel incomplete and forces code changes for basic configuration.

## Goal

Wire ALL settings tabs to real D1-backed persistence and make the codebase consume them. Every setting the admin exposes should actually change system behavior.

## Existing Infrastructure

- **SettingsService** (`packages/core/src/services/settings.ts`) — fully functional key/value store in D1 with `INSERT ... ON CONFLICT DO UPDATE`. Supports any category/key pair.
- **Settings table** in D1 — `id, category, key, value (JSON), created_at, updated_at` with unique constraint on `(category, key)`
- **General tab** already reads/writes via `SettingsService.getGeneralSettings()` / `saveGeneralSettings()`
- **Template** (`admin-settings.template.ts`) — 700+ lines, all form UI already stubbed with proper field names

## Scope

### General Tab (expand)

| Setting | Current State | Wire To |
|---------|--------------|---------|
| Site Name | Saves to D1, only used by OTP plugin | API responses, email templates, admin header, `<title>` tags |
| Site Description | Saves to D1, unused | API `/api/site` endpoint, OG description |
| Site URL | **NEW** | OG tags, canonical URLs, email links |
| Admin Email | Saves to D1, unused | Error notifications, contact forms |
| Timezone | Saves to D1, unused | Timestamp display throughout admin |
| Language | Saves to D1, unused | `<html lang="">` attribute |
| Maintenance Mode | Saves to D1, unused | Middleware that returns 503 to frontend, bypasses admin |
| Show Version in Footer | **NEW** | Toggle `v1.5.0 · 2346ff5` in admin footer |

### Storage Tab (wire to real config)

| Setting | Current State | Wire To |
|---------|--------------|---------|
| Max File Size | Mock 10MB | `admin-media.ts` upload validation (currently hardcoded 50MB) |
| Allowed File Types | Mock list | Media upload `fileValidationSchema` (currently hardcoded) |
| Show R2 Usage | Mock | Real R2 bucket stats (already on dashboard) |
| Show D1 Size | Mock | Real D1 metadata (already on dashboard) |

### Security Tab (wire to real auth)

| Setting | Current State | Wire To |
|---------|--------------|---------|
| Session Timeout | Mock 30min | JWT `exp` claim in auth middleware (currently hardcoded) |
| Password Min Length | Mock 8 | Registration/password-change validation |
| Require Uppercase | Mock true | Registration validation |
| Require Numbers | Mock true | Registration validation |
| Require Symbols | Mock false | Registration validation |

### Notifications Tab (wire to real events)

| Setting | Current State | Wire To |
|---------|--------------|---------|
| Content Updates | Mock | Activity log hook — email admin on content publish |
| System Alerts | Mock | Error handler — email admin on 500 errors |
| User Registrations | Mock | Auth hook — email admin on new signups |
| Email Frequency | Mock | Batch vs immediate delivery |

*Note: Requires email sending capability (SendGrid/Resend). If no email provider configured, show "Configure email provider first" instead of toggles.*

### Appearance Tab (limited scope)

| Setting | Current State | Wire To |
|---------|--------------|---------|
| Theme Default | Mock | `<html>` class in layout (light/dark/auto) |
| Primary Color | Mock | Tailwind config `extend.colors.primary` |
| Logo URL | Mock | Admin sidebar logo, email headers |
| Custom CSS | Mock | `<style>` block injected in admin layout |

*Keep scope minimal — no full theme builder. Just the basics that change visible behavior.*

## Architecture

1. Each tab's GET route reads from `SettingsService.getCategorySettings(tabName)` instead of `getMockSettings()`
2. Each tab's POST route saves via `SettingsService.setMultipleSettings(tabName, formData)`
3. A new `getSettings()` helper (cached per request) is available to any route/middleware
4. Consuming code reads settings at startup or per-request depending on sensitivity

## Out of Scope

- Theme marketplace / plugin system for appearance
- SMTP server configuration UI (use env vars)
- IP whitelist enforcement (complex, low value for Workers)
- Backup/restore functionality
- Two-factor authentication implementation

## Success Criteria

1. All 7 tabs save to and read from D1 (no mock data)
2. Changing Site Name updates admin header, email templates, and API responses
3. Changing Max File Size actually limits uploads
4. Changing Session Timeout actually changes JWT expiry
5. Maintenance Mode returns 503 to frontend visitors
6. Show Version toggle hides/shows footer version badge

## Estimated Scope

- ~4-5 phases if done via GSD
- Mostly route + middleware changes, minimal new UI (forms already exist)
- Phase 1: General tab expansion + consumers
- Phase 2: Storage tab + media route integration
- Phase 3: Security tab + auth middleware integration
- Phase 4: Notifications tab + email hooks
- Phase 5: Appearance tab + layout integration
