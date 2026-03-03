---
phase: 01-security-hardening
plan: 01
subsystem: infra
tags: [security, jwt, cors, rate-limiting, pbkdf2, cloudflare-workers, kv, wrangler, sonicjs-fork]

# Dependency graph
requires:
  - phase: 00-foundation
    provides: "sonicjs-fork on feature/security-prs with all 7 security PRs cherry-picked; staging D1 database provisioned"
provides:
  - "my-astro-cms wired to fork source (file: dependency, not npm v2.8.0)"
  - "JWT_SECRET startup assertion blocking insecure defaults"
  - "CACHE_KV KV namespace enabling rate limiting middleware"
  - ".dev.vars with local dev secrets (JWT_SECRET, CORS_ORIGINS, ENVIRONMENT)"
  - "Production and staging JWT_SECRET set via wrangler secret"
  - "PBKDF2 migration logging in both JSON and HTML login handlers"
affects:
  - 01-02 (security verification and testing)
  - all future phases (JWT_SECRET assertion now guards startup)

# Tech tracking
tech-stack:
  added:
    - "Cloudflare KV (CACHE_KV) — rate limiting cache namespace"
    - "@types/semver — fixed fork DTS build (missing type declaration)"
  patterns:
    - "file: dependency for local fork linking (pnpm compatible)"
    - "Middleware-level startup assertion for critical env vars"
    - "wrangler secret put for production secrets (not committed to config)"
    - "Per-environment vars in wrangler.toml (staging/production inherit nothing)"

key-files:
  created:
    - "my-astro-cms/.dev.vars — local dev secrets (JWT_SECRET, CORS_ORIGINS, ENVIRONMENT)"
  modified:
    - "my-astro-cms/package.json — @sonicjs-cms/core now file:../sonicjs-fork/packages/core"
    - "my-astro-cms/wrangler.toml — CACHE_KV binding, CORS_ORIGINS in all envs"
    - "my-astro-cms/src/middleware/validate-bindings.ts — JWT_SECRET assertion"
    - "sonicjs-fork/packages/core/src/routes/auth.ts — PBKDF2 migration logging"
    - "sonicjs-fork/packages/core/package.json — @types/semver devDependency"

key-decisions:
  - "Use (c.env as any).JWT_SECRET for runtime env var access — Bindings type from fork doesn't include JWT_SECRET field yet"
  - "Call c.json() without await (return void) to avoid MiddlewareFn return type mismatch"
  - "Stage only source files in fork commits, not dist (dist is tracked but managed separately)"
  - "Add @types/semver to fix DTS build so pre-commit type-check hook passes"
  - "CORS_ORIGINS must be set explicitly in each wrangler.toml environment (vars not inherited)"

patterns-established:
  - "Startup assertion pattern: check env var before first await next(), return 500 with actionable error message"
  - "Wrangler secret put for production secrets — never in code or .toml"
  - "Local dev secrets in .dev.vars (gitignored by convention)"

# Metrics
duration: 14min
completed: 2026-03-02
---

# Phase 1 Plan 01: Security Hardening - Fork Wiring Summary

**Security-patched sonicjs fork wired as file: dependency, JWT_SECRET startup assertion active, CACHE_KV rate limiting KV provisioned, production secrets set via wrangler secret**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-02T04:58:25Z
- **Completed:** 2026-03-02T05:12:44Z
- **Tasks:** 2/2
- **Files modified:** 7 (across 2 repos)

## Accomplishments

- my-astro-cms now consumes sonicjs-fork source (all 7 security PRs active) instead of npm v2.8.0
- JWT_SECRET startup assertion blocks all requests when secret is missing or equals the hardcoded default value
- CACHE_KV namespace provisioned in Cloudflare (prod: 7dacbabdf6aa4896b0c9b0bc7b9125fe, staging: deeb721cb0e5460ca410222fef5af184) — enables rate limiting
- Production and staging JWT_SECRET values set via `wrangler secret put` (encrypted, not in config)
- PBKDF2 migration logging added to both JSON and HTML login handlers

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire fork dependency and configure environment**
   - `my-astro-cms` commit `501e1d1` — package.json fork switch, wrangler.toml CACHE_KV + CORS_ORIGINS
   - `sonicjs-fork` commit `d45b29e9` — PBKDF2 migration logging + @types/semver fix + rebuilt dist

2. **Task 2: Add JWT_SECRET startup assertion**
   - `my-astro-cms` commit `b84913b` — validate-bindings.ts JWT_SECRET check

## Files Created/Modified

- `my-astro-cms/package.json` — `@sonicjs-cms/core` changed from `^2.8.0` to `file:../sonicjs-fork/packages/core`
- `my-astro-cms/wrangler.toml` — Added `[[kv_namespaces]] CACHE_KV` (prod + staging), `CORS_ORIGINS` in all env vars
- `my-astro-cms/.dev.vars` — Created with `JWT_SECRET` (random 32-byte base64), `CORS_ORIGINS`, `ENVIRONMENT=development`
- `my-astro-cms/pnpm-lock.yaml` — Created (replaced package-lock.json, switched to pnpm)
- `my-astro-cms/src/middleware/validate-bindings.ts` — JWT_SECRET assertion added, CACHE_KV warning updated to mention rate limiting
- `sonicjs-fork/packages/core/src/routes/auth.ts` — Migration log added to both re-hash blocks
- `sonicjs-fork/packages/core/package.json` — `@types/semver` added to devDependencies

## Decisions Made

- **file: dependency pattern:** pnpm resolves `file:../sonicjs-fork/packages/core` and symlinks into node_modules. After a fork rebuild, must run `pnpm install` again to refresh the pnpm store copy.
- **JWT_SECRET type access:** Used `(c.env as any).JWT_SECRET` because the `Bindings` interface from the fork doesn't declare `JWT_SECRET` (it's a Cloudflare secret, not a binding). This is intentional.
- **c.json() without await:** The MiddlewareFn return type is `Promise<void>`, so `c.json()` is called without await to avoid TypeScript type mismatch. This works correctly in Hono.
- **CORS_ORIGINS per-environment:** Wrangler warned that `vars` are not inherited by child environments. Added `CORS_ORIGINS` explicitly to staging and production `vars` sections. Production value is a placeholder (`https://your-production-domain.com`) to be updated before deployment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing @types/semver causing DTS build failure**
- **Found during:** Task 1 (fork rebuild step)
- **Issue:** The fork's `tsup` build completed JS output but failed DTS generation because `semver` package lacked type declarations. This caused the pre-commit `type-check` hook to fail with "Could not find a declaration file for module 'semver'".
- **Fix:** Installed `@types/semver` via `npm install --save-dev @types/semver --ignore-scripts`, added to `packages/core/package.json` devDependencies, rebuilt fork with `tsup` to generate complete DTS output.
- **Files modified:** `sonicjs-fork/packages/core/package.json`, rebuilt dist
- **Verification:** `npm run type-check` passes in fork repo, DTS files present in dist
- **Committed in:** `d45b29e9` (fork Task 1 commit)

**2. [Rule 2 - Missing Critical] CORS_ORIGINS missing from staging/production environments**
- **Found during:** Task 1 (wrangler secret put for staging)
- **Issue:** Wrangler warned that `vars` in `[vars]` section are NOT inherited by child environments. The `CORS_ORIGINS` added to top-level `[vars]` would not apply to staging or production — meaning CORS would be unconfigured in deployed environments, breaking the frontend.
- **Fix:** Added `CORS_ORIGINS` explicitly to `[env.staging]` vars and `[env.production]` vars in wrangler.toml.
- **Files modified:** `my-astro-cms/wrangler.toml`
- **Verification:** No wrangler warnings on subsequent secret operations
- **Committed in:** `501e1d1` (my-astro-cms Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both essential — one unblocked the pre-commit hook, one prevented CORS misconfiguration in deployed environments.

## Issues Encountered

- **pnpm store caching:** After rebuilding the fork, `pnpm install` must be run again in `my-astro-cms` to refresh the pnpm store's copy of the package. The symlink points to a store copy, not directly to the fork source. This was discovered when DTS files were missing from the linked package after the first build.
- **Pre-existing type errors:** `src/collections/blog-posts.collection.ts` has a pre-existing TS error (`'quill'` is not assignable to `FieldType`). This existed before this plan — the fork's FieldType enum doesn't include 'quill' in its type definition, though the runtime supports it. Not addressed in this plan scope.

## Next Phase Readiness

- All security middleware (CORS, CSRF, rate limiting, security headers, PBKDF2, XSS sanitization) is now active in the fork linked by my-astro-cms
- JWT_SECRET assertion guards startup — any environment without a properly configured secret will return 500
- CACHE_KV KV namespaces provisioned and ready for rate limiting
- Production secrets are encrypted in Cloudflare — not in any config file
- **Blocker for production deployment:** `CORS_ORIGINS` in `[env.production]` is set to placeholder `https://your-production-domain.com` — must be updated with actual domain before deploying
- Pre-existing `quill` FieldType error should be fixed in a future plan (does not affect runtime)

---
*Phase: 01-security-hardening*
*Completed: 2026-03-02*
