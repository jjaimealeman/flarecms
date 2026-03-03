# Phase 0: Foundation - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Repo hygiene, R2 binding fix, fork tracking infrastructure, and cherry-picking 7 mmcintosh security PRs. The repository becomes clean, trackable, and correctly wired so every subsequent phase builds on a stable base. No new features — just fixing what's broken and establishing conventions.

</domain>

<decisions>
## Implementation Decisions

### Binding validation behavior
- Hard fail on startup if D1 or R2 bindings are missing — reject ALL requests with a clear error before handling anything
- KV is optional — app starts and functions without it (cache is a performance bonus, not a requirement)
- Error messages logged to Workers console only — don't leak binding names or internal details in HTTP responses (return generic 500)
- R2 binding rename from `BUCKET` to `MEDIA_BUCKET` is a clean break — no backward compatibility shim. This is our fork, we own the naming

### Fork tracking conventions
- Commit prefix: `[fork-patch]` for fork-specific changes (matches roadmap language, easy to grep)
- FORK-CHANGES.md uses feature-level grouping (e.g., "Binding fixes", "Security patches") with individual PR entries within each group
- Track upstream via git remote (`upstream` pointing to Sonicjs-Org/sonicjs) plus pinned fork-point SHA in FORK-CHANGES.md
- Each cherry-picked PR gets its own entry: PR number, one-line description, and note if modifications were made

### Cherry-pick strategy
- Apply PRs as-is via `git cherry-pick`; only modify if merge conflicts require it
- Simple merge conflicts: Claude resolves and commits with a note. Complex conflicts: flag for user review
- PR #668 (CSRF): Check Hono version first. If < 4.5.8, upgrade Hono before applying (security fix is worth the version bump in foundation phase)
- Testing: Smoke test after each batch (wrangler dev + /api/health + admin loads). Individual PR verification deferred to Phase 1 security hardening

### Staging environment setup
- Staging D1 named `my-astro-cms-db-staging` (matches production pattern with -staging suffix)
- Migration review: always grep for `BEGIN TRANSACTION` before applying any migration. No exceptions — schema or data
- Migration workflow documented in CLAUDE.md (project instructions) so it's always in context for Claude
- Staging seeded with same collections and sample content as production for immediate testability

### Claude's Discretion
- Exact error message wording for binding validation failures
- FORK-CHANGES.md formatting and section ordering
- Order of cherry-pick application (dependency-aware sequencing)
- Staging seed data specifics (how many items per collection)

</decisions>

<specifics>
## Specific Ideas

- The 7 mmcintosh PRs are: #659, #660, #661, #662, #663, #668, #671 — all security-related
- PR #668 has the Hono version dependency (CVE-2024-43787 bypass in older versions)
- Current R2 binding in wrangler.toml is `BUCKET` but code may reference `MEDIA_BUCKET` — the rename fixes this mismatch
- Admin user ID for seed data: `admin-1770148233567-90a7ju7xz`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 00-foundation*
*Context gathered: 2026-03-01*
