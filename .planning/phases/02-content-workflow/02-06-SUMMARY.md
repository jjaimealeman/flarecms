---
phase: 02-content-workflow
plan: 06
subsystem: auth
tags: [rbac, d1, hono, htmx, permissions, collection-scoped]

# Dependency graph
requires:
  - phase: 01-security-hardening
    provides: requireAuth, requireRole middleware, JWT auth foundation
  - phase: 02-07
    provides: RBAC service (rbac.ts) and user_collection_permissions table created in prior commit

provides:
  - Collection-level RBAC: checkCollectionPermission() enforced in API and admin routes
  - user_collection_permissions table with user_id, collection_id, role, granted_by columns
  - Admin UI for assigning viewer/author/editor roles per collection (HTMX lazy-loaded)
  - Non-admin users restricted to their permitted collections in content list
  - Author role enforced: can only edit/delete their own content

affects:
  - 02-07 (API token collection scoping builds on same RBAC infrastructure)
  - Any future plan that creates content or modifies collections
  - Phase 03 (media/webhooks) if those have collection-level access needs

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RBAC guard pattern: checkCollectionPermission() → isAuthorAllowedToEdit() chain"
    - "HTMX lazy-load pattern for admin sidebar sections (hx-trigger=load)"
    - "requireRole() middleware stacked before route handlers for admin-only routes"

key-files:
  created:
    - sonicjs-fork/packages/core/src/services/rbac.ts
  modified:
    - sonicjs-fork/packages/core/src/routes/api-content-crud.ts
    - sonicjs-fork/packages/core/src/routes/admin-content.ts
    - sonicjs-fork/packages/core/src/routes/admin-users.ts
    - sonicjs-fork/packages/core/src/templates/pages/admin-user-edit.template.ts
    - sonicjs-fork/packages/core/src/services/index.ts

key-decisions:
  - "Admin global role (user.role==='admin') bypasses all collection-level checks"
  - "Author edit check is two-step: checkCollectionPermission returns true, then isAuthorAllowedToEdit checks author_id === userId"
  - "Admin UI uses HTMX hx-trigger=load for lazy-loading permissions table (avoids N+1 on page load)"
  - "requireRole('admin') middleware applied to /users/* pattern covers all user management routes"
  - "Empty role dropdown value = revoke permission (no separate delete button needed)"

patterns-established:
  - "Collection RBAC: always call checkCollectionPermission before any mutating operation"
  - "Author-own-content rule: look up collectionRole from DB separately for non-admin users"
  - "Permission UI pattern: HTMX lazy-loaded fragment with inline POST on select change"

# Metrics
duration: 33min
completed: 2026-03-02
---

# Phase 2 Plan 06: Collection-Level RBAC Summary

**Collection-scoped permission system enforced in API and admin routes: editor/author/viewer roles via user_collection_permissions table, with HTMX admin UI for per-collection role assignment**

## Performance

- **Duration:** 33 min
- **Started:** 2026-03-02T06:25:55Z
- **Completed:** 2026-03-02T06:59:31Z
- **Tasks:** 3 (plus 02-07 follow-up cleanup)
- **Files modified:** 7

## Accomplishments

- `user_collection_permissions` table created in local D1 with indexes on user_id and collection_id
- `rbac.ts` service with `checkCollectionPermission()`, `getCollectionPermissions()`, `grantCollectionPermission()`, `revokeCollectionPermission()`, `isAuthorAllowedToEdit()` — all exported from services/index.ts
- API content CRUD routes (POST create, PUT edit, DELETE) now check collection permission before proceeding; author-only-own-content enforced on edit/delete
- Admin content routes enforce RBAC on POST/PUT/DELETE; content list filters to allowed collections for non-admin users
- Admin users routes now require admin role for all `/users/*`, `/invite-user`, `/resend-invitation/*`, `/cancel-invitation/*` paths
- Admin UI: user edit page shows HTMX-lazy-loaded collection permissions section with role dropdowns; changes save immediately via POST on select change

## Task Commits

1. **Task 1: RBAC service** - `0dd74177` (feat — created in prior 02-07 commit; database table created in D1)
2. **Task 2: Enforce RBAC in API and admin routes** - `f75925ef` (feat)
3. **Task 3: Admin UI for permission assignment** - `c30fad3d` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `sonicjs-fork/packages/core/src/services/rbac.ts` — RBAC service with all 5 functions
- `sonicjs-fork/packages/core/src/services/index.ts` — exports for RBAC and API tokens
- `sonicjs-fork/packages/core/src/routes/api-content-crud.ts` — RBAC checks on create/edit/delete
- `sonicjs-fork/packages/core/src/routes/admin-content.ts` — RBAC checks, collection filtering for non-admins
- `sonicjs-fork/packages/core/src/routes/admin-users.ts` — requireRole('admin') on user mgmt routes; permissions GET/POST routes
- `sonicjs-fork/packages/core/src/templates/pages/admin-user-edit.template.ts` — showCollectionPermissions field + HTMX section

## Decisions Made

- Admin global role bypasses all collection checks (no DB lookup needed)
- Author role allows edit/publish in checkCollectionPermission, but `isAuthorAllowedToEdit()` must be called separately by the route to enforce own-content restriction
- GET endpoints (content list, single content) are NOT RBAC-restricted — public read access preserved per original design
- Empty string role in permission UI = revoke (clean UX, no separate delete endpoint needed)
- HTMX lazy-load for permissions section avoids making every user edit page load slower

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TypeScript errors blocking pre-commit hook**
- **Found during:** Task 1 (first commit attempt)
- **Issue:** `admin-content.ts` lines 949 and 976 had `validationErrors: { slug: 'string' }` but the type requires `string[]`. Pre-commit hook ran `tsc --noEmit` which caught this.
- **Fix:** System linter auto-corrected both to array literals `['string']`
- **Files modified:** `packages/core/src/routes/admin-content.ts`
- **Committed in:** `0bee24b7` (grouped with other 02-07 follow-up work)

**2. [Rule 3 - Blocking] Committed dist files with source changes to resolve module resolution**
- **Found during:** Task 1 (commit attempts)
- **Issue:** `pnpm build` regenerates dist with new hash-named chunk files; committed dist had old hash names; plugins importing `@sonicjs-cms/core` from within the same package couldn't resolve declarations
- **Fix:** Always run `pnpm build` immediately before committing, then stage dist files alongside source changes
- **Committed in:** Each task commit includes updated dist files

**3. [Rule 3 - Blocking] Committed remaining 02-07 follow-up work before starting 02-06**
- **Found during:** Task 1 verification
- **Issue:** Plans 02-07 and 02-02 had uncommitted source changes (api.ts, app.ts, auth.ts, routes/index.ts, admin-api-tokens.ts) from a previous session; these were blocking the commit because they were incomplete
- **Fix:** Committed all 02-07 follow-up changes first (middleware/auth.ts API key support, routes/index.ts and src/index.ts exports, app.ts Variables.apiToken type)
- **Committed in:** `0bee24b7`

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes unblocked execution. No scope creep. The 02-07 follow-up work was pre-existing uncommitted work, not new scope.

## Issues Encountered

The sonicjs-fork dist files are tracked in git, which creates a recurring issue: every `pnpm build` regenerates chunk files with new hash names (tsup content-hashing). The workaround is to always build immediately before committing and stage dist files. The proper fix (add `packages/core/dist/` to `.gitignore`) would require removing those tracked files, which is a separate cleanup task.

## Next Phase Readiness

- Collection RBAC is fully operational in API and admin routes
- Admin can assign viewer/author/editor roles per collection via user edit page
- Ready for Phase 2 plans 02-01 through 02-05 (content workflow states, versioning, etc.)
- The `user_collection_permissions` table needs to be included in any production migration scripts

---
*Phase: 02-content-workflow*
*Completed: 2026-03-02*
