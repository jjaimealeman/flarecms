---
phase: 02-content-workflow
plan: 07
subsystem: auth
tags: [api-tokens, sha256, hono, d1, cloudflare-workers, htmx, read-only]

# Dependency graph
requires:
  - phase: 01-security-hardening
    provides: JWT auth, PBKDF2 password hashing, security middleware foundation
  - phase: 02-content-workflow
    provides: Collection schema and api_tokens table structure

provides:
  - Read-only API tokens with SHA-256 hashed storage (never plaintext)
  - Collection-scoped token access (token X only reads collection Y)
  - Token value shown once at creation, only prefix stored/displayed after
  - X-API-Key middleware enforcement in both api.ts and requireAuth()
  - Admin UI at /admin/api-tokens for token lifecycle management

affects: [03-publishing-workflow, 04-webhooks, my-astro-site]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - API token as st_<48hex> format with SHA-256 hash stored, plaintext never persisted
    - Collection scoping via JSON array in allowed_collections column
    - Dual auth paths: X-API-Key checked first in requireAuth(), falls through to JWT
    - API token auth at Hono middleware layer before route handlers (api.ts)

key-files:
  created:
    - sonicjs-fork/packages/core/src/services/api-tokens.ts
    - sonicjs-fork/packages/core/src/routes/admin-api-tokens.ts
  modified:
    - sonicjs-fork/packages/core/src/middleware/auth.ts
    - sonicjs-fork/packages/core/src/routes/api.ts
    - sonicjs-fork/packages/core/src/routes/index.ts
    - sonicjs-fork/packages/core/src/app.ts
    - sonicjs-fork/packages/core/src/index.ts
    - sonicjs-fork/packages/core/src/services/index.ts

key-decisions:
  - "API token auth handled at api.ts middleware layer (not just requireAuth) so unauthenticated GET routes are protected when X-API-Key is present"
  - "allowed_collections stored as JSON array string in D1 (SQLite has no native array type)"
  - "Token format: st_<48 hex chars> (st_ prefix identifies SonicJS tokens; 24 random bytes = 192 bits entropy)"
  - "Dual X-API-Key support: api.ts middleware for public routes + requireAuth() for authenticated routes"
  - "last_used_at updated via fire-and-forget (don't block response)"

patterns-established:
  - "Pattern: Token storage — hash only, prefix for display, full value shown once at creation"
  - "Pattern: API token read-only enforcement — method check at middleware level before any route handler"
  - "Pattern: Collection scope enforcement — Hono route middleware on /collections/:collection/*"
  - "Pattern: Admin UI inline HTML with Tailwind dark theme matching existing admin pages"

# Metrics
duration: 32min
completed: 2026-03-02
---

# Phase 2 Plan 7: Read-Only API Tokens Summary

**SHA-256 hashed API tokens with collection scoping and admin UI — Astro frontend can now query CMS without user credentials**

## Performance

- **Duration:** 32 min
- **Started:** 2026-03-02T06:25:20Z
- **Completed:** 2026-03-02T06:57:40Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Created `api-tokens.ts` service with `createApiToken()`, `hashToken()`, `validateApiToken()`, `revokeApiToken()`, `listApiTokens()`
- Added X-API-Key middleware to `api.ts`: validates hash, enforces read-only, enforces collection scoping on `GET /api/collections/:collection/*`
- Added X-API-Key support to `requireAuth()` in `auth.ts`: API tokens work on any authenticated route
- Created `admin-api-tokens.ts` with full admin UI: list tokens, create (with collection checkboxes), token shown once, revoke
- Migrated `api_tokens` D1 table with new columns: `token_hash`, `token_prefix`, `allowed_collections`, `is_read_only`
- Registered `/admin/api-tokens` route in `createSonicJSApp()` and all export files

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate api_tokens schema and create token service** - `0dd74177` (feat)
2. **Task 2: Add API token auth middleware and collection scoping** - `0bee24b7` (feat)
   - Additional X-API-Key in requireAuth() and export completions - `f75925ef` (included in prior session's 02-06 commit)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `sonicjs-fork/packages/core/src/services/api-tokens.ts` - Complete token service: hash, create, validate, revoke, list
- `sonicjs-fork/packages/core/src/routes/admin-api-tokens.ts` - Admin UI: list, create form, create POST (shows token once), revoke
- `sonicjs-fork/packages/core/src/middleware/auth.ts` - X-API-Key check added first in requireAuth()
- `sonicjs-fork/packages/core/src/routes/api.ts` - API key middleware + collection scope enforcement
- `sonicjs-fork/packages/core/src/routes/index.ts` - Export adminApiTokensRoutes
- `sonicjs-fork/packages/core/src/app.ts` - apiToken in Variables type, adminApiTokensRoutes route mounted
- `sonicjs-fork/packages/core/src/index.ts` - Export hashToken, createApiToken, validateApiToken, adminApiTokensRoutes
- `sonicjs-fork/packages/core/src/services/index.ts` - Export all api-tokens functions and types

## Decisions Made

- **Token format:** `st_<48 hex chars>` — "st_" prefix identifies SonicJS tokens, 24 random bytes gives 192-bit entropy via `crypto.getRandomValues()`
- **Dual auth middleware:** X-API-Key handled in both `api.ts` (for unauthenticated GET routes) and `requireAuth()` (for any route using the middleware). This ensures full coverage regardless of which auth path is used
- **Collection scoping:** Hono route middleware on `/collections/:collection/*` pattern — no changes needed in individual route handlers
- **Read-only enforcement:** Method check (`POST/PUT/DELETE/PATCH` → 403) at middleware level, before any route handler executes
- **fire-and-forget `last_used_at`:** Not awaited so token validation doesn't add latency to API responses

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as specified, plus duplicate auth path added for completeness.

---

**Total deviations:** 0 auto-fixed
**Impact on plan:** Clean execution. All must-haves met.

## Issues Encountered

- Prior GSD sessions had already committed parts of this implementation (commits `0bee24b7`, `f75925ef`). The executor verified all must-haves were satisfied in HEAD and documented those commits appropriately
- `pnpm build` required `PATH=/home/jaime/www/_github/sonicjs/sonicjs-fork/node_modules/.bin` to find `tsup` binary
- Stash conflict during verification caused Task 2 changes to need re-application — resolved by verifying HEAD state

## User Setup Required

None — no external service configuration required. Tokens are created via admin UI at `/admin/api-tokens`.

**Usage pattern for Astro frontend:**
```
X-API-Key: st_your_token_value_here
```

## Next Phase Readiness

- Read-only API tokens ready for use in `my-astro-site` frontend via `X-API-Key` header
- Token management UI available at `/admin/api-tokens`
- Collection scoping enables per-collection token issuance (security principle of least privilege)
- Phase 3 (publishing workflow) can use the same auth infrastructure

---
*Phase: 02-content-workflow*
*Completed: 2026-03-02*
