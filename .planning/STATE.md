# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** Prove that Flare CMS works by using it to power its own documentation
**Current focus:** v2.1 Live Demo -- Phase 13: Demo Page

## Current Position

Phase: 13 of 14 (Demo Page)
Plan: 0 of 1 in current phase
Status: Not started
Last activity: 2026-03-16 -- Completed Phase 12 (Demo Authentication)

Progress: [████████░░] 80% (4/5 plans)

## Performance Metrics

**Previous milestone (v2.0):**
- 10 phases, 31 plans, 236 commits, 8 days

**Current milestone (v2.1):**
- 4 phases, 5 plans estimated
- Plans completed: 4

## Accumulated Context

### Decisions

Full decision log in PROJECT.md.

Recent decisions:
- Minimal gate for demo (not polished landing) -- get people into admin fast
- Demo as plugin approach (not core) -- not every install needs public demo
- Migration SQL in packages/core/migrations/ (not src/db/migrations/) -- pre-commit hook auto-bundles
- Plugin import in app.ts is direct (no pluginManager.install()) for Phase 11; routes added in Phase 12
- demo-sandbox collection managed=1 so it shows in admin but schema UI cannot modify it
- Demo user detection uses KV key existence (demo-mutations:{userId}), NOT role check -- avoids false-positive on viewer role shared by API token users
- Middleware wired in app.ts (not plugin index) so guards apply to existing /api/content/* and /api/media/* routes
- formData body-consumption solved: guard parses once, stores as parsedFormData on context, downstream reuses it
- Demo user creation grants editor on demo-sandbox-collection first, then viewer on all other active collections -- editor granted first to prevent downgrade via ON CONFLICT DO UPDATE; continue guard provides defense-in-depth
- 30-min JWT issued via direct sign() not AuthManager.generateToken() (which hardcodes 24h TTL)
- CSRF exempted for /demo/auth: demo users have no csrf_token yet at time of POST /verify, but stale auth_token from prior session would trigger validation
- Disposable domain blocking at /request (fail before OTP code is created)
- Email send failure is non-blocking -- OTP code still created, user can retry

### Prerequisites Verified

- Resend email working in prod (tested 2026-03-16)
- RBAC middleware shipped (admin/editor/viewer roles)
- Audit logging shipped
- OTP login plugin wired (depends on email plugin)
- Demo auth endpoints wired: POST /demo/auth/request + POST /demo/auth/verify

### Tech Debt (remaining from v2.0)

- `workflowPlugin` dead code deferred (routes work via direct wiring)
- Phase 6 missing VERIFICATION.md

### Blockers/Concerns

- Broken API filters force client-side filtering -- inherited from SonicJS v2.8.0

## Session Continuity

Last session: 2026-03-16T20:40:27Z
Stopped at: Phase 12 complete, ready for Phase 13
Resume file: None
