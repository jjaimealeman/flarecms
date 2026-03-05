# 2026-03-04 - Rebrand Core Types, Routes & Auth (Steps 1-3)

**Keywords:** [REFACTOR] [BACKEND] [ROUTING]
**Session:** Afternoon, Duration (~15 minutes)
**Commit:** pending

## What Changed

- File: `packages/core/src/app.ts`
  - Removed deprecated `SonicJSConfig`, `SonicJSApp` type aliases
  - Removed deprecated `createSonicJSApp` function alias
  - Updated internal comment referencing SonicJSApp → FlareApp
- File: `packages/core/src/index.ts`
  - Removed `createSonicJSApp`, `SonicJSConfig`, `SonicJSApp`, `SONICJS_VERSION` exports
  - Updated migration notes comment
- File: `packages/core/src/types/index.ts`
  - Updated module comment: "SonicJS" → "Flare CMS"
- File: `packages/core/src/types/plugin.ts`
  - Updated 4 SonicJS references in comments to Flare CMS
- File: `packages/core/src/types/global.d.ts`
  - Updated header comment: "SonicJS AI" → "Flare CMS"
- File: `packages/core/src/types/telemetry.ts`
  - Updated header comment: "SonicJS" → "Flare CMS"
- File: `packages/core/src/utils/version.ts`
  - Removed deprecated `SONICJS_VERSION` alias
- File: `packages/core/src/utils/index.ts`
  - Removed `SONICJS_VERSION` re-export, updated module comment
- File: `packages/core/src/middleware/bootstrap.ts`
  - Replaced `SonicJSConfig` import/usage with `FlareConfig`
  - Updated comment: `createSonicJSApp()` → `createFlareApp()`
- File: `packages/core/src/middleware/index.ts`
  - Updated module comment: "SonicJS" → "Flare CMS"
- File: `packages/core/src/plugins/plugin-manager.ts`
  - Updated comment: `createSonicJSApp()` → `createFlareApp()`
- File: `packages/core/src/services/telemetry-service.ts`
  - Updated comment and env var: `SONICJS_VERSION` → `FLARE_VERSION`
- File: `packages/core/src/routes/auth.ts`
  - Replaced `admin@sonicjs.com` → `admin@flarecms.dev` (5 occurrences)
  - Replaced `sonicjs!` → `flarecms!` demo password (2 occurrences)
- File: `packages/core/src/routes/admin-plugins.ts`
  - Updated demo login plugin default credentials
- File: `packages/core/src/routes/test-cleanup.ts`
  - Replaced `admin@sonicjs.com` → `admin@flarecms.dev` in SQL queries
- File: `packages/core/src/routes/api-media.ts`
  - Replaced `sonicjs-media-dev` → `flarecms-media-dev` bucket fallback (3 occurrences)
- File: `packages/core/src/routes/index.ts`
  - Updated GitHub reference URL

## Why

Phase 1 of the FlareCMS rebrand — removing all deprecated SonicJS backward compatibility aliases and updating core references across types, middleware, routes, and auth. No backward compat needed since this is a clean break fork.

## Issues Encountered

No major issues encountered. Clean search-and-replace across 17 files.

## Dependencies

No dependencies added.

## Testing Notes

- Tests not yet run — will verify after full rebrand is complete
- All changes are string/comment replacements, no logic changes

## Next Steps

- [ ] Step 4: Rebrand admin UI templates
- [ ] Steps 5-6: Plugin manifests and implementations
- [ ] Steps 7-8: Services, utils, CLI
- [ ] Steps 9-10: Tests and CMS package
- [ ] Steps 11-13: Site data, migrations, docs
- [ ] Step 14-15: Run tests and build

---

**Branch:** feature/rebranding
**Issue:** None
**Impact:** HIGH - removes all backward compat aliases, changes default credentials
