# 2026-03-13 - Admin UI Overhaul: Sidebar Fix, Font Swap, Settings Tabs

**Keywords:** [ADMIN] [UI] [SETTINGS] [SIDEBAR] [FONT]
**Session:** Late night, Duration (~3 hours)
**Commit:** 69259b8

## What Changed

- File: `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts`
  - Added `setCatalystDynamicMenuItems()` export for middleware to inject collection menu items
  - Added module-level `_pendingMenuItems` with auto-injection in `renderAdminLayoutCatalyst()`
  - Swapped Inter font to Outfit (import URL + body font-family)
- File: `packages/core/src/middleware/admin-menu.ts`
  - Imported `setCatalystDynamicMenuItems` from Catalyst template
  - Called both V2 and Catalyst setters in middleware handler
- File: `packages/core/src/templates/layouts/admin-layout-v2.template.ts`
  - Swapped Inter font to Outfit (import URL + body font-family)
- File: `packages/core/src/templates/pages/admin-preview.template.ts`
  - Swapped Inter font to Outfit (import URL + body font-family)
- File: `packages/core/src/services/settings.ts`
  - Added `AppearanceSettings`, `NotificationSettings`, `StorageSettings` interfaces
  - Added default objects for each settings type
  - Added 6 new methods: get/save for appearance, notifications, storage
- File: `packages/core/src/routes/admin-settings.ts`
  - Wired GET/POST routes for appearance, notifications, storage tabs
  - Routes read from D1 via SettingsService, POST handlers save to DB
  - Fixed type assertions for theme, frequency, provider, backup enums
- File: `packages/core/src/templates/pages/admin-settings.template.ts`
  - Removed WIP banners from Appearance, Notifications, Storage tabs
  - Enabled save buttons with JS handlers for all 3 tabs
  - Applied Catalyst styling consistency
- File: `packages/core/src/__tests__/templates/admin-layout-catalyst.test.ts`
  - Updated font test: expects Outfit instead of Inter
- File: `packages/core/src/db/migrations-bundle.ts`
  - Regenerated timestamp

## Why

The admin sidebar was broken on all pages except Dashboard — 27 templates called `renderAdminLayoutCatalyst()` directly, bypassing V2's wrapper that auto-injected dynamic menu items. The font swap aligns admin UI with the frontend's Outfit typeface. Settings tabs (Appearance, Notifications, Storage) were previously mock-only with WIP banners — now they persist to D1.

## Issues Encountered

- Root cause of sidebar inconsistency was non-obvious: Catalyst layout had no equivalent of V2's `setDynamicMenuItems()` pattern, so middleware only fed V2
- 3 pre-existing test failures in sidebar nav tests (not caused by our changes — structure diverged in prior work)

## Dependencies

No dependencies added

## Testing Notes

- What was tested: Font loading test updated to expect Outfit
- What wasn't tested: Settings save handlers (manual browser testing), sidebar rendering on all 27 admin pages
- Edge cases: Concurrent request safety for `_pendingMenuItems` (safe — set→render is synchronous, no await between)

## Next Steps

- [ ] Verify CSP fix works after wrangler restart
- [ ] Fix 3 pre-existing sidebar nav test failures
- [ ] Additional admin UI overhaul scope from Jaime

---

**Branch:** feature/admin-ui-overhaul
**Issue:** N/A
**Impact:** HIGH - affects all admin pages (sidebar) + all settings tabs
