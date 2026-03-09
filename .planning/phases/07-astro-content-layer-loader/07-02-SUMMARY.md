---
phase: 07-astro-content-layer-loader
plan: 02
subsystem: api
tags: [astro, content-layer, loader, zod, build-time]

# Dependency graph
requires:
  - phase: 07-01
    provides: FlareClient, flareSchemaToZod, FlareLoaderOptions types
provides:
  - flareLoader() function for Astro Content Layer integration
  - Build-time content fetching with type-safe Zod schemas
  - Client-side status filtering (workaround for broken API filters)
  - Graceful CMS downtime handling
affects: [07-03, packages/site content.config.ts migration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Astro Content Layer Loader pattern (name + load + schema)"
    - "Data flattening: item.data spread to top-level with _status, _createdAt, _updatedAt system fields"
    - "Permissive fallback schema with passthrough() for unknown CMS fields"

key-files:
  created:
    - packages/astro/src/loader.ts
  modified:
    - packages/astro/src/index.ts

key-decisions:
  - "Client-side status filtering since API filters are broken (known bug)"
  - "Permissive passthrough fallback schema when CMS schema fetch fails"
  - "store.clear() before populating to ensure clean state each build"

patterns-established:
  - "Loader data flattening: item.data fields promoted to top-level alongside _status/_createdAt/_updatedAt"
  - "Dynamic schema: fetch CMS schema at build time, convert to Zod, fallback to permissive"

# Metrics
duration: 3min
completed: 2026-03-09
---

# Phase 7 Plan 2: Build-Time Loader Summary

**flareLoader() Content Layer loader with dynamic Zod schema generation, client-side status filtering, and graceful CMS downtime handling**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-09T07:17:33Z
- **Completed:** 2026-03-09T07:21:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Implemented flareLoader() returning a valid Astro Loader with name, load, and schema
- load() fetches content from CMS, flattens item.data, filters by status, stores entries with digest
- schema() dynamically fetches CMS collection schema and converts to Zod via flareSchemaToZod
- Graceful degradation: CMS downtime produces warning, build continues with cached content
- Permissive fallback schema with passthrough() when CMS schema unavailable
- Package rebuilds successfully with flareLoader exported from barrel

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement build-time loader** + **Task 2: Update barrel export** - `8fd7125` (feat)

**Note:** Both tasks were committed together due to git hook behavior staging both files.

## Files Created/Modified
- `packages/astro/src/loader.ts` - Build-time Astro Content Layer loader (127 lines)
- `packages/astro/src/index.ts` - Updated barrel to export flareLoader as primary export

## Decisions Made
- Client-side status filtering because API filters are a known bug (inherited from SonicJS)
- store.clear() before each build ensures clean state (no stale entries from removed CMS content)
- Permissive fallback schema uses z.object().passthrough() to accept any shape when CMS is unreachable
- meta.set('lastModified') for future incremental build support

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Git hook combined both task commits into one (cosmetic, all code is correct and committed)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- flareLoader() is ready for use in content.config.ts
- Plan 07-03 (tests + integration verification) can proceed
- All exports available from @flare-cms/astro: flareLoader, flareSchemaToZod, FlareClient, types

---
*Phase: 07-astro-content-layer-loader*
*Completed: 2026-03-09*
