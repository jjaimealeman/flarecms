# 2026-03-09 - Implement Build-Time Astro Content Layer Loader

**Keywords:** [FEAT] [BACKEND] [ASTRO]
**Session:** Retroactive backfill
**Commit:** 0a8c5b8

## What Changed

- File: `packages/astro/src/loader.ts` (new, 127 lines)
  - `flareLoader()` returns Astro Loader with name, load, and schema properties
  - `load()` fetches content via FlareClient, flattens `item.data`, filters by status client-side
  - `schema()` dynamically fetches CMS collection schema and converts to Zod via `flareSchemaToZod()`
  - Falls back to permissive passthrough schema if CMS is unreachable
  - Handles CMS downtime gracefully — warns instead of crashing builds

- File: `packages/astro/src/index.ts`
  - Added `flareLoader` export to barrel file
  - Updated module description

## Why

Core feature of the `@flare-cms/astro` package. Enables Astro sites to fetch Flare CMS content at build time using the standard Content Layer API (`defineCollection` + `getCollection`). This replaces manual fetch patterns with type-safe, schema-validated content loading.

## Issues Encountered

- CMS API status filtering is broken server-side (known bug) — loader implements client-side filtering as workaround
- Content store uses `store.clear()` on every build — no incremental updates yet

## Dependencies

No dependencies added. Uses FlareClient and flareSchemaToZod from previous commit.

## Testing Notes

Retroactive — not tested at generation time.

## Next Steps

- [ ] Add incremental update support (check `meta.lastModified` vs CMS timestamps)
- [ ] Fix server-side status filtering in CMS API to reduce payload size
- [ ] Add live-reload loader variant for dev mode

---

**Branch:** develop
**Issue:** N/A
**Impact:** HIGH - core loader implementation for @flare-cms/astro
