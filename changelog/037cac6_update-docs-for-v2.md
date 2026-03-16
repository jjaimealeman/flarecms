# 2026-03-16 - Update CLAUDE.md and README for v2.0

**Keywords:** [DOCS] [CHORE]
**Session:** Post-v2.0 docs update
**Commit:** 037cac6

## What Changed

- File: `CLAUDE.md`
  - Added `packages/astro/` to monorepo layout
  - Updated test count from 99 to 1200+
  - Removed fixed bugs: "Status is one-way" (workflow engine shipped) and "Soft-delete doesn't cascade" (fixed in v1.12.0)
  - Updated production URLs to custom domains

- File: `README.md`
  - Bumped version badge from v1.9.0 to v2.0.0
  - Added 6 v2.0 features: Workflow Engine, Content Staging, Schema Migrations UI, Live Preview, Audit Logging, Role-Based Access

## Why

Both files were stale after shipping v2.0 (10 phases, 236 commits). Production URLs, feature lists, test counts, and known bugs all needed updating to reflect current state.

## Issues Encountered

No major issues encountered.

## Dependencies

No dependencies added.

## Testing Notes

Documentation-only changes. No functional impact.

## Next Steps

- [ ] Address v2.0 tech debt (schema_migrations DDL, dead workflowPlugin, hook names, exports)

---

**Branch:** feature/workflow-engine-activation
**Issue:** N/A
**Impact:** LOW - documentation only
