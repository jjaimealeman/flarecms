# 2026-03-10 - Mount Testimonials & Code Examples, Clean Ghost DB Entries

**Keywords:** [ROUTING] [DATABASE] [MIGRATION] [REFACTOR]
**Session:** Afternoon, Duration (~15 minutes)
**Commit:** c95418f

## What Changed

- File: `packages/core/src/app.ts`
  - Imported adminTestimonialsRoutes and adminCodeExamplesRoutes
  - Mounted at `/admin/testimonials` and `/admin/code-examples`
- File: `packages/core/src/db/migrations-bundle.ts`
  - Added migration 032: deletes ghost entries (easymde-editor, core-auth, core-media, core-analytics)
  - Removes duplicate core-workflow (keeps workflow-plugin)
  - Removes duplicate testimonials and code-examples rows (keeps *-plugin variants)
- File: `packages/core/src/routes/index.ts`
  - Removed dead exports: adminDesignRoutes, adminCheckboxRoutes (design plugin was deleted)
- File: `packages/core/src/index.ts`
  - Removed adminDesignRoutes and adminCheckboxRoutes from package re-exports

## Why

Testimonials and Code Examples had fully working route files that were exported but never mounted in app.ts — making their admin pages unreachable. Now they're live.

The ghost/duplicate DB entries cluttered the plugins list with phantom rows from old SonicJS migrations. Migration 032 cleans them on next deploy.

## Issues Encountered

Removing adminDesignRoutes and adminCheckboxRoutes exports from routes/index.ts broke the build because they were also re-exported from the package's main index.ts. Fixed by removing from both files.

## Dependencies

No dependencies added.

## Testing Notes

- Build passes cleanly
- Testimonials admin accessible at `/admin/testimonials`
- Code Examples admin accessible at `/admin/code-examples`
- Migration 032 tested via build only — DB cleanup runs on next deploy

## Next Steps

- [ ] Decide on Workflow Engine (keep SchedulerService, remove dead approval/automation code)
- [ ] Add testimonials and code-examples to admin sidebar nav
- [ ] Build deploy button feature (saved in .planning/future/)

---

**Branch:** feature/plugin-testing
**Issue:** N/A
**Impact:** MEDIUM - activates 2 dormant plugins, cleans DB
