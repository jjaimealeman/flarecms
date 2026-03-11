# 2026-03-11 - Dark Mode Button and UI Fixes Across All Admin Pages

**Keywords:** [UI] [STYLING] [BUG_FIX] [ENHANCEMENT]
**Session:** Afternoon, Duration (~1 hour)
**Commit:** 3d0efea

## What Changed

- File: `packages/core/src/templates/pages/*.template.ts` (43 files)
  - Changed all primary CTA buttons from `dark:bg-white dark:text-zinc-950` to `dark:bg-blue-600 dark:text-white`
  - Changed hover states from `dark:hover:bg-zinc-100` to `dark:hover:bg-blue-700`
  - Buttons now render as blue in dark mode instead of confusingly white
- File: `packages/core/src/templates/pages/admin-collections-form.template.ts`
  - Fixed CSS-based `.btn-primary` dark mode: `background: white` to `background: #2563eb` (blue-600)
- File: `packages/core/src/templates/pages/admin-forms-builder.template.ts`
  - Fixed CSS-based `.btn-primary` dark mode for Form.io components
- File: `packages/core/src/templates/pages/admin-plugins-list.template.ts`
  - Fixed Install button edge case (used `dark:text-zinc-900` variant)
- File: `packages/core/src/templates/pages/admin-settings.template.ts`
  - Fixed disabled button variants: `dark:bg-white/50` to `dark:bg-blue-600/50`
- File: `packages/core/src/templates/pages/admin-forms-list.template.ts`
  - Fixed search input height mismatch: added `h-[38px]` and `px-3`
  - Fixed dropdown border: matched to search input style (`border-2 border-blue-200/50`)
- File: `packages/core/src/templates/pages/admin-collections-list.template.ts`
  - Fixed Search button: blue gradient replaced with `bg-zinc-950 dark:bg-blue-600`
- File: `packages/core/src/templates/pages/admin-content-list.template.ts`
  - Fixed Search button: same gradient-to-solid fix
- File: `packages/core/src/templates/components/table.template.ts`
  - Fixed checkbox borders: `border-white/10` to `border-zinc-400 dark:border-zinc-600`
- File: `packages/core/src/templates/table.template.ts`
  - Same checkbox border fix (duplicate table template)

## Why

Dark/light mode toggle was added in v1.8.0 but primary CTA buttons inverted to white in dark mode, making them look like secondary/outline buttons. This was the #1 issue from a full UI audit. The fix standardizes all primary buttons to blue-600 in dark mode across every admin page, plus resolves several secondary issues: invisible form borders in light mode, faint checkbox borders, and misaligned form elements.

## Issues Encountered

No major issues encountered. The bulk fix required a targeted perl script due to 50+ instances across 43 files — manual editing would have been impractical. Used negative lookahead to avoid touching `dark:bg-white/5` (form inputs) and `dark:bg-white/10` (secondary elements).

## Dependencies

No dependencies added.

## Testing Notes

- **What was tested:** Full visual audit by Claude Chrome across all admin pages in both light and dark mode
- **What wasn't tested:** Mobile responsive behavior, print styles
- **Edge cases:** Icon containers (`bg-zinc-950 dark:bg-white` on 10x10 circles) intentionally left inverted

## Next Steps

- [ ] Deploy to production and verify on live site
- [ ] Consider extracting button classes into shared CSS custom properties for easier future theming

---

**Branch:** feature/dark-mode-fix
**Issue:** N/A
**Impact:** MEDIUM - visual-only changes across all admin template files
