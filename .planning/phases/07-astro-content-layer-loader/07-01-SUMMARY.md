---
phase: 07-astro-content-layer-loader
plan: 01
subsystem: astro-integration
tags: [astro, content-layer, zod, schema, api-client, tsup]
depends_on: []
provides:
  - "@flare-cms/astro workspace package"
  - "flareSchemaToZod schema converter"
  - "FlareClient API wrapper"
affects:
  - "07-02 (build-time loader uses FlareClient + flareSchemaToZod)"
  - "07-03 (live loader uses FlareClient)"
tech-stack:
  added: []
  patterns:
    - "Zod schema generation from CMS field types"
    - "Graceful API client (never crashes builds)"
key-files:
  created:
    - packages/astro/package.json
    - packages/astro/tsconfig.json
    - packages/astro/tsup.config.ts
    - packages/astro/src/types.ts
    - packages/astro/src/schema.ts
    - packages/astro/src/client.ts
    - packages/astro/src/index.ts
  modified: []
decisions:
  - "astro/zod used for Zod imports (Astro re-exports Zod for Content Layer compatibility)"
  - "Graceful error handling: API client returns empty data on failure instead of throwing"
  - "System fields (_status, _createdAt, _updatedAt) always optional in generated schemas"
metrics:
  duration: "~2 min"
  completed: "2026-03-09"
---

# Phase 7 Plan 1: Scaffold @flare-cms/astro Package Summary

**One-liner:** Workspace package with 24-type Zod schema converter and graceful fetch client using astro/zod

## What Was Done

### Task 1: Scaffold package with build tooling and types
- Created `packages/astro/` as pnpm workspace package
- `package.json` with `astro` as peer dep, `@flare-cms/core` as workspace dep
- `tsup.config.ts` externalizing astro, astro/zod, astro/loaders, @flare-cms/core
- `types.ts` with `FlareLoaderOptions`, `FlareContentItem`, `FlareApiResponse` interfaces
- Verified `pnpm install` resolves workspace dependency graph

### Task 2: Implement schema converter and API client
- `schema.ts`: `flareSchemaToZod()` maps all 24 Flare field types to Zod constructors
  - Select fields with enum arrays get `z.enum()` refinement
  - Required/optional respects `schema.required` array
  - System fields added automatically
- `client.ts`: `FlareClient` class with `fetchCollection`, `fetchCollectionSchema`, `fetchItem`
  - All methods return empty data on error (never crashes Astro builds)
  - Optional `X-API-Key` header for authenticated access
- `index.ts`: Barrel export re-exporting all public API
- Package builds successfully with tsup (ESM + CJS + DTS)

## Commits

| Hash | Message |
|------|---------|
| 507173f | feat(07-01): scaffold @flare-cms/astro package with build tooling and types |
| f717b0f | feat(07-01): implement schema converter and API client |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- All files exist in `packages/astro/`
- `pnpm install` resolves workspace dependencies
- `pnpm build` produces `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`
- All 3 exports (`flareSchemaToZod`, `FlareClient`, `FlareLoaderOptions`) present in declarations
- `astro` listed as peerDependency, not regular dependency

## Next Phase Readiness

Plan 07-02 (build-time loader) can proceed immediately. All foundation types, the schema converter, and API client are exported and ready for use.
