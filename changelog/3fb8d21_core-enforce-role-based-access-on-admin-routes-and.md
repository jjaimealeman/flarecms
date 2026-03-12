# 2026-03-12 - feat(core): enforce role-based access on admin routes and sidebar

**Keywords:** [feat] [auto-generated]
**Commit:** 3fb8d21

## What Changed

 packages/core/src/db/migrations-bundle.ts          |  2 +-
 packages/core/src/routes/admin-api-tokens.ts       |  3 +-
 packages/core/src/routes/admin-collections.ts      |  3 +-
 packages/core/src/routes/admin-deploy.ts           |  3 +-
 packages/core/src/routes/admin-faq.ts              |  3 +-
 packages/core/src/routes/admin-forms.ts            |  3 +-
 packages/core/src/routes/admin-logs.ts             |  3 +-
 packages/core/src/routes/admin-plugins.ts          |  3 +-
 .../core/src/routes/admin-schema-migrations.ts     |  3 +-
 packages/core/src/routes/admin-settings.ts         |  3 +-
 .../layouts/admin-layout-catalyst.template.ts      | 69 ++++++++++++++--------
 11 files changed, 62 insertions(+), 36 deletions(-)

## Files

- `packages/core/src/db/migrations-bundle.ts`
- `packages/core/src/routes/admin-api-tokens.ts`
- `packages/core/src/routes/admin-collections.ts`
- `packages/core/src/routes/admin-deploy.ts`
- `packages/core/src/routes/admin-faq.ts`
- `packages/core/src/routes/admin-forms.ts`
- `packages/core/src/routes/admin-logs.ts`
- `packages/core/src/routes/admin-plugins.ts`
- `packages/core/src/routes/admin-schema-migrations.ts`
- `packages/core/src/routes/admin-settings.ts`
- `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts`

---

**Branch:** feature/roles-enforcement
**Impact:** HIGH
**Source:** gsd-changelog-hook (auto-generated)
