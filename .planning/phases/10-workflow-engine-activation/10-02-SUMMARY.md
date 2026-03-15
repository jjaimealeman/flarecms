---
phase: 10
plan: 02
subsystem: workflow-engine
tags: [typescript, hono, templates, catalyst-layout, route-types]
requires: [10-01]
provides: [workflow-routes-typed, workflow-templates-catalyst]
affects: [10-03]
tech-stack:
  added: []
  patterns: [catalyst-layout-migration, shared-type-imports]
key-files:
  created: []
  modified:
    - packages/core/src/plugins/core-plugins/workflow-plugin/routes.ts
    - packages/core/src/plugins/core-plugins/workflow-plugin/admin-routes.ts
    - packages/core/src/plugins/core-plugins/workflow-plugin/templates/workflow-dashboard.ts
    - packages/core/src/plugins/core-plugins/workflow-plugin/templates/workflow-content.ts
    - packages/core/src/plugins/core-plugins/workflow-plugin/templates/scheduled-content.ts
decisions:
  - id: relative-import-3-levels
    summary: "Relative path ../../../app (3 levels up) from workflow-plugin/ to src/app.ts"
  - id: relative-template-import-4-levels
    summary: "Relative path ../../../../templates/layouts/ (4 levels up) from workflow-plugin/templates/ to src/templates/layouts/"
metrics:
  duration: ~3min
  completed: 2026-03-15
---

# Phase 10 Plan 02: Fix Route Types and Migrate Templates to Catalyst Layout Summary

**One-liner:** Removed local Bindings/Variables type duplicates from workflow routes and migrated all 3 admin templates from legacy renderAdminLayout to renderAdminLayoutCatalyst.

## What Was Done

### Task 1: Fix route type imports
Both `routes.ts` and `admin-routes.ts` had locally-defined `Bindings` and `Variables` types that were incorrect (used `KV` instead of `CACHE_KV`, and `Variables.user` was non-optional). Replaced both local blocks with:

```typescript
import type { Bindings, Variables } from '../../../app'
```

Also removed erroneous `await` from all `c.get('user')` calls (it's a synchronous method) and fixed an implicit `any[]` type annotation.

### Task 2: Migrate 3 templates to Catalyst layout
All three workflow admin templates (`workflow-dashboard.ts`, `workflow-content.ts`, `scheduled-content.ts`) were using `renderAdminLayout` from the package alias `@flare-cms/core/templates`. This is the legacy layout that renders outside the Catalyst sidebar/header theme.

Migrated each to use `renderAdminLayoutCatalyst` with the `AdminLayoutCatalystData` interface pattern. The user object was mapped from the raw JWT shape `{ userId, email, role }` to Catalyst's expected `{ name, email, role }` shape (using email as the display name since the JWT lacks a separate display name field).

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `../../../app` relative path | workflow-plugin/ is 3 levels below src/, not 4 |
| `../../../../templates/layouts/` | templates/ subdir of workflow-plugin/ is 4 levels below src/ |
| User name falls back to email | JWT payload has no display name field; email is most useful |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected relative import depth in plan instructions**

- **Found during:** Task 1 execution
- **Issue:** Plan stated `../../../../app` (4 levels) but actual path is `../../../app` (3 levels). Verified by counting: workflow-plugin → core-plugins → plugins → src.
- **Fix:** Used correct `../../../app` path
- **Files modified:** Both route files
- **Commit:** 49664b4

**2. [Rule 1 - Bug] Fixed implicit `any[]` in admin-routes.ts**

- **Found during:** Task 1 TypeScript check
- **Issue:** `let assignedContent = []` had implicit `any[]` type causing TS error
- **Fix:** Added explicit type annotation `let assignedContent: any[] = []`
- **Files modified:** admin-routes.ts
- **Commit:** 49664b4

## Verification Results

- Zero TypeScript errors in all 5 modified files
- Zero `renderAdminLayout` (legacy) references in workflow-plugin directory
- Zero local `type Bindings` or `type Variables` definitions in route files
- Pre-existing TypeScript errors in admin-analytics, admin-dashboard, admin-settings templates are unrelated to this plan

## Next Phase Readiness

Plan 10-03 (mount routes in app.ts) can now proceed. Both route files export cleanly typed `createWorkflowRoutes()` and `createWorkflowAdminRoutes()` functions ready for mounting.
