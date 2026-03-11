# 2026-03-10 - feat(admin): Phase 2 — purge all 209 neon color occurrences across 31 template files

**Keywords:** [feat] [auto-generated]
**Commit:** cad71c3

## What Changed

 packages/core/src/db/migrations-bundle.ts          |  2 +-
 .../templates/components/dynamic-field.template.ts | 14 +++---
 .../src/templates/components/table.template.ts     |  6 +--
 .../components/version-history.template.ts         |  2 +-
 .../templates/layouts/admin-layout-v2.template.ts  |  8 +--
 .../pages/admin-activity-logs.template.ts          |  4 +-
 .../pages/admin-api-reference.template.ts          | 10 ++--
 .../src/templates/pages/admin-cache.template.ts    | 10 ++--
 .../pages/admin-code-examples-form.template.ts     | 20 ++++----
 .../pages/admin-code-examples-list.template.ts     | 22 ++++----
 .../pages/admin-collections-form.template.ts       | 22 ++++----
 .../pages/admin-collections-list.template.ts       | 18 +++----
 .../templates/pages/admin-content-form.template.ts | 12 ++---
 .../templates/pages/admin-content-list.template.ts | 26 +++++-----
 .../templates/pages/admin-dashboard.template.ts    | 46 ++++++++---------
 .../src/templates/pages/admin-design.template.ts   | 58 +++++++++++-----------
 .../templates/pages/admin-field-types.template.ts  |  6 +--
 .../pages/admin-forms-builder.template.ts          |  4 +-
 .../templates/pages/admin-forms-list.template.ts   | 10 ++--
 .../templates/pages/admin-log-config.template.ts   |  2 +-
 .../templates/pages/admin-logs-list.template.ts    | 22 ++++----
 .../pages/admin-media-library.template.ts          | 14 +++---
 .../pages/admin-plugin-settings.template.ts        |  4 +-
 .../src/templates/pages/admin-profile.template.ts  |  2 +-
 .../admin-schema-migrations-history.template.ts    |  4 +-
 .../src/templates/pages/admin-settings.template.ts |  2 +-
 .../pages/admin-testimonials-list.template.ts      | 16 +++---
 .../templates/pages/admin-user-edit.template.ts    |  2 +-
 .../templates/pages/admin-users-list.template.ts   | 44 ++++++++--------
 .../src/templates/pages/auth-login.template.ts     |  2 +-
 packages/core/src/templates/table.template.ts      |  6 +--
 31 files changed, 210 insertions(+), 210 deletions(-)

## Files

- `packages/core/src/db/migrations-bundle.ts`
- `packages/core/src/templates/components/dynamic-field.template.ts`
- `packages/core/src/templates/components/table.template.ts`
- `packages/core/src/templates/components/version-history.template.ts`
- `packages/core/src/templates/layouts/admin-layout-v2.template.ts`
- `packages/core/src/templates/pages/admin-activity-logs.template.ts`
- `packages/core/src/templates/pages/admin-api-reference.template.ts`
- `packages/core/src/templates/pages/admin-cache.template.ts`
- `packages/core/src/templates/pages/admin-code-examples-form.template.ts`
- `packages/core/src/templates/pages/admin-code-examples-list.template.ts`
- `packages/core/src/templates/pages/admin-collections-form.template.ts`
- `packages/core/src/templates/pages/admin-collections-list.template.ts`
- `packages/core/src/templates/pages/admin-content-form.template.ts`
- `packages/core/src/templates/pages/admin-content-list.template.ts`
- `packages/core/src/templates/pages/admin-dashboard.template.ts`
- `packages/core/src/templates/pages/admin-design.template.ts`
- `packages/core/src/templates/pages/admin-field-types.template.ts`
- `packages/core/src/templates/pages/admin-forms-builder.template.ts`
- `packages/core/src/templates/pages/admin-forms-list.template.ts`
- `packages/core/src/templates/pages/admin-log-config.template.ts`
- `packages/core/src/templates/pages/admin-logs-list.template.ts`
- `packages/core/src/templates/pages/admin-media-library.template.ts`
- `packages/core/src/templates/pages/admin-plugin-settings.template.ts`
- `packages/core/src/templates/pages/admin-profile.template.ts`
- `packages/core/src/templates/pages/admin-schema-migrations-history.template.ts`
- `packages/core/src/templates/pages/admin-settings.template.ts`
- `packages/core/src/templates/pages/admin-testimonials-list.template.ts`
- `packages/core/src/templates/pages/admin-user-edit.template.ts`
- `packages/core/src/templates/pages/admin-users-list.template.ts`
- `packages/core/src/templates/pages/auth-login.template.ts`
- `packages/core/src/templates/table.template.ts`

---

**Branch:** feature/admin-ui-overhaul
**Impact:** HIGH
**Source:** gsd-changelog-hook (auto-generated)
