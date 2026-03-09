---
phase: 07-astro-content-layer-loader
plan: 03
subsystem: api
tags: [astro, content-layer, live-loader, ssr, dogfooding]

# Dependency graph
requires:
  - phase: 07-01
    provides: Types, schema converter, API client scaffold
  - phase: 07-02
    provides: Build-time flareLoader() Content Layer loader
provides:
  - Experimental flareLiveLoader() for SSR runtime content fetching
  - Docs site content.config.ts dogfooding flareLoader() with 4 collections
  - Complete @flare-cms/astro package with all public exports
affects: [08-live-preview-api]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LiveLoader interface inline (not imported from astro/loaders for version compat)"
    - "content.config.ts at src/ root (Astro 5 convention)"
    - "Additive integration (flare.ts manual fetch + Content Layer coexist)"

key-files:
  created:
    - packages/site/src/content.config.ts
  modified:
    - packages/site/package.json

key-decisions:
  - "Task 1 already committed by 07-02 docs commit — no duplicate commit needed"
  - "4 collections in content.config.ts: blogPosts, news, docs, docsSections"
  - "PUBLIC_ env var prefix for Astro client-accessible env vars"

patterns-established:
  - "content.config.ts pattern: import flareLoader, define collections with API_URL + filter"

# Metrics
duration: 2min
completed: 2026-03-09
---

# Phase 7 Plan 3: Live Loader and Site Integration Summary

**Experimental flareLiveLoader() for SSR plus docs site dogfooding with 4 CMS collections via flareLoader()**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T07:25:58Z
- **Completed:** 2026-03-09T07:28:12Z
- **Tasks:** 2 (auto) + 1 checkpoint (pending)
- **Files modified:** 3

## Accomplishments
- Verified flareLiveLoader() already committed (from 07-02 docs commit) with loadCollection/loadEntry
- Added @flare-cms/astro as workspace dependency in packages/site
- Created content.config.ts defining blogPosts, news, docs, docsSections via flareLoader()
- All 5 public exports available: flareLoader, flareLiveLoader, flareSchemaToZod, FlareClient, types

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement experimental live loader** - `3b24714` (already committed in 07-02 docs commit, no duplicate needed)
2. **Task 2: Integrate flareLoader into docs site** - `17f0bac` (feat)

## Files Created/Modified
- `packages/astro/src/live-loader.ts` - Experimental SSR live loader (already existed)
- `packages/astro/src/index.ts` - Barrel export with flareLiveLoader (already existed)
- `packages/site/package.json` - Added @flare-cms/astro workspace dependency
- `packages/site/src/content.config.ts` - Content Layer config with 4 collections
- `pnpm-lock.yaml` - Updated lockfile

## Decisions Made
- Task 1 (live-loader.ts + index.ts update) was already committed as part of the 07-02 plan's docs commit. No duplicate commit created.
- Used PUBLIC_ prefix for env vars (PUBLIC_FLARE_API_URL, PUBLIC_FLARE_API_TOKEN) for Astro client accessibility
- 4 collections mirror the existing manual fetch patterns in flare.ts, enabling gradual migration

## Deviations from Plan

None - plan executed as written (Task 1 artifacts already existed from prior execution).

## Issues Encountered
- Task 1 files (live-loader.ts, index.ts) were already committed by the 07-02 docs commit. The Write tool produced identical content, confirming consistency.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Checkpoint pending: human verification of package build, dist output, and site functionality
- After approval, @flare-cms/astro package is complete for Phase 7
- Phase 8 (Live Preview API) can build on flareLiveLoader() foundation

---
*Phase: 07-astro-content-layer-loader*
*Completed: 2026-03-09*
