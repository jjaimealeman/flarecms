# 2026-03-16 - Fix Sync Go Live D1 Internal Error

**Keywords:** [FIX] [SYNC] [D1]
**Session:** v2.0 tech debt
**Commit:** 0289815

## What Changed

- File: `packages/core/src/services/revisions.ts`
  - Wrapped 4 unbatched D1 writes in `db.batch()` for atomic execution
  - INSERT into content_versions + UPDATE content + UPDATE content_versions status + UPDATE content_revision_meta now run as single transaction

## Why

"Go Live" in the Sync modal threw `D1_ERROR: internal error` on production. The 4 separate `.run()` calls each created their own implicit transaction, causing D1 internal conflicts. `db.batch()` executes all writes atomically as designed by D1.

## Issues Encountered

Extensive investigation required — all table schemas and FK constraints were correct. Individual SQL statements worked fine when tested manually. The error was caused by unbatched multi-statement writes, not schema issues.

## Dependencies

No dependencies added.

## Testing Notes

Build passes. Needs deploy to prod to verify fix on remote D1.

## Next Steps

- [ ] Deploy and test Go Live on admin.flarecms.dev

---

**Branch:** feature/v2-tech-debt
**Issue:** N/A
**Impact:** HIGH - fixes broken Sync Go Live on production
