---
phase: 05-documentation-content
plan: 05
subsystem: content
tags: [seed-script, docs, api, idempotent, remark-gfm]

# Dependency graph
requires:
  - phase: 05-documentation-content (plans 01-04)
    provides: seed script infrastructure + 31 authored markdown pages across 8 sections
provides:
  - "All 31 documentation pages seeded and rendering on localhost"
  - "Idempotent seed script verified end-to-end"
  - "remark-gfm added for markdown table rendering"
affects: [06-audit-gap-closure]

# Tech tracking
tech-stack:
  added: [remark-gfm]
  patterns: [idempotent-seeding, form-encoded-auth]

key-files:
  created: []
  modified:
    - packages/cms/scripts/seed-docs.ts
    - packages/site/src/lib/markdown.ts
    - packages/site/package.json

key-decisions:
  - "Seed script auth uses URLSearchParams (form-encoded), not JSON body"
  - "JWT extracted from Set-Cookie header after login"
  - "FK constraints require deleting pages before sections during cleanup"
  - "remark-gfm required for markdown table rendering in rehype pipeline"

patterns-established:
  - "Idempotent seeding: delete-all then recreate pattern"
  - "Form-encoded auth for CMS API login"

# Metrics
duration: 5min
completed: 2026-03-08
---

# Phase 5 Plan 5: Seed and Verify Documentation Summary

**Seed script populates 8 sections and 31 docs pages end-to-end with idempotent re-run, plus remark-gfm fix for table rendering**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-08
- **Completed:** 2026-03-08
- **Tasks:** 2 (1 auto + 1 checkpoint)
- **Files modified:** 4

## Accomplishments
- Seed script runs successfully, creating 8 documentation sections and 31 pages via CMS API
- Idempotency verified: running seed script twice produces identical state (no duplicates)
- All 31 documentation pages render correctly on localhost:4321/docs with proper formatting
- Markdown tables now render correctly after adding remark-gfm to the pipeline
- User verified rendering quality as "STUNNINNNNNG"

## Task Commits

Each task was committed atomically:

1. **Task 1: Run seed script and verify API seeding** - `0400e42` (fix) - Fixed auth format, JWT extraction, FK constraint handling; verified 8 sections + 31 pages + idempotency
2. **Checkpoint: Human verification of docs rendering** - approved (orchestrator fix: `1cdb118` for remark-gfm)

**Plan metadata:** (pending)

## Files Created/Modified
- `packages/cms/scripts/seed-docs.ts` - Fixed auth to use form-encoded POST, JWT cookie extraction, FK-safe deletion order
- `packages/site/src/lib/markdown.ts` - Added remark-gfm to unified pipeline for table rendering
- `packages/site/package.json` - Added remark-gfm dependency
- `pnpm-lock.yaml` - Updated lockfile

## Decisions Made
- Seed script auth uses URLSearchParams (form-encoded) matching the CMS login endpoint expectations
- JWT token extracted from Set-Cookie response header after authentication
- Deletion order enforced: docs pages first, then docs-sections (FK constraint compliance)
- remark-gfm added to markdown pipeline for GFM table support (tables used in API Reference docs)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Auth format mismatch in seed script**
- **Found during:** Task 1
- **Issue:** Seed script sent JSON body to /auth/login but endpoint expects form-encoded data
- **Fix:** Changed to URLSearchParams body with application/x-www-form-urlencoded content type
- **Files modified:** packages/cms/scripts/seed-docs.ts
- **Committed in:** 0400e42

**2. [Rule 1 - Bug] JWT extraction from wrong response field**
- **Found during:** Task 1
- **Issue:** Script tried to read token from response JSON but CMS sets it via Set-Cookie header
- **Fix:** Extract JWT from Set-Cookie header in login response
- **Files modified:** packages/cms/scripts/seed-docs.ts
- **Committed in:** 0400e42

**3. [Rule 1 - Bug] FK constraint violation during seed cleanup**
- **Found during:** Task 1
- **Issue:** Deleting sections before pages caused foreign key constraint errors
- **Fix:** Reversed deletion order to delete pages first, then sections
- **Files modified:** packages/cms/scripts/seed-docs.ts
- **Committed in:** 0400e42

**4. [Rule 3 - Blocking] Missing remark-gfm for table rendering**
- **Found during:** Checkpoint (human verification)
- **Issue:** Markdown tables in API Reference docs rendered as plain text
- **Fix:** Added remark-gfm to the unified/rehype pipeline (orchestrator fix)
- **Files modified:** packages/site/src/lib/markdown.ts, packages/site/package.json
- **Committed in:** 1cdb118

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 blocking)
**Impact on plan:** All fixes necessary for correct seed execution and content rendering. No scope creep.

## Issues Encountered
- Seed script had multiple integration bugs that only surfaced during actual API execution (auth format, JWT extraction, deletion order). All were fixed inline during Task 1.
- Table rendering issue discovered during human verification checkpoint. Fixed by orchestrator before continuation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 5 (Documentation Content) is now COMPLETE
- All 31 documentation pages are seeded and rendering correctly
- Phase 6 (Audit & Gap Closure) can proceed
- Seed script is idempotent for future content resets

---
*Phase: 05-documentation-content*
*Completed: 2026-03-08*
