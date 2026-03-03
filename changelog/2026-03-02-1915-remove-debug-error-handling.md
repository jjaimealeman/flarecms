# 2026-03-02 - Remove debug error handling from homepage

**Keywords:** [FRONTEND] [CLEANUP]
**Session:** Evening, Duration (~5 min)
**Commit:** pending

## What Changed

- File: `packages/site/src/pages/index.astro`
  - Removed temporary debug try/catch wrapper around API calls
  - Removed `debugError` variable and red error banner div
  - Simplified to direct `const` assignments with `await`
  - Removed unnecessary semicolons (style consistency)

## Why

The debug error handling was added to diagnose a 500 error on the production site caused by missing `PUBLIC_` prefix on env vars. That issue was fixed in commit `fb369a4`. The debug code is no longer needed and was cluttering the homepage template.

## Issues Encountered

No major issues encountered.

## Dependencies

No dependencies added.

## Testing Notes

- What was tested: Verified `https://flare-site.pages.dev/` loads successfully before removing debug code
- What wasn't tested: Local dev server (user runs in tmux)

## Next Steps

- [ ] Set up custom domains (`flarecms.dev`, `admin.flarecms.dev`)
- [ ] Merge develop → main and deploy to verify clean homepage

---

**Branch:** develop
**Impact:** LOW - cleanup of temporary debug code
