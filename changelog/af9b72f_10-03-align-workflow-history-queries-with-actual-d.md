# 2026-03-15 - fix(10-03): align workflow_history queries with actual DB schema

**Keywords:** [fix] [auto-generated]
**Commit:** find with `git log --diff-filter=A -1 --format=%H -- changelog/af9b72f_10-03-align-workflow-history-queries-with-actual-d.md`

## What Changed

 .../core-plugins/workflow-plugin/admin-routes.ts   | 101 ++++++++++++---------
 .../workflow-plugin/services/content-workflow.ts   |  12 +--
 .../workflow-plugin/services/workflow-service.ts   |  16 ++--
 3 files changed, 70 insertions(+), 59 deletions(-)

## Files

- `packages/core/src/plugins/core-plugins/workflow-plugin/admin-routes.ts`
- `packages/core/src/plugins/core-plugins/workflow-plugin/services/content-workflow.ts`
- `packages/core/src/plugins/core-plugins/workflow-plugin/services/workflow-service.ts`

---

**Branch:** feature/workflow-engine-activation
**Impact:** LOW
**Source:** gsd-changelog-hook (auto-generated)
