# 2026-03-15 - fix(10-01): remove @ts-nocheck from automation, notifications, webhooks, scheduler

**Keywords:** [fix] [auto-generated]
**Commit:** eaac464

## What Changed

 .../workflow-plugin/services/automation.ts         | 246 ++++++++++++++-------
 .../workflow-plugin/services/notifications.ts      | 145 ++++++++----
 .../workflow-plugin/services/scheduler.ts          |  23 +-
 .../workflow-plugin/services/webhooks.ts           | 151 ++++++++-----
 4 files changed, 361 insertions(+), 204 deletions(-)

## Files

- `packages/core/src/plugins/core-plugins/workflow-plugin/services/automation.ts`
- `packages/core/src/plugins/core-plugins/workflow-plugin/services/notifications.ts`
- `packages/core/src/plugins/core-plugins/workflow-plugin/services/scheduler.ts`
- `packages/core/src/plugins/core-plugins/workflow-plugin/services/webhooks.ts`

---

**Branch:** feature/workflow-engine-activation
**Impact:** MEDIUM
**Source:** gsd-changelog-hook (auto-generated)
