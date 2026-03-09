# 2026-03-09 - Use Top-Level Slug Fallback in getBlogPostBySlug

**Keywords:** [FIX] [FRONTEND] [API]
**Session:** Retroactive backfill
**Commit:** 75067cf

## What Changed

- File: `packages/site/src/lib/flare.ts`
  - Changed slug match from `post.data.slug === slug` to `(post.data.slug || post.slug) === slug`
  - Fixes 404 on blog detail pages where CMS stores slug at root level

- File: `packages/site/src/pages/blog/[slug].astro`
  - Changed title access from `cmsPost.data.title` to `cmsPost.data.title || cmsPost.title`
  - Handles both data shapes (nested vs root-level)

## Why

Same root cause as the previous two fixes — the CMS API returns slug and title at the root level of the content item, not always inside `item.data`. The `getBlogPostBySlug` function and the detail page template were only checking `item.data.slug/title`, causing 404s on valid blog posts.

## Issues Encountered

Third fix for the same root cause. The CMS API shape inconsistency (fields at root vs nested in `.data`) was discovered incrementally across the loader, listing page, and detail page.

## Dependencies

No dependencies added.

## Testing Notes

Retroactive — not tested at generation time.

## Next Steps

- [ ] Consider normalizing the CMS API response shape to always nest fields in `.data`

---

**Branch:** develop
**Issue:** N/A
**Impact:** MEDIUM - fixes broken blog detail page rendering
