# 2026-03-09 - Fall Back to Top-Level Slug/Title for Blog Post Links

**Keywords:** [FIX] [FRONTEND]
**Session:** Retroactive backfill
**Commit:** 2c75184

## What Changed

- File: `packages/site/src/pages/blog/index.astro`
  - Changed `p.data.slug` to `p.data.slug || p.slug` in CMS post normalization
  - Changed `p.data.title` to `p.data.title || p.title` in CMS post normalization

## Why

CMS API returns slug and title at the root level of content items. The blog listing page was only reading from `p.data.slug/title`, causing blog cards to render with undefined slugs (broken links) and missing titles.

## Issues Encountered

No major issues encountered. Two-line fix.

## Dependencies

No dependencies added.

## Testing Notes

Retroactive — not tested at generation time.

## Next Steps

- [ ] Audit other pages for the same `item.data.field` vs `item.field` pattern

---

**Branch:** develop
**Issue:** N/A
**Impact:** MEDIUM - fixes broken blog listing links
