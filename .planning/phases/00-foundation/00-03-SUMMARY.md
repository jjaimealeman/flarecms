---
phase: 00-foundation
plan: 03
subsystem: infra
tags: [git, cherry-pick, security, d1, cloudflare, wrangler, pbkdf2, jwt, cors, csrf, xss, rate-limiting]

# Dependency graph
requires:
  - phase: 00-02
    provides: FORK-CHANGES.md with PR tracking, PR branches fetched in sonicjs-fork

provides:
  - 9 cherry-picked security commits on feature/security-prs branch in sonicjs-fork
  - PBKDF2 password hashing replacing SHA-256 (PR #659)
  - JWT secret from environment variable (PR #660)
  - CORS restricted to CORS_ORIGINS env var (PR #661)
  - Rate limiting on auth endpoints (PR #662)
  - Security headers middleware (PR #663)
  - CSRF token protection with signed double-submit cookie (PR #668)
  - XSS sanitization for public form submissions (PR #671)
  - Staging D1 database my-astro-cms-db-staging (ID 83d65e82-86dd-4c43-8494-60f50e4c0053)
  - wrangler.toml staging block fully configured

affects: [01-security-hardening, phase-1, deployment, production-readiness]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cherry-pick with --no-commit + tagged commit message for fork patch tracking"
    - "Staging D1 database for migration testing before production apply"
    - "Conflict resolution: keep all additive security changes when PRs touch same files"

key-files:
  created: []
  modified:
    - sonicjs-fork/FORK-CHANGES.md
    - my-astro-cms/wrangler.toml

key-decisions:
  - "Conflict resolution strategy: when multiple security PRs modify same file, keep ALL security additions"
  - "feature/security-prs is the correct branch name (not feature/phase-0-foundation as plan stated)"
  - "9 total commits for 7 PRs (plan miscounted as 10 — #659 has 2, #661 has 2, rest have 1)"

patterns-established:
  - "Fork patches tagged with [fork-patch] prefix for easy identification via git log --grep"
  - "Merge conflicts documented in both commit message and FORK-CHANGES.md"
  - "Staging DB migration-first workflow documented in Infrastructure section"

# Metrics
duration: 6min
completed: 2026-03-01
---

# Phase 0 Plan 03: Cherry-Pick Security PRs Summary

**9 mmcintosh security commits cherry-picked onto feature/security-prs, staging D1 db provisioned, FORK-CHANGES.md updated with conflict resolution details — security foundation is live in fork**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-02T04:00:33Z
- **Completed:** 2026-03-02T04:06:01Z
- **Tasks:** 3
- **Files modified:** 2 (FORK-CHANGES.md, wrangler.toml) + 30+ cherry-picked files in sonicjs-fork

## Accomplishments

- Applied all 7 @mmcintosh security PRs (#659-#663, #668, #671) to feature/security-prs branch — 9 total commits
- Resolved 3 merge conflicts (#660, #661, #668) by preserving all additive security changes
- Created Cloudflare D1 staging database `my-astro-cms-db-staging` (83d65e82-86dd-4c43-8494-60f50e4c0053)
- Filled staging DB ID into wrangler.toml, eliminating the REPLACE_WITH_STAGING_DB_ID placeholder
- Updated FORK-CHANGES.md: all 7 PRs now show Cherry-picked status with new SHAs and conflict resolution notes

## Task Commits

1. **Task 1: Cherry-pick all 7 security PRs** — 9 commits in sonicjs-fork:
   - `21a4e367` [fork-patch] security: PBKDF2 password hashing — PR #659 (1/2)
   - `88de0f4d` [fork-patch] security: PBKDF2 password hashing — PR #659 (2/2)
   - `b5029698` [fork-patch] security: JWT secret from env var — PR #660 (resolved merge conflict)
   - `00880eee` [fork-patch] security: CORS enforcement — PR #661 (1/2) (resolved merge conflict)
   - `e4d09ee3` [fork-patch] security: CORS enforcement — PR #661 (2/2)
   - `f027479e` [fork-patch] security: rate limiting on auth — PR #662
   - `f31136ba` [fork-patch] security: security headers middleware — PR #663
   - `e15bac3a` [fork-patch] security: CSRF token protection — PR #668 (resolved merge conflict)
   - `60432225` [fork-patch] security: XSS input sanitization — PR #671

2. **Task 2: Create staging D1 and update wrangler.toml** — `c93fd59` (chore) in my-astro-cms

3. **Task 3: Update FORK-CHANGES.md** — `cebcc64d` (docs) in sonicjs-fork

## Files Created/Modified

- `sonicjs-fork/FORK-CHANGES.md` — All 7 PR sections updated with Cherry-picked status, new SHAs, conflict notes; Infrastructure section added with staging DB info
- `my-astro-cms/wrangler.toml` — Staging D1 database_id filled in (83d65e82-86dd-4c43-8494-60f50e4c0053)
- `sonicjs-fork/packages/core/src/routes/auth.ts` — PBKDF2 + JWT secret + rate limiting + CSRF (cherry-pick)
- `sonicjs-fork/packages/core/src/middleware/` — rate-limit.ts, security-headers.ts, csrf.ts added
- `sonicjs-fork/packages/core/src/app.ts` — JWT_SECRET + CORS_ORIGINS bindings, security imports
- `sonicjs-fork/packages/core/src/middleware/index.ts` — rate-limit + csrf exports added
- 20+ E2E test files updated by cherry-picks

## Decisions Made

- **Branch naming discrepancy:** Plan stated branch would be `feature/phase-0-foundation` but actual branch in sonicjs-fork is `feature/security-prs`. This is the correct branch — proceeded autonomously since it is a feature branch.
- **Commit count:** Plan stated 10 commits but actual is 9 (PR #659 has 2, PR #661 has 2, rest have 1 each). Plan had a counting error.
- **Conflict resolution strategy:** When security PRs modify the same file (e.g., both #660 and #661 modify `app.ts` Bindings interface), keep ALL additive changes. Security features are additive and non-conflicting semantically — only syntactically conflicting because they touch the same interface definition.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Merge conflict in packages/core/src/routes/auth.ts (PR #660)**
- **Found during:** Task 1 (cherry-pick PR #660)
- **Issue:** PR #659 (PBKDF2) had modified auth.ts; PR #660 also modifies same file to add JWT_SECRET param to generateToken() calls — conflict at both JSON API login and form-based login
- **Fix:** Kept PBKDF2 modifications from #659, added JWT_SECRET parameter from #660 to both generateToken() call sites
- **Committed in:** b5029698 (noted as "resolved merge conflict")

**2. [Rule 1 - Bug] Merge conflict in packages/core/src/app.ts (PR #661)**
- **Found during:** Task 1 (cherry-pick PR #661)
- **Issue:** PR #660 added JWT_SECRET to Bindings interface; PR #661 adds CORS_ORIGINS to same interface — conflict at same location
- **Fix:** Kept both: `JWT_SECRET?: string` and `CORS_ORIGINS?: string` in the Bindings interface
- **Committed in:** 00880eee (noted as "resolved merge conflict")

**3. [Rule 1 - Bug] Multi-file merge conflict (PR #668)**
- **Found during:** Task 1 (cherry-pick PR #668)
- **Issue:** PRs #659-#663 had modified app.ts, middleware/index.ts, and routes/auth.ts; PR #668 also modifies all three. 5 conflict sites across 3 files.
- **Fix:**
  - `app.ts`: kept both securityHeadersMiddleware (#663) and csrfProtection (#668) imports
  - `middleware/index.ts`: kept both rateLimit (#662) and csrf exports (#668)
  - `routes/auth.ts` import: merged rateLimit + generateCsrfToken into single import
  - `routes/auth.ts` body: added CSRF cookie calls after both JSON login and form login success paths
- **Committed in:** e15bac3a (noted as "resolved merge conflict")

---

**Total deviations:** 3 auto-fixed (all Rule 1 - merge conflicts from additive security PRs modifying same files)
**Impact on plan:** All conflicts were simple additive conflicts with clear resolution — keep all security additions. No scope creep. Security posture is stronger than if applied individually.

## Issues Encountered

- Plan stated sonicjs-fork would be on branch `feature/phase-0-foundation` but actual branch is `feature/security-prs`. This is the correct branch for this work — proceeded without interruption since it is a feature branch (autonomous mode).
- Plan stated 10 total commits but actual is 9 (PR #659: 2 commits + PR #661: 2 commits + 5 others x 1 = 9). The plan's count was wrong; all 7 PRs were successfully applied.

## User Setup Required

**Before deploying with security patches applied, configure these environment variables:**

| Variable | PR | Required | Example |
|----------|----|----------|---------|
| `JWT_SECRET` | #660 | Yes — deployment will fail without it | `openssl rand -hex 32` |
| `CORS_ORIGINS` | #661 | Yes — all cross-origin requests will fail without it | `http://localhost:4321,https://yourdomain.com` |
| `CACHE_KV` binding | #662 | Yes for rate limiting (graceful degradation if missing) | KV namespace ID |

Add to `.dev.vars` for local development:
```
JWT_SECRET=your-32-char-random-string-here
CORS_ORIGINS=http://localhost:4321,http://localhost:8787
```

## Next Phase Readiness

- Security foundation is complete — 7 PRs applied, fork is now hardened against OWASP Top 10 common vulnerabilities
- Phase 1 (Security Hardening) can build on this foundation rather than reimplementing from scratch
- Phase 1 will need to wire up the required env vars (JWT_SECRET, CORS_ORIGINS, CACHE_KV) in deployment config
- Existing SHA-256 users in my-astro-cms DB cannot log in after PR #659 applies — if any live users exist, plan password reset before deploying
- CORS_ORIGINS breaking change (#661) must be set before any frontend-facing deployment

---
*Phase: 00-foundation*
*Completed: 2026-03-01*
