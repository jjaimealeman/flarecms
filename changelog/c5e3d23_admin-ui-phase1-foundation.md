# 2026-03-10 - Admin UI Overhaul Phase 1: Foundation (Layout, Sidebar, Icons, Color System)

**Keywords:** [UI] [FEATURE] [COMPONENTS] [DEPENDENCIES] [TESTING]
**Session:** Late night, Duration (~1 hour)
**Commit:** c5e3d23

## What Changed

- File: `packages/core/package.json`
  - Added `lucide-static@^0.577.0` dependency for professional SVG icons
- File: `packages/core/tsup.config.ts`
  - Added `lucide-static` to `noExternal` array for bundling
- File: `packages/core/src/templates/icons.ts` (NEW)
  - Created Lucide icon module with 37 icons imported from lucide-static
  - Added `icon()` helper to inject CSS classes into SVG strings
  - Added `collectionIcon()` helper to map collection hints to Lucide SVGs
- File: `packages/core/src/middleware/admin-menu.ts` (NEW)
  - Created admin menu middleware that queries active collections from D1
  - Builds `adminMenuItems` array with label, slug, collectionId, icon
  - Caches results per isolate with 1-minute TTL
- File: `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts`
  - Replaced all 9 inline SVGs with Lucide icon imports
  - Restructured sidebar: Dashboard → CONTENT section (dynamic collections with flyouts, Content, Media) → SYSTEM section (Users, Schema, Forms, Plugins, Cache, Migrations) → Settings (pinned bottom)
  - Replaced `bg-cyan-500/400` active indicators with `bg-blue-600/500`
  - Added `bg-blue-50` active background state for better visual feedback
  - Changed default from dark mode (`class="dark"`) to light mode
  - Added light-mode scrollbar colors alongside dark
  - Changed body from `bg-white` to `bg-slate-50`
  - Added Alpine.js `x-cloak` style for flyout menus
  - Changed logo variant from 'white' to 'dark' for light-mode default
  - User avatar circle changed from `bg-zinc-950` to `bg-blue-600`
  - Collection flyout sub-menus with "All [Name]" and "Add New" links
- File: `packages/core/src/app.ts`
  - Added `adminMenuItems` to Variables type
  - Registered `adminMenuMiddleware()` on `/admin/*` routes
- File: `packages/core/src/middleware/index.ts`
  - Exported `adminMenuMiddleware` and `AdminMenuItem` type
- File: `packages/core/src/templates/index.ts`
  - Exported `icon` and `collectionIcon` from icons module
- File: `packages/core/src/templates/components/logo.template.ts`
  - Changed version badge from `bg-cyan-50 text-cyan-700` to `bg-blue-50 text-blue-700`
- File: `packages/core/src/__tests__/templates/admin-layout-catalyst.test.ts`
  - Updated 5 tests for new sidebar structure, color system, and dynamic menu type

## Why

Phase 1 of the Admin UI/UX Overhaul. The inherited SonicJS admin had a neon color palette (cyan/lime/purple/pink), confusing nav structure splitting "Collections" and "Content", and 9+ inline SVG blobs in the sidebar. This foundation commit establishes:

1. Professional icon system via Lucide (consistent, tree-shakeable)
2. WordPress-style sidebar with CONTENT/SYSTEM sections and collection flyouts
3. Blue-based professional color system replacing neon cyan
4. Dynamic nav middleware querying real collections from D1
5. Light-mode default (dark mode still supported via localStorage toggle)

## Issues Encountered

- `lucide-static` doesn't export individual icon paths (`lucide-static/icons/x`) — no `exports` field in package.json. Switched to barrel import from `lucide-static` which works with tsup bundling.

## Dependencies

- Added: `lucide-static@^0.577.0` (professional SVG icon library, ~37 icons used)

## Testing Notes

- **What was tested:** 68 admin layout tests pass, full build succeeds with lucide-static bundled
- **What wasn't tested:** Visual rendering in browser (requires running dev server), admin-menu middleware DB queries (requires D1)
- **Pre-existing failure:** `dynamic-field-extended.test.ts` has 1 failing test unrelated to this change

## Next Steps

- [ ] Phase 2: Purge all 209 neon color occurrences across 32 template files
- [ ] Phase 3: Sticky save bar, fix Unknown author/dates, cache warning fix
- [ ] Wire `c.get('adminMenuItems')` through all admin route handlers

---

**Branch:** feature/admin-ui-overhaul
**Issue:** N/A
**Impact:** HIGH - Foundation for entire admin UI redesign
