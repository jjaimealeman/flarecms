---
phase: 02-content-workflow
plan: 02
subsystem: api
tags: [state-machine, content, status, slug, d1, sqlite, unique-index, hono, typescript]

# Dependency graph
requires:
  - phase: 00-foundation
    provides: sonicjs-fork setup, D1 database, wrangler config
  - phase: 01-security-hardening
    provides: auth middleware, JWT, requireAuth

provides:
  - Bidirectional content status transitions (published <-> draft <-> archived)
  - Invalid transition rejection with 409 + descriptive error message
  - Slug lock after first publish (409 on attempted slug change)
  - DB-level slug uniqueness: UNIQUE INDEX on content(collection_id, slug)
  - Shared state machine service (single source of truth for status rules)

affects:
  - 02-03-content-scheduling
  - 02-04-workflow-history
  - Any plan that modifies content status or slug

# Tech tracking
tech-stack:
  added: []
  patterns:
    - State machine pattern for status transitions (VALID_TRANSITIONS map + validator function)
    - Slug lock pattern (published_at non-null = immutable slug)
    - DB-level constraint + app-level validation (defense in depth for slug uniqueness)

key-files:
  created:
    - sonicjs-fork/packages/core/src/services/content-state-machine.ts
  modified:
    - sonicjs-fork/packages/core/src/services/index.ts
    - sonicjs-fork/packages/core/src/index.ts
    - sonicjs-fork/packages/core/src/routes/api-content-crud.ts
    - sonicjs-fork/packages/core/src/routes/admin-content.ts

key-decisions:
  - "State machine as standalone service (content-state-machine.ts) imported by both API and admin routes — never duplicated"
  - "Slug lock uses published_at column: non-null means content has been published at least once"
  - "Unpublish (published->draft) clears published_at, scheduled_publish_at, and scheduled_unpublish_at"
  - "Unique index on content(collection_id, slug) at D1 level — defense-in-depth beyond app-level check"

patterns-established:
  - "Content status transitions always validated via validateStatusTransition() before any DB write"
  - "isSlugLocked() checked before any slug update — slug immutable post-publish"
  - "getUnpublishUpdates() returns canonical set of fields to clear on draft transition"

# Metrics
duration: 23min
completed: 2026-03-02
---

# Phase 2 Plan 02: Content State Machine Summary

**Bidirectional status transitions (published<->draft<->archived) with slug immutability after publish, enforced at both app and DB level via state machine service + D1 unique index**

## Performance

- **Duration:** ~23 min
- **Started:** 2026-03-02T06:20:00Z
- **Completed:** 2026-03-02T06:43:41Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- Created `content-state-machine.ts` as the single source of truth for transition rules: `draft -> [published, archived]`, `published -> [draft, archived]`, `archived -> [draft]`
- Wired state machine into both `api-content-crud.ts` PUT handler and `admin-content.ts` PUT/bulk-action handlers — no duplicate logic
- Enforced slug lock: after `published_at` is set, slug cannot be changed; 409 returned from both API and admin routes
- Added `UNIQUE INDEX idx_content_collection_slug ON content(collection_id, slug)` to local D1 for DB-level uniqueness enforcement
- Unpublish operation clears `published_at`, `scheduled_publish_at`, and `scheduled_unpublish_at` atomically

## Task Commits

1. **Task 1: Create content state machine service** - `0dd74177` (feat - already committed as part of 02-07 pre-work)
2. **Task 2: Wire state machine into API/admin routes + slug uniqueness index** - `34508d46` (feat)

## Files Created/Modified

- `sonicjs-fork/packages/core/src/services/content-state-machine.ts` - VALID_TRANSITIONS map, validateStatusTransition(), isSlugLocked(), getUnpublishUpdates()
- `sonicjs-fork/packages/core/src/services/index.ts` - exports content-state-machine functions
- `sonicjs-fork/packages/core/src/index.ts` - re-exports state machine functions from package root
- `sonicjs-fork/packages/core/src/routes/api-content-crud.ts` - PUT handler: transition validation, slug lock, publish timestamp, unpublish clearing
- `sonicjs-fork/packages/core/src/routes/admin-content.ts` - PUT handler: same rules; bulk-action: per-item transition validation

## Decisions Made

- State machine service placed in `services/` not `utils/` — it's business logic, not a pure utility
- `isSlugLocked` uses `published_at` (not `status === 'published'`) — ensures slug stays locked even after unpublishing, which is the correct behavior for URL stability
- `getUnpublishUpdates()` returns only the scheduling fields as null; `published_at` is handled separately in routes to maintain distinct semantics (lock vs. schedule)
- Bulk action validates transitions per-item and rejects the entire batch if any item has an invalid transition — prevents partial updates

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] validationErrors type mismatch: string vs string[]**

- **Found during:** Task 2 (admin-content.ts wiring)
- **Issue:** `ContentFormData.validationErrors` is typed as `Record<string, string[]>` but I initially passed `string`. TypeScript caught this at compile time.
- **Fix:** Changed string literals to single-element arrays: `['Slug cannot be changed after first publish']`
- **Files modified:** sonicjs-fork/packages/core/src/routes/admin-content.ts
- **Verification:** `tsc --noEmit` passes with no errors
- **Committed in:** `34508d46` (Task 2 commit)

**2. [Rule 1 - Bug] Linter/formatter reverted file changes during parallel build**

- **Found during:** Task 2
- **Issue:** The pre-commit lint hook triggered as part of a background `pnpm build` and reset my in-progress edits to admin-content.ts. The edit was lost mid-build.
- **Fix:** Re-applied all edits to admin-content.ts after the build completed, then re-committed.
- **Files modified:** sonicjs-fork/packages/core/src/routes/admin-content.ts
- **Verification:** Final commit includes all expected changes; build and tests pass
- **Committed in:** `34508d46` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 type bug, 1 tooling interference)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

- Task 1 (content-state-machine.ts) was already committed in `0dd74177` as part of plan 02-07 pre-work — detected from git log. Skipped re-creating and proceeded directly to Task 2.
- Pre-commit hook (`pnpm lint && tsc && vitest`) ran during background build and reverted in-progress file edits. Resolved by re-applying after build completed.

## User Setup Required

None — DB-level index was applied to local D1. For remote/staging deployment, apply:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_collection_slug ON content(collection_id, slug);
```

via: `npx wrangler d1 execute DB --remote --command "CREATE UNIQUE INDEX IF NOT EXISTS idx_content_collection_slug ON content(collection_id, slug);"`

## Next Phase Readiness

- State machine ready for Phase 02-03 (scheduling) — scheduled_publish_at/unpublish_at are now cleared on unpublish
- Workflow history (02-04) can use validateStatusTransition to pre-validate before logging
- All content status mutations now go through consistent validation — safe foundation for RBAC per-status restrictions

---
*Phase: 02-content-workflow*
*Completed: 2026-03-02*
