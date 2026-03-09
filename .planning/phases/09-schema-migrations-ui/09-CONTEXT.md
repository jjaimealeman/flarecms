# Phase 9: Schema Migrations UI - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Non-technical users can add, modify, and remove collection fields from the admin dashboard without touching code or running CLI commands. The system generates and applies D1 migrations at runtime, with migration history and rollback support. This does NOT include creating new collection types from the UI — only modifying fields on existing collections.

</domain>

<decisions>
## Implementation Decisions

### Field Editor Workflow
- Claude's discretion on placement (collection settings tab vs standalone page) — match existing admin UI patterns
- Claude's discretion on add/edit interaction (modal vs inline expansion) — pick what fits the admin UI best
- Claude's discretion on field reordering (drag-to-reorder vs insertion order) — balance complexity vs value
- All field types currently supported by Flare CMS should be available (string, number, boolean, select, rich text, markdown, image, date, relation) — match what the schema system already supports

### Migration Execution
- Claude's discretion on auto-apply vs review-then-apply — consider the non-technical target audience
- Claude's discretion on destructive change handling (warning+confirm vs soft delete vs block) — pick appropriate safety level
- Claude's discretion on batching (multiple changes per migration vs one-at-a-time) — balance UX simplicity vs rollback granularity
- Claude's discretion on whether creating new collections is in scope — the phase goal says "add/modify collection fields" which implies fields-only, but evaluate if collection CRUD is a natural extension or scope creep

### Migration History
- Human-readable summaries, not raw SQL — plain-English descriptions like "Added 'tags' to Blog Posts" with timestamp and success/failure status
- SQL can be available on expand/click for power users, but default view is non-technical
- Claude's discretion on where history lives (per-collection tab, global page, or both)
- Claude's discretion on whether rollback is accessible from history entries
- Claude's discretion on pagination/depth of history shown

### Rollback & Safety
- Claude's discretion on auto-rollback vs manual recovery on failure — leverage D1's transaction capabilities
- Claude's discretion on rollback depth (last migration only vs any migration) — balance power vs complexity
- Claude's discretion on guardrails (warn-but-allow vs block dangerous ops from UI)
- Claude's discretion on environment scope — Flare CMS is a single Cloudflare Worker, so consider whether dev/prod distinction even applies

### Claude's Discretion
Nearly all implementation details are at Claude's discretion for this phase. The user's only firm decision:
- Migration history must show **human-readable summaries** by default (not SQL)

Everything else — UI placement, interaction patterns, safety levels, batching, rollback depth, environment handling — Claude should choose the best approach based on:
1. Existing Flare CMS admin UI patterns
2. Non-technical user target audience
3. D1/Cloudflare Workers constraints
4. Implementation complexity vs user value

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The user trusts Claude to make good implementation choices based on the existing admin UI patterns and the non-technical target audience.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-schema-migrations-ui*
*Context gathered: 2026-03-09*
