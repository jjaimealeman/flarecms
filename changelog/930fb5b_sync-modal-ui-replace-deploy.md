# 2026-03-13 - Sync Modal UI: Replace Deploy with Content Staging Review (Phase 3)

**Keywords:** [STAGING] [UI] [MODAL] [SYNC] [SIDEBAR]
**Session:** Afternoon, Duration (~30 min)
**Commit:** 930fb5b

## What Changed

- File: `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts`
  - Replaced Deploy modal + Deploy Setup modal with single Sync modal
  - Sync modal shows pending revisions grouped by collection with changed fields, author, time
  - Each revision has a Reject button; footer has Go Live (approve all) button
  - Replaced Deploy sidebar button with Sync button: always visible, disabled when no pending, pulsing border when changes pending
  - Added subtext below Sync button: "X pending" or "Up to date"
  - Replaced all Deploy JS (checkPendingDeploy, openDeployModal, triggerDeploy, etc.) with Sync JS (checkPendingSync, openSyncModal, syncAll, rejectRevision)
  - Added sync-pulse CSS keyframe animation for pending state
  - Added formatTimeAgo helper for relative timestamps
  - All dynamic content built with DOM API (createElement/textContent) — no innerHTML
  - Sync button visible to all roles (not just admin), settings still admin-only

## Why

Phase 3 of the editorial workflow: the UI layer. The Deploy button was triggering GitHub Actions rebuilds which don't make sense in SSR mode. The new Sync button lets users review all pending content revisions and approve them to go live, or reject individual changes.

## Issues Encountered

- Security hook flagged innerHTML usage in initial attempt — rewrote all dynamic rendering with safe DOM methods (createElement, textContent, appendChild)

## Dependencies

No dependencies added

## Testing Notes

- What was tested: Build compiles, no TypeScript errors
- What wasn't tested: Full visual flow — requires wrangler restart with migration 036 applied
- Edge cases: Empty state (no pending), reject + refresh, approve all, pulse animation

## Next Steps

- [ ] Restart wrangler, apply migration 036, test full E2E flow
- [ ] Phase 4: Media staging in R2 (future)
- [ ] Phase 5: Audit trail integration (future)

---

**Branch:** feature/workflow-staging
**Issue:** N/A
**Impact:** HIGH - replaces Deploy UI with Sync modal across all admin pages
