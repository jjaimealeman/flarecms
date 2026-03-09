# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-08)

**Core value:** Prove that Flare CMS works by using it to power its own documentation
**Current focus:** Phase 9 in progress -- Schema Migrations UI

## Current Position

Phase: 9 of 9 (Schema Migrations UI)
Plan: 3 of 4 in current phase
Status: In progress
Last activity: 2026-03-09 — Completed 09-03-PLAN.md (migration history page)

Progress: [███████████████████████████████████████████████████░] 96% (27/28 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 27
- Average duration: ~8 min
- Total execution time: ~210 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 2 | ~48min | ~24min |
| 2 | 2 | ~11min | ~5.5min |
| 3 | 3 | ~54min | ~18min |
| 4 | 3 | ~10min | ~3.3min |
| 5 | 5 | ~37min | ~7.4min |
| 6 | 3 | ~16min | ~5.3min |
| 7 | 3 | ~10min | ~3.3min |
| 8 | 3/3 | ~11min | ~3.7min |
| 9 | 3/4 | ~11min | ~3.7min |

## v2 Roadmap

| Phase | Feature | Impact | Status |
|-------|---------|--------|--------|
| 7 | Astro Content Layer Loader | Astro Integration 5/5 | Complete |
| 8 | Live Preview API | Developer Experience 5/5 | Complete |
| 9 | Schema Migrations UI | Content Modeling 5/5 | In Progress (3/4) |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [07-01]: astro/zod for Zod imports (Astro re-exports Zod for Content Layer compatibility)
- [07-01]: Graceful API client returns empty data on failure instead of throwing
- [07-01]: System fields (_status, _createdAt, _updatedAt) always optional in generated schemas
- [07-02]: Client-side status filtering in loader (API filters broken)
- [07-02]: Permissive passthrough fallback schema when CMS unreachable
- [07-02]: store.clear() before each build for clean state
- [07-03]: 4 collections in content.config.ts: blogPosts, news, docs, docsSections
- [07-03]: Additive integration — flare.ts manual fetch and Content Layer coexist
- [07-03]: CMS API returns title/slug at root level, not inside item.data — loaders flatten both
- [08-01]: GET /draft/:token unauthenticated -- token is the credential for cross-origin Astro iframe
- [08-01]: Selective requireAuth per-route (not per-router) for mixed auth endpoints
- [08-02]: Standalone page (no admin layout) for full-viewport split-screen preview
- [08-02]: Dual mount at /api/preview and /admin/preview for API and page access
- [08-02]: iframe.src replacement for preview updates -- postMessage deferred to Plan 03
- [08-03]: Generic preview template for all collections (not per-collection templates)
- [08-03]: 401 for missing token, 410 for expired/not-found (clear HTTP semantics)
- [09-01]: Migration bundle ID 032 (next after 031) for schema_migrations table
- [09-01]: No FK constraints on schema_migrations -- avoids cascade issues
- [09-01]: validateFieldChange uses changeType param for selective duplicate checking
- [09-02]: Best-effort migration recording (try/catch, non-blocking on failure)
- [09-02]: Schema update moved inside field-exists check for correct variable scoping
- [09-03]: Schema Migrations sidebar in main nav (not Settings sub-page)
- [09-03]: HTML details/summary for expandable migration details (no-JS progressive enhancement)
- [09-03]: User display shows email (JWT lacks display name)

### Pending Todos

- v2 Phase 9: Plan 04 remaining (rollback/confirmation UI)

### Blockers/Concerns

- [Research]: Broken API filters force client-side filtering -- follow existing pattern, mitigate with KV caching
- [Phase 1]: Local wrangler dev uploads to local R2 -- expected, works in production
- [Phase 3]: Astro SSR dev server slow to reflect changes (~30s for Shiki singleton reinit) -- dev experience only

## Session Continuity

Last session: 2026-03-09
Stopped at: Completed 09-03-PLAN.md
Resume file: None
