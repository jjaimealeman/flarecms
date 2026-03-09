# 2026-03-09 - Scaffold @flare-cms/astro Package

**Keywords:** [FEAT] [INFRA] [ASTRO] [DEPENDENCIES]
**Session:** Retroactive backfill
**Commit:** d0156d0

## What Changed

- File: `packages/astro/package.json` (new)
  - Package manifest: `@flare-cms/astro` v1.0.0
  - ESM + CJS dual exports via tsup
  - Peer dep: `astro >=5.10.0`
  - Workspace dep: `@flare-cms/core`

- File: `packages/astro/src/types.ts` (new, 54 lines)
  - `FlareLoaderOptions` — config for loader (apiUrl, collection, apiToken, filter, schema)
  - `FlareContentItem` — CMS content item shape (id, title, slug, status, data, timestamps)
  - `FlareApiResponse<T>` — paginated API response wrapper

- File: `packages/astro/tsconfig.json` (new)
  - ES2022 target, bundler module resolution, strict mode

- File: `packages/astro/tsup.config.ts` (new)
  - ESM + CJS build, dts generation, externals for astro/zod/@flare-cms/core

## Why

New monorepo package enabling Astro sites to consume Flare CMS content via the Content Layer API. This is the public-facing integration — site developers install `@flare-cms/astro` and get type-safe content loading with zero boilerplate.

## Issues Encountered

No major issues encountered.

## Dependencies

Added: `astro ^5.18.0` (dev), `tsup ^8.5.0` (dev), `typescript ^5.9.3` (dev), `@flare-cms/core workspace:*`

## Testing Notes

Retroactive — not tested at generation time.

## Next Steps

- [ ] Implement schema converter and API client (f67d3f3)
- [ ] Implement build-time loader (0a8c5b8)
- [ ] Publish to npm after dogfooding on docs site

---

**Branch:** develop
**Issue:** N/A
**Impact:** HIGH - new package in monorepo
