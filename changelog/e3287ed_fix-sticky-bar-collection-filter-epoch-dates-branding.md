# 2026-03-10 - Fix Sticky Save Bar, Collection Filter, Epoch Dates, SonicJS Branding

**Keywords:** [UI] [BUG_FIX] [FRONTEND] [ROUTING]
**Session:** Late night → morning, Duration (~2 hours)
**Commit:** e3287ed

## What Changed

- File: `packages/core/src/templates/pages/admin-content-form.template.ts`
  - Moved sticky save bar outside `overflow-hidden` form container — fixes `position: sticky` not working
  - Removed `overflow-hidden` from form container div
  - Added year >= 2000 guard on created_at, updated_at, published_at timestamps — shows "Not set" for epoch dates
- File: `packages/core/src/routes/admin-content.ts`
  - Content list route now reads `?collection=<id>` param alongside `?model=<name>`
  - Resolves collection ID to model name so sidebar links filter the list correctly
  - Added epoch date guard on `formattedDate` in content list table rows
- File: `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts`
  - Enlarged sidebar logo from `md` (h-8) to `lg` (h-12), centered in header
  - Moved version badge to bottom-right of sidebar header as small text
  - Removed old version badge section from between Settings and User
  - Added `?model=` active state detection for sidebar collection items
- File: `packages/core/src/templates/pages/admin-users-list.template.ts`
  - Fixed stats cards: `bg-zinc-800/75` → `bg-white dark:bg-zinc-800/75` for light mode
- File: `packages/core/src/db/migrations-bundle.ts`
  - Replaced all "SonicJS AI" references with "Flare CMS" in migration SQL comment and FAQ seed data (10 occurrences)

## Why

Addresses remaining UX issues from Chrome extension review rounds 2-4. The sticky save bar was the most critical — `position: sticky` was broken because the bar sat inside a parent with `overflow: hidden`. Moving it outside the form container to be a sibling of the page content wrapper fixes the CSS containment issue. The collection filter fix connects the sidebar "All [Collection]" links to the content list's Model dropdown filter. Epoch date guards prevent "Jan 21, 1970" from displaying on seeded content.

## Issues Encountered

- Sticky bar `position: sticky` was silently broken by `overflow: hidden` on parent container — no visual error, just didn't stick
- Settings table used `siteName` (camelCase) not `site_name` — initial UPDATE query returned empty results until correct key was found
- DB-level fixes (duplicate blog_posts collection, SonicJS AI site name) required wrangler D1 commands, not code changes

## Dependencies

No dependencies added.

## Testing Notes

- Build passes cleanly (`pnpm build`)
- 1285 tests pass (1 pre-existing failure in dynamic-field-extended.test.ts, unrelated)
- Chrome extension verified: collection filter, stats cards, epoch dates all confirmed working
- Sticky bar fix needs browser verification after this build (moved outside overflow container)
- DB fixes verified via wrangler queries: single blog-posts collection, siteName = "Flare CMS"

## Next Steps

- [ ] Verify sticky save bar works in browser after this commit
- [ ] Run same DB fixes on remote D1 before production deploy
- [ ] Media Library phantom overlay investigation (browser-side Alpine.js state)

---

**Branch:** feature/admin-ui-overhaul
**Issue:** N/A
**Impact:** HIGH - fixes sticky save bar (critical UX), collection navigation, date display, branding
