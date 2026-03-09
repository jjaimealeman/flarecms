# 2026-03-09 - Bump Version to 1.3.0

**Keywords:** [CHORE] [RELEASE]
**Session:** Retroactive backfill
**Commit:** 8a46663

## What Changed

- File: `package.json`
  - Version bump: 1.2.0 → 1.3.0

## Why

Release v1.3.0 after completing Phase 6 (docs site with search, comparison pages, homepage positioning).

## Issues Encountered

The global post-commit hook generated a broken changelog filename (`%Y->-...`) due to git format strings leaking into the slug parser. This backfill replaces that broken entry.

## Dependencies

No dependencies added.

## Testing Notes

Retroactive — not tested at generation time.

## Next Steps

- [ ] Deploy v1.3.0 to production

---

**Branch:** main
**Issue:** N/A
**Impact:** LOW - version bump only
