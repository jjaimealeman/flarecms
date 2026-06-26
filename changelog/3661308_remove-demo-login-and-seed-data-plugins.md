# 2026-06-25 - chore: remove demo-login and seed-data plugins

**Keywords:** [chore] [auto-generated]
**Commit:** 3661308

## What Changed

 .../src/__tests__/routes/admin-plugins.test.ts     | 24 -------
 packages/core/src/app.ts                           |  2 -
 packages/core/src/db/migrations-bundle.ts          |  2 +-
 packages/core/src/plugins/core-plugins/index.ts    |  7 +--
 packages/core/src/routes/admin-plugins.ts          | 73 ----------------------
 packages/core/src/routes/auth.ts                   | 13 +---
 packages/core/src/services/plugin-bootstrap.ts     | 18 ------
 .../pages/admin-plugin-settings.template.ts        | 44 -------------
 .../src/templates/pages/auth-login.template.ts     | 44 +------------
 9 files changed, 5 insertions(+), 222 deletions(-)

## Files

- `packages/core/src/__tests__/routes/admin-plugins.test.ts`
- `packages/core/src/app.ts`
- `packages/core/src/db/migrations-bundle.ts`
- `packages/core/src/plugins/core-plugins/index.ts`
- `packages/core/src/routes/admin-plugins.ts`
- `packages/core/src/routes/auth.ts`
- `packages/core/src/services/plugin-bootstrap.ts`
- `packages/core/src/templates/pages/admin-plugin-settings.template.ts`
- `packages/core/src/templates/pages/auth-login.template.ts`

---

**Branch:** feature/live-demo
**Impact:** MEDIUM
**Source:** gsd-changelog-hook (auto-generated)
