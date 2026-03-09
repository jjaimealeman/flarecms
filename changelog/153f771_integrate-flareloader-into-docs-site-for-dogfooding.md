# 2026-03-09 - Integrate flareLoader into Docs Site for Dogfooding

**Keywords:** [FEAT] [ASTRO] [FRONTEND] [DEPENDENCIES]
**Session:** Retroactive backfill
**Commit:** 153f771

## What Changed

- File: `packages/site/package.json`
  - Added `@flare-cms/astro: "workspace:*"` dependency

- File: `packages/site/src/content.config.ts` (new)
  - Created Astro Content Layer config with 4 collections: blogPosts, news, docs, docsSections
  - All collections use `flareLoader()` with published status filter
  - API URL and token from environment variables

- File: `pnpm-lock.yaml`
  - Updated workspace dependency graph for @flare-cms/astro

## Why

Dogfooding the `@flare-cms/astro` package on the Flare CMS docs site itself. This validates the loader works end-to-end with a real Astro project before publishing it as a standalone package. The existing manual fetch patterns in `flare.ts` remain untouched as a fallback.

## Issues Encountered

No major issues encountered.

## Dependencies

Added: `@flare-cms/astro` (workspace dependency)

## Testing Notes

Retroactive — not tested at generation time. Requires CMS API running for collections to load.

## Next Steps

- [ ] Migrate existing manual fetch code in flare.ts to use `getCollection()` instead
- [ ] Test with CMS running to verify all 4 collections load

---

**Branch:** develop
**Issue:** N/A
**Impact:** MEDIUM - first real-world usage of @flare-cms/astro
