# 2026-03-09 - Clean Up Stale Planning Files and Gitignore Mockups

**Keywords:** [CHORE] [CLEANUP]
**Session:** Retroactive backfill
**Commit:** 05dd440

## What Changed

- File: `.gitignore`
  - Added `stitch-mockups-v2/` to ignore design directory

- Removed: `.planning/phases/03-media-pipeline-caching/` (10 files)
  - Plans, summaries, research, verification, context — all removed
  - Phase was replaced by docs-site roadmap

- Removed: `.planning/phases/05-production-deployment/` (12 files)
  - Plans, summaries, research, verification, context — all removed
  - Phase was replaced by docs-site roadmap

- Removed: `.planning/phases/04-site-shell-homepage/04-03-PLAN.md`

- File: `packages/core/src/db/migrations-bundle.ts`
  - Timestamp-only change from rebuild (no logic change)

## Why

Removing obsolete planning files from the old milestone roadmap. Phases 03 (media pipeline) and 05 (production deployment) were superseded when the project pivoted to the docs-site milestone. 3,477 lines deleted — reduces repo noise and prevents confusion about which plans are current.

## Issues Encountered

No major issues encountered.

## Dependencies

No dependencies added.

## Testing Notes

Retroactive — not tested at generation time. Deletion-only commit.

## Next Steps

- [ ] Review remaining .planning/ phases for staleness

---

**Branch:** develop
**Issue:** N/A
**Impact:** LOW - cleanup only, -3,477 lines
