# 2026-03-09 - Include Top-Level Title/Slug in Loader Data Flattening

**Keywords:** [FIX] [BACKEND] [ASTRO]
**Session:** Retroactive backfill
**Commit:** bbed96f

## What Changed

- File: `packages/astro/src/loader.ts`
  - Added `title: item.title` and `slug: item.slug` before spreading `...item.data`
  - Ensures top-level CMS fields are available in Astro's content store

- File: `packages/astro/src/live-loader.ts`
  - Same fix: added `title: item.title` and `slug: item.slug` to `mapItemToEntry()`

## Why

The CMS API returns title and slug at the root level of content items, not inside `item.data`. The Astro Content Layer loaders were only spreading `item.data` into the store, causing Zod schema validation to fail with "title: Required, slug: Required" errors. By prepending the root-level fields before the spread, they're available as defaults (and overridden if also present in `item.data`).

## Issues Encountered

Root cause of a cascade of follow-up fixes (2c75184, 75067cf) — the API shape inconsistency was first caught here in the loader layer.

## Dependencies

No dependencies added.

## Testing Notes

Retroactive — not tested at generation time.

## Next Steps

- [ ] Consider adding integration test that validates loader output shape
- [ ] Normalize CMS API to always include title/slug in both locations

---

**Branch:** develop
**Issue:** N/A
**Impact:** HIGH - fixes Zod validation failures breaking Astro builds
