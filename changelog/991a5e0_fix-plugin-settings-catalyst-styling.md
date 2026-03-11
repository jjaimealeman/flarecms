# 2026-03-10 - Fix Plugin Settings Page Catalyst Styling

**Keywords:** [UI] [BUG_FIX] [BACKEND]
**Session:** Morning, Duration (~1 hour)
**Commit:** 991a5e0

## What Changed

- File: `packages/core/src/templates/pages/admin-plugin-settings.template.ts`
  - Migrated all glassmorphism styles (`bg-black/20`, `bg-white/5`, `backdrop-blur`) to Catalyst design system (`bg-white dark:bg-zinc-900`, `ring-1 ring-white/10`)
  - Fixed all `text-white` headings invisible in light mode → `text-zinc-950 dark:text-white`
  - Fixed tab switching JS broken by `classList.add('text-zinc-500 dark:text-zinc-400')` (space in class name)
  - Stripped hardcoded inline dark styles from Turnstile select dropdowns
  - Updated input/select classes to match Catalyst patterns
  - Fixed badge/tag styles for dependencies and permissions
- File: `packages/core/src/routes/admin-plugins.ts`
  - Fixed "1 weeks ago" grammar — proper singular/plural for all time units
- File: `packages/core/src/services/plugin-service.ts`
  - Changed `INSERT INTO plugins` to `INSERT OR IGNORE INTO plugins` to prevent duplicate install errors
- File: `packages/core/src/db/migrations-bundle.ts`
  - Timestamp regeneration (build artifact)

## Why

Plugin settings page was using pre-overhaul glassmorphism styling while rest of admin uses Catalyst design system. Text was invisible in light mode (white-on-white). Tab switching broke from a bad find-and-replace that put multi-class strings into classList.add() calls.

## Issues Encountered

**classList.add bug**: `replace_all` on `text-gray-400` → `text-zinc-500 dark:text-zinc-400` also hit JavaScript `classList.add/remove` calls where space-separated strings silently fail. Fixed by using single class in JS context.

## Dependencies

No dependencies added.

## Testing Notes

- Verified all 3 tabs (Settings, Activity Log, Information) render correctly in light mode
- Email plugin settings form, Turnstile selects confirmed working
- Plugin install idempotency tested (double-click no longer errors)

## Next Steps

- [ ] Test Turnstile widget on actual form (localhost added to CF dashboard)
- [ ] Test OTP login flow with Resend
- [ ] Create test accounts for RBAC verification

---

**Branch:** feature/plugin-testing
**Issue:** N/A
**Impact:** MEDIUM - admin UI fix across all plugin settings pages
