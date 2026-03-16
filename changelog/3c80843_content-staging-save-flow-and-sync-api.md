# 2026-03-13 - Content Staging: Save Flow Intercept + Sync API Routes (Phase 2)

**Keywords:** [STAGING] [ROUTES] [API] [EDITORIAL] [WORKFLOW]
**Session:** Afternoon, Duration (~30 min)
**Commit:** 3c80843

## What Changed

- File: `packages/core/src/routes/admin-content.ts`
  - Added staging intercept: editing published content creates a pending revision via `createPendingRevision()` instead of overwriting live data
  - Admin bypass: if user is admin AND checks "Publish immediately", saves directly
  - Non-admin users always stage edits to published content
  - Draft content saves directly (unchanged behavior)
  - Imported `createPendingRevision` from revisions service
  - Added `status: 'history'` to existing version insert for clarity
- File: `packages/core/src/routes/admin-sync.ts`
  - New route file with 5 endpoints under `/admin/sync`:
  - `GET /api/pending-count` — lightweight badge count for sidebar
  - `GET /api/pending` — full pending list with computed diffs for Sync modal
  - `POST /api/approve` — approve single revision (editors + admins)
  - `POST /api/approve-all` — approve all revisions (admins only)
  - `POST /api/reject` — reject a revision with optional comment
- File: `packages/core/src/routes/index.ts`
  - Exported `adminSyncRoutes`
- File: `packages/core/src/app.ts`
  - Imported and mounted `adminSyncRoutes` at `/admin/sync`
- File: `packages/core/src/templates/pages/admin-content-form.template.ts`
  - Added "Publish immediately" checkbox for admins editing published content
  - Added "Edits will be staged for review" label for non-admin users
- File: `packages/core/src/db/migrations-bundle.ts`
  - Regenerated timestamp

## Why

Phase 2 of the editorial workflow: the core behavioral change where edits to published content no longer overwrite the live version instantly. Instead, they create pending revisions that must be approved via the Sync button. This protects the live site from accidental changes while giving admins a bypass for quick fixes.

## Issues Encountered

No major issues encountered

## Dependencies

No dependencies added

## Testing Notes

- What was tested: Build compiles successfully
- What wasn't tested: Full E2E flow (pending revision creation, Sync API responses) — requires wrangler restart with migration 036
- Edge cases: Admin bypass checkbox, non-admin staging enforcement, draft content passthrough

## Next Steps

- [ ] Phase 3: Build Sync modal UI in sidebar (replaces Deploy button)
- [ ] Test full flow: edit published content → see pending badge → approve via Sync

---

**Branch:** feature/workflow-staging
**Issue:** N/A
**Impact:** HIGH - changes how content saves work for published items
