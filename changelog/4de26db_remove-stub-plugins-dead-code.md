# 2026-03-10 - Remove Stub Plugins and Dead Code (Tier 3 Cleanup)

**Keywords:** [REFACTOR] [BACKEND] [CONFIG]
**Session:** Afternoon, Duration (~30 minutes)
**Commit:** 4de26db

## What Changed

- File: `packages/core/src/plugins/core-plugins/index.ts`
  - Removed exports for auth, media, analytics, hello-world, workflow plugins
  - Removed those IDs from CORE_PLUGIN_IDS array
- File: `packages/core/src/services/plugin-bootstrap.ts`
  - Removed core-auth, core-media, workflow-plugin from CORE_PLUGINS bootstrap array
  - Removed force-activation logic that always kept core-auth active
- File: `packages/core/src/routes/admin-plugins.ts`
  - Removed install handlers for core-auth, core-media, core-workflow
  - Removed stale auth cache TODO comment
- File: `packages/core/src/templates/pages/admin-plugins-list.template.ts`
  - Removed criticalCorePlugins lock — no more un-toggleable plugins
- File: `packages/core/src/templates/pages/admin-plugin-settings.template.ts`
  - Removed auth settings import and AuthSettings type
  - Removed auth-specific nested form parsing in saveSettings()
  - Removed auth-specific heading/rendering conditionals
- File: `packages/core/src/plugins/config/plugin-config.ts`
  - Removed hardcoded configs for core-auth, core-media, core-analytics
  - Removed env var loading for PLUGIN_AUTH_ENABLED, PLUGIN_MEDIA_ENABLED, PLUGIN_ANALYTICS_ENABLED
- File: `packages/core/src/templates/components/auth-settings-form.template.ts`
  - Deleted entirely — auth plugin removed
- File: `packages/core/src/plugins/core-plugins/analytics/` (directory)
  - Deleted — pure stub with hardcoded fake data, never mounted
- File: `packages/core/src/plugins/core-plugins/auth/` (directory)
  - Deleted — stub wrapper, real auth lives in middleware/auth.ts
- File: `packages/core/src/plugins/core-plugins/media/` (directory)
  - Deleted — stub wrapper, real media system uses R2 directly
- File: `packages/core/src/plugins/core-plugins/hello-world-plugin/` (directory)
  - Deleted — example plugin, never used
- File: `packages/core/src/plugins/design/` (directory)
  - Deleted — empty stub, never mounted
- File: `packages/core/src/plugins/available/email-templates-plugin/` (directory)
  - Deleted — abandoned SendGrid-based email system, replaced by working email-plugin

## Why

Tier 3 plugin audit cleanup. These plugins were inherited from SonicJS and never did anything real:
- core-analytics returned hardcoded fake numbers
- core-auth and core-media were stub wrappers around functionality that lives elsewhere
- hello-world was a demo plugin never exposed to users
- design plugin was an empty shell
- email-templates-plugin was abandoned in favor of the Resend-based email plugin

Keeping dead code creates confusion about what's real and what isn't.

## Issues Encountered

core-auth was deeply wired — bootstrap force-activation, critical plugin lock in admin UI, custom settings form with nested field parsing, install handler. Required edits across 7 files to fully unwire.

## Dependencies

No dependencies added.

## Testing Notes

- Build passes cleanly after all deletions
- SchedulerService from workflow-plugin still exports correctly (kept that directory)
- No runtime imports were broken — verified none of the deleted plugins were imported by app.ts or active routes

## Next Steps

- [ ] Mount testimonials + code-examples routes in app.ts (or decide to remove)
- [ ] Clean ghost/duplicate DB entries (easymde-editor, core-workflow/workflow-plugin dupes, testimonials dupes)
- [ ] Decide on Workflow Engine fate (keep SchedulerService, remove the rest?)

---

**Branch:** feature/plugin-testing
**Issue:** N/A
**Impact:** MEDIUM - removes ~5800 lines of dead code, no functionality change
