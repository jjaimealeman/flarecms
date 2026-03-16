# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** Prove that Flare CMS works by using it to power its own documentation
**Current focus:** v2.1 Live Demo -- Phase 11: Sandbox Foundation

## Current Position

Phase: 11 of 14 (Sandbox Foundation)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-03-16 -- Completed 11-01-PLAN.md (demo-sandbox plugin + migration 038)

Progress: [██░░░░░░░░] 20% (1/5 plans)

## Performance Metrics

**Previous milestone (v2.0):**
- 10 phases, 31 plans, 236 commits, 8 days

**Current milestone (v2.1):**
- 4 phases, 5 plans estimated
- Plans completed: 1

## Accumulated Context

### Decisions

Full decision log in PROJECT.md.

Recent decisions:
- Minimal gate for demo (not polished landing) -- get people into admin fast
- Demo as plugin approach (not core) -- not every install needs public demo
- Migration SQL in packages/core/migrations/ (not src/db/migrations/) -- pre-commit hook auto-bundles
- Plugin import in app.ts is direct (no pluginManager.install()) for Phase 11; routes added in Phase 12
- demo-sandbox collection managed=1 so it shows in admin but schema UI cannot modify it

### Prerequisites Verified

- Resend email working in prod (tested 2026-03-16)
- RBAC middleware shipped (admin/editor/viewer roles)
- Audit logging shipped
- OTP login plugin wired (depends on email plugin)

### Tech Debt (remaining from v2.0)

- `workflowPlugin` dead code deferred (routes work via direct wiring)
- Phase 6 missing VERIFICATION.md

### Blockers/Concerns

- Broken API filters force client-side filtering -- inherited from SonicJS v2.8.0

## Session Continuity

Last session: 2026-03-16T19:09:30Z
Stopped at: Completed 11-01-PLAN.md (demo-sandbox plugin + migration 038)
Resume file: None
