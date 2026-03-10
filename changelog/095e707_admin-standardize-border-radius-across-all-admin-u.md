# 2026-03-10 - fix(admin): standardize border-radius across all admin UI elements

**Keywords:** [fix] [auto-generated]
**Commit:** 095e707

## What Changed

 packages/core/src/db/migrations-bundle.ts          |  2 +-
 .../components/confirmation-dialog.template.ts     |  4 +--
 .../templates/components/pagination.template.ts    |  2 +-
 .../src/templates/confirmation-dialog.template.ts  |  4 +--
 .../pages/admin-api-reference.template.ts          |  8 ++---
 .../src/templates/pages/admin-cache.template.ts    |  2 +-
 .../pages/admin-code-examples-list.template.ts     | 16 +++++-----
 .../pages/admin-collections-form.template.ts       | 12 ++++----
 .../pages/admin-collections-list.template.ts       | 12 ++++----
 .../templates/pages/admin-content-form.template.ts |  8 ++---
 .../templates/pages/admin-content-list.template.ts | 12 ++++----
 .../templates/pages/admin-dashboard.template.ts    | 10 +++---
 .../src/templates/pages/admin-design.template.ts   | 36 +++++++++++-----------
 .../pages/admin-forms-builder.template.ts          |  2 +-
 .../templates/pages/admin-forms-list.template.ts   | 12 ++++----
 .../templates/pages/admin-log-config.template.ts   |  4 +--
 .../templates/pages/admin-log-details.template.ts  |  6 ++--
 .../templates/pages/admin-logs-list.template.ts    |  6 ++--
 .../pages/admin-media-library.template.ts          | 12 ++++----
 .../templates/pages/admin-plugins-list.template.ts | 18 +++++------
 .../src/templates/pages/admin-profile.template.ts  | 10 +++---
 .../admin-schema-migrations-history.template.ts    | 18 +++++------
 .../pages/admin-testimonials-list.template.ts      | 14 ++++-----
 .../templates/pages/admin-user-edit.template.ts    |  8 ++---
 .../src/templates/pages/admin-user-new.template.ts |  2 +-
 .../templates/pages/admin-users-list.template.ts   | 14 ++++-----
 .../src/templates/pages/auth-login.template.ts     |  2 +-
 packages/core/src/templates/pagination.template.ts |  2 +-
 28 files changed, 129 insertions(+), 129 deletions(-)

## Files

- `packages/core/src/db/migrations-bundle.ts`
- `packages/core/src/templates/components/confirmation-dialog.template.ts`
- `packages/core/src/templates/components/pagination.template.ts`
- `packages/core/src/templates/confirmation-dialog.template.ts`
- `packages/core/src/templates/pages/admin-api-reference.template.ts`
- `packages/core/src/templates/pages/admin-cache.template.ts`
- `packages/core/src/templates/pages/admin-code-examples-list.template.ts`
- `packages/core/src/templates/pages/admin-collections-form.template.ts`
- `packages/core/src/templates/pages/admin-collections-list.template.ts`
- `packages/core/src/templates/pages/admin-content-form.template.ts`
- `packages/core/src/templates/pages/admin-content-list.template.ts`
- `packages/core/src/templates/pages/admin-dashboard.template.ts`
- `packages/core/src/templates/pages/admin-design.template.ts`
- `packages/core/src/templates/pages/admin-forms-builder.template.ts`
- `packages/core/src/templates/pages/admin-forms-list.template.ts`
- `packages/core/src/templates/pages/admin-log-config.template.ts`
- `packages/core/src/templates/pages/admin-log-details.template.ts`
- `packages/core/src/templates/pages/admin-logs-list.template.ts`
- `packages/core/src/templates/pages/admin-media-library.template.ts`
- `packages/core/src/templates/pages/admin-plugins-list.template.ts`
- `packages/core/src/templates/pages/admin-profile.template.ts`
- `packages/core/src/templates/pages/admin-schema-migrations-history.template.ts`
- `packages/core/src/templates/pages/admin-testimonials-list.template.ts`
- `packages/core/src/templates/pages/admin-user-edit.template.ts`
- `packages/core/src/templates/pages/admin-user-new.template.ts`
- `packages/core/src/templates/pages/admin-users-list.template.ts`
- `packages/core/src/templates/pages/auth-login.template.ts`
- `packages/core/src/templates/pagination.template.ts`

---

**Branch:** feature/admin-ui-overhaul
**Impact:** HIGH
**Source:** gsd-changelog-hook (auto-generated)
