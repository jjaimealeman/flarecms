# 2026-03-10 - fix(admin): wire dynamic sidebar, fix stat cards, kill neon stragglers

**Keywords:** [FIX] [ADMIN] [UI]
**Commit:** 7bbbbd4

## What Changed

- File: `packages/core/src/templates/layouts/admin-layout-v2.template.ts`
  - Added `setDynamicMenuItems()` + module-level auto-injection in `renderAdminLayout`
  - Updated `dynamicMenuItems` type from `{ path }` to `{ slug, collectionId }` to match catalyst layout
  - v2 sidebar maps dynamic items to `/admin/content?collection={id}` URLs
- File: `packages/core/src/middleware/admin-menu.ts`
  - Imports and calls `setDynamicMenuItems()` so all pages get collection nav items automatically
- File: `packages/core/src/templates/index.ts`
  - Exports `setDynamicMenuItems` from templates module
- File: `packages/core/src/templates/pages/admin-dashboard.template.ts`
  - Stat cards: `bg-zinc-800/75` → `bg-white dark:bg-zinc-800/75` for light mode
  - Card value colors bumped to `-600` for light mode contrast
- File: `packages/core/src/routes/admin-dashboard.ts`
  - System status HTMX endpoint: replaced lime/cyan/pink neon colors
- File: `packages/core/src/routes/admin-api-tokens.ts`
  - Replaced lime badge colors with emerald
- File: `packages/core/src/routes/admin-content.ts`
  - Replaced lime button/icon colors with emerald
- File: `packages/core/src/routes/auth.ts`
  - Replaced lime success indicator colors with emerald

## Why

The sidebar's dynamic collection nav was wired in Phase 1 middleware but never connected to the layout rendering. Stat cards had hardcoded dark backgrounds that looked wrong in light mode. Several route files had neon colors that were missed by the Phase 2 template-only sed sweep.

## Test Results

- 1285 passed, 1 failed (pre-existing slug pattern test)
- Build clean
- `grep cyan-[4-6]|lime-[4-6]|pink-[4-6]` returns zero matches

## Dependencies

No new dependencies added.

## Next Steps

- [ ] Phase 3.3: Fix "SonicJS AI" site name via Settings admin
- [ ] Phase 3.5: Fix duplicate collections in content list picker
- [ ] Phase 3.6: Clean up legacy v2 layout (low priority — already delegates to catalyst)

---

**Branch:** feature/admin-ui-overhaul
**Issue:** N/A
**Impact:** MEDIUM
