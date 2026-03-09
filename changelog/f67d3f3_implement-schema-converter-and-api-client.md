# 2026-03-09 - Implement Schema Converter and API Client

**Keywords:** [FEAT] [BACKEND] [ASTRO]
**Session:** Retroactive backfill
**Commit:** f67d3f3

## What Changed

- File: `packages/astro/src/schema.ts` (new, 86 lines)
  - `flareSchemaToZod()` converts CMS CollectionSchema to Zod object schema
  - Maps all 24 Flare CMS field types to Zod equivalents
  - Select fields with enum values get `z.enum()` refinement
  - Required/optional field handling respects `schema.required` array
  - Auto-adds system fields: `_status`, `_createdAt`, `_updatedAt`

- File: `packages/astro/src/client.ts` (new, 115 lines)
  - `FlareClient` class with `fetchCollection()`, `fetchCollectionSchema()`, `fetchItem()` methods
  - Auth via `X-API-Key` header when apiToken provided
  - Graceful error handling: returns empty data instead of throwing (never crashes Astro builds)

- File: `packages/astro/src/index.ts` (new, 10 lines)
  - Barrel re-exports: `flareSchemaToZod`, `FlareClient`, and all type exports

## Why

Foundation layer for the @flare-cms/astro Content Layer integration. The schema converter enables dynamic Zod schemas from CMS collection definitions (no manual schema duplication). The API client provides a typed, error-resilient interface to the CMS that prioritizes build stability over strict error propagation.

## Issues Encountered

No major issues encountered.

## Dependencies

No dependencies added. Uses `@flare-cms/core` types (CollectionSchema, FieldConfig) and `astro/zod`.

## Testing Notes

Retroactive — not tested at generation time.

## Next Steps

- [ ] Add unit tests for schema converter (especially edge cases: missing enum, unknown field types)
- [ ] Add caching to FlareClient for repeated schema fetches during build

---

**Branch:** develop
**Issue:** N/A
**Impact:** HIGH - foundation for entire Astro integration package
