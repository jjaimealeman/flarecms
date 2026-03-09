---
phase: 08-live-preview-api
plan: 02
subsystem: ui
tags: [hono, preview, split-screen, iframe, debounce, drag-resize]

# Dependency graph
requires:
  - phase: 08-live-preview-api
    provides: Draft content API endpoints (POST /api/preview/draft, GET /api/preview/draft/:token)
provides:
  - Split-screen preview page template (renderAdminPreviewPage)
  - GET route at /admin/preview/:collectionId/:contentId serving preview page
  - Updated "Open Live Preview" button navigating to preview page
  - Dual mount of preview routes at /api/preview and /admin/preview
affects: [08-03 Astro preview route]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Standalone full-viewport page (no admin layout wrapper) for immersive editing"
    - "Draggable split-pane with mousedown/mousemove/mouseup on divider element"
    - "Debounced form-change handler with 500ms delay for draft saves"
    - "sonicReadFieldValue for collecting structured field data"

key-files:
  created:
    - packages/core/src/templates/pages/admin-preview.template.ts
  modified:
    - packages/core/src/routes/admin-preview.ts
    - packages/core/src/app.ts
    - packages/core/src/templates/pages/admin-content-form.template.ts

key-decisions:
  - "Standalone page (no admin layout) for full-viewport split-screen experience"
  - "Dual mount at /api/preview and /admin/preview for both API and page access"
  - "iframe.src replacement (full reload) for preview updates -- postMessage deferred to Plan 03"
  - "Same-tab navigation from content form to preview page (no window.open)"

patterns-established:
  - "Preview page helpers (getCollectionForPreview, getCollectionFieldsForPreview) duplicate admin-content.ts logic with same cache keys for cache reuse"

# Metrics
duration: 6min
completed: 2026-03-09
---

# Phase 8 Plan 2: Split-Screen Preview Page Summary

**Split-screen preview page with draggable divider, debounced draft saves, and iframe-based content preview**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-09T15:19:55Z
- **Completed:** 2026-03-09T15:26:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Full-viewport split-screen page with editor fields on left (40%) and iframe preview on right (60%)
- Draggable divider with 300px minimum width enforcement per pane
- Debounced (500ms) form change handler triggers POST /api/preview/draft and reloads iframe with token
- Loading overlay with spinner during iframe refresh transitions
- Updated "Preview Content" button to "Open Live Preview" with same-tab navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create split-screen preview page template** - `d99a811` (feat - pre-existing from prior run)
2. **Task 2: Add GET route for preview page and update Preview button** - `f70c1d3` (feat)

## Files Created/Modified
- `packages/core/src/templates/pages/admin-preview.template.ts` - Full-viewport split-screen preview page with editor, divider, and iframe
- `packages/core/src/routes/admin-preview.ts` - Added GET /:collectionId/:contentId route with collection/field/content fetching
- `packages/core/src/app.ts` - Added second mount point at /admin/preview
- `packages/core/src/templates/pages/admin-content-form.template.ts` - Updated previewContent() to navigate to preview page

## Decisions Made
- Standalone page without admin layout wrapper to maximize viewport for split-screen editing
- Duplicated getCollection/getCollectionFields helpers in admin-preview.ts (same cache keys for reuse) rather than extracting shared module -- minimizes refactoring scope
- Used iframe.src replacement for preview updates (full reload) per plan spec -- postMessage optimization deferred to Plan 03
- Same-tab navigation from content form to preview page (replaced window.open pattern)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Task 1 template file already existed from a prior execution attempt (committed under 08-03 label) -- file content was identical, no re-commit needed

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Preview page is ready for Plan 08-03 (Astro SSR preview route)
- The iframe will load `{siteUrl}/preview/{collection}/{slug}?token={token}` -- Plan 03 creates this Astro route
- postMessage listener in Plan 03 can later optimize preview updates without full iframe reload

---
*Phase: 08-live-preview-api*
*Completed: 2026-03-09*
