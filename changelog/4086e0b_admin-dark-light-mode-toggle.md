# 2026-03-11 - Admin Dark/Light Mode Toggle

**Keywords:** [FEATURE] [UI] [FRONTEND]
**Session:** Late night, Duration (~20 minutes)
**Commit:** 4086e0b

## What Changed

- File: `packages/core/src/templates/icons.ts`
  - Added Sun and Moon icons from lucide-static
- File: `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts`
  - Added dark mode init script to `<head>` to prevent FOUC (flash of unstyled content)
  - Added `toggleDarkMode()` function
  - Added toggle button in user dropdown menu (between My Profile and Sign Out)
  - Shows moon icon + "Dark Mode" in light mode, sun icon + "Light Mode" in dark mode
  - Removed duplicate dark mode init from bottom of page
- File: `packages/core/src/templates/layouts/admin-layout-v2.template.ts`
  - Added dark mode toggle button in top bar (next to notifications)
- File: `packages/core/src/db/migrations-bundle.ts`
  - Timestamp update from rebuild
- File: `.planning/future/showcase-demo-sites.md`
  - Added planning doc for showcase demo sites milestone

## Why

The admin UI already had full dark mode support via Tailwind `dark:` classes and `localStorage` persistence, but no way for users to toggle it. This adds a clean toggle in the user dropdown menu — keeping the sidebar uncluttered while making the preference easily accessible.

## Issues Encountered

No major issues encountered. FOUC prevention required moving the dark mode init from bottom-of-page script to a blocking `<script>` in `<head>`.

## Dependencies

No dependencies added. Sun/Moon icons already available in lucide-static.

## Testing Notes

- Toggling flips between light and dark mode instantly
- Preference persists across page loads via localStorage
- FOUC prevention verified — no white flash on dark mode reload
- Both Catalyst (prod) and V2 layouts updated

## Next Steps

- [ ] Plugin Astro snippet generator (next feature)
- [ ] Public API rate limiting

---

**Branch:** feature/admin-dark-light-toggle
**Issue:** N/A
**Impact:** LOW - UI toggle, no data or API changes
