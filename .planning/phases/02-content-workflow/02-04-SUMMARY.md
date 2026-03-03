---
phase: 02-content-workflow
plan: 04
subsystem: ui
tags: [version-history, modal, rollback, audit-trail, htmx, dom, javascript]

# Dependency graph
requires:
  - phase: 02-03
    provides: audit-trail service with logStatusChange/logContentEdit and action_type column

provides:
  - Working version history modal that closes without page reload (bug #666 fixed)
  - Version rollback with action_type='rollback' in workflow_history

affects: [future-ui-work, 03-frontend-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Scripts injected via innerHTML do not execute — all modal JS must live in the host page template"
    - "Modal identified by id=version-history-modal for reliable DOM targeting"
    - "Backdrop click-to-close via modal.addEventListener('click', e => e.target===modal && close())"
    - "Non-blocking audit trail: rollback audit wrapped in try/catch, errors logged but never surface"

key-files:
  created: []
  modified:
    - sonicjs-fork/packages/core/src/templates/components/version-history.template.ts
    - sonicjs-fork/packages/core/src/templates/pages/admin-content-form.template.ts
    - sonicjs-fork/packages/core/src/routes/admin-content.ts

key-decisions:
  - "Root cause of bug #666: <script> tags inside innerHTML are not executed by browsers — functions closeVersionHistory/restoreVersion/previewVersion/toggleChanges were never defined"
  - "Fix: moved all version history JS functions to admin-content-form.template.ts where the showVersionHistory() host function lives"
  - "Rollback audit now uses action_type='rollback' and action='rollback' (was 'version_restored' with no action_type)"
  - "restoreVersion() now calls closeVersionHistory() before reload — modal closes first, then page reloads after 1.2s"

patterns-established:
  - "Modal JS pattern: host template owns all modal interaction JS; fragment template is pure HTML only"
  - "Rollback audit pattern: non-blocking try/catch wrapping workflow_history insert"

# Metrics
duration: 18min
completed: 2026-03-02
---

# Phase 2 Plan 4: Content Versioning UI Fix Summary

**Version history modal close bug (#666) fixed by moving JS functions out of innerHTML-injected fragment into host form template; rollback now logs action_type='rollback' in workflow_history**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-03-02T07:20:00Z
- **Completed:** 2026-03-02T07:38:00Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Identified root cause of modal close bug: script tags in innerHTML-injected HTML fragments are never executed by browsers, so `closeVersionHistory()` and friends were undefined globals
- Moved `closeVersionHistory()`, `restoreVersion()`, `previewVersion()`, and `toggleChanges()` from version-history template (dead code) into admin-content-form template (live scope)
- Added `id="version-history-modal"` to modal div and backdrop click-to-close handler
- Updated rollback handler to use `action_type='rollback'` and `action='rollback'` with non-blocking try/catch

## Task Commits

Each task was committed atomically:

1. **Task 1: Investigate and fix version history modal close bug + rollback** - `07ddea7f` (fix)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `sonicjs-fork/packages/core/src/templates/components/version-history.template.ts` - Removed dead `<script>` block (50 lines) that was never executing; kept pure HTML modal fragment
- `sonicjs-fork/packages/core/src/templates/pages/admin-content-form.template.ts` - Added `closeVersionHistory()`, `restoreVersion()`, `previewVersion()`, `toggleChanges()` functions plus id/backdrop click handler on modal
- `sonicjs-fork/packages/core/src/routes/admin-content.ts` - Updated restore handler to use `action_type='rollback'` with non-blocking audit try/catch

## Decisions Made

- **Root cause first, fix second:** Read the template + form template together before touching code — the bug was architectural (script tag execution semantics), not a typo
- **Keep restoreVersion() reload:** After rollback, a page reload is still needed to refresh form field values from DB. But modal closes first (UX improvement), then 1.2s delay gives user time to see the success notification
- **Non-blocking audit trail:** Consistent with the pattern established in 02-03 — rollback audit failure must never block a successful restore operation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing popup-blocked guard in previewVersion()**
- **Found during:** Task 1 (code review of restoreVersion refactor)
- **Issue:** `window.open()` returns `null` if blocked by browser; subsequent `preview.document.write()` throws TypeError
- **Fix:** Added null check with user-visible notification ("Pop-up blocked...")
- **Files modified:** admin-content-form.template.ts
- **Verification:** Code review
- **Committed in:** `07ddea7f`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor guard — does not change scope.

## Issues Encountered

- The plan's `must_haves.artifacts.key_links` section expected `hx-post.*version|rollback` HTMX attributes in the template. The actual implementation uses native `fetch()` in JavaScript (not HTMX declarative attributes). This is correct — the version history loads dynamically via JavaScript fetch, not HTMX. The modal pattern predates the HTMX introduction in this codebase. No change needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 is now 100% complete (all 7 plans: 02-01 through 02-07 done)
- Version history modal is fully functional: open, close, backdrop-click-close, rollback with audit trail
- Ready to proceed to Phase 3 (frontend integration or next planned phase)
- Blocker reminder: workflow_history `action_type` and `changed_fields` columns must be applied `--remote` before staging/production deployment (from 02-03)

---
*Phase: 02-content-workflow*
*Completed: 2026-03-02*
