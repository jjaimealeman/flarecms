# Fork Changes

Tracks how this fork diverges from upstream `lane711/sonicjs`.

## Fork Metadata

| Field | Value |
|-------|-------|
| Upstream URL | `https://github.com/lane711/sonicjs.git` |
| Fork URL | `https://github.com/jaimealan/sonicjs` |
| Fork Point SHA | `2250de9bfe2b0783069c10447e0b12b75c7c3367` |
| Fork Point Commit | `Merge pull request #624 from SonicJs-Org/lane711/discord-webhook-audit` |
| Fork Date | 2026-03-01 |
| Hono Version | `^4.11.7` (devDependencies), peer `^4.0.0` — compatible with PR #668 (requires >= 4.5.8) |

## Commit Convention

All fork-specific commits use the `fork-patch` scope:

```
fix(fork-patch): description of change
feat(fork-patch): description of change
```

This makes it easy to identify fork-specific work: `git log --oneline --grep="fork-patch"`

---

## Syncing with Upstream

To pull in new upstream changes:

```bash
git fetch upstream main
git log upstream/main ^HEAD --oneline  # Preview what's new
git merge upstream/main                 # Merge upstream (resolve conflicts as needed)
```

To refresh a PR branch:

```bash
git fetch upstream refs/pull/NNN/head:pr/NNN
```

To check divergence:

```bash
git log --oneline upstream/main ^HEAD   # Upstream commits not in our fork
git log --oneline HEAD ^upstream/main   # Our commits not in upstream
```

---

## Binding Fixes

### MEDIA_BUCKET Rename

**Status:** Applied at fork point

**Change:** Renamed R2 binding from `ASSETS` to `MEDIA_BUCKET` to match wrangler.toml configuration.

**Rationale:** The upstream default binding name conflicted with our deployment configuration. Renamed to be explicit about purpose.

---

## Security Patches

These 7 PRs were authored by @mmcintosh and address security vulnerabilities in the default SonicJS v2.8.0 installation. They are cherry-picked from upstream pull requests.

> **Note:** All 7 PRs cherry-picked on 2026-03-01. Commit SHAs below are the new SHAs on `feature/security-prs` branch (cherry-pick creates new SHAs). 3 PRs required merge conflict resolution (#660, #661, #668).

---

### PR #659 — PBKDF2 Password Hashing

**Status:** Cherry-picked
**Cherry-picked:** 2026-03-01

**Commits (new SHAs on feature branch):**
```
21a4e367 [fork-patch] security: PBKDF2 password hashing — PR #659 (1/2)
88de0f4d [fork-patch] security: PBKDF2 password hashing — PR #659 (2/2)
```

**Original upstream SHAs:**
```
2fa1dad4 security: replace SHA-256 password hashing with PBKDF2
5ca59cf1 fix: reduce PBKDF2 iterations to 100000 (Cloudflare Workers limit)
```

**Description:** Replaces insecure SHA-256 password hashing with PBKDF2 (100,000 iterations), which is the maximum supported by Cloudflare Workers' SubtleCrypto implementation. SHA-256 without salting/stretching is trivially reversible via rainbow tables.

**Migration:** Existing user passwords hashed with SHA-256 will need to be reset — users cannot log in until password is changed. Plan accordingly for any live deployments before applying.

**Files changed:** `packages/core/src/auth/` (password utilities)

---

### PR #660 — JWT Secret via Environment Variable

**Status:** Cherry-picked, resolved merge conflict
**Cherry-picked:** 2026-03-01

**Commits (new SHAs on feature branch):**
```
b5029698 [fork-patch] security: JWT secret from env var — PR #660 (resolved merge conflict)
```

**Conflict resolved:** PR #659 (PBKDF2) had already modified `packages/core/src/routes/auth.ts`. PR #660 also added `c.env.JWT_SECRET` parameter to the same `generateToken()` calls in that file. Resolved by keeping both changes: PBKDF2 modifications from #659 plus the JWT_SECRET parameter addition from #660.

**Original upstream SHA:**
```
b53e5d44 security: move JWT secret to environment variable
```

**Description:** Moves the JWT signing secret from a hardcoded string to a `JWT_SECRET` environment variable. A static secret in source code means any developer with repo access can forge tokens.

**Migration:** Add `JWT_SECRET` to `wrangler.toml` secrets or `.dev.vars`:
```bash
wrangler secret put JWT_SECRET
# Or in .dev.vars for local dev:
# JWT_SECRET=your-long-random-string-min-32-chars
```

**Files changed:** `packages/core/src/auth/` (JWT generation/validation)

---

### PR #661 — CORS Restricted to Allowed Origins

**Status:** Cherry-picked, resolved merge conflict
**Cherry-picked:** 2026-03-01

**Commits (new SHAs on feature branch):**
```
00880eee [fork-patch] security: CORS enforcement — PR #661 (1/2) (resolved merge conflict)
e4d09ee3 [fork-patch] security: CORS enforcement — PR #661 (2/2)
```

**Conflict resolved:** PR #660 added `JWT_SECRET?: string` to the `Bindings` interface in `packages/core/src/app.ts`. PR #661 added `CORS_ORIGINS?: string` to the same interface. Resolved by keeping both bindings in the interface.

**Original upstream SHAs:**
```
3ae11631 security: restrict CORS to explicit allowed origins
cd6828d9 fix: update CORS E2E tests to use configured origin
```

**Description:** Restricts CORS from `*` (allows any origin) to an explicit `CORS_ORIGINS` environment variable. Open CORS allows malicious sites to make authenticated requests on behalf of logged-in users.

**BREAKING CHANGE:** Must configure `CORS_ORIGINS` before deploying, or all cross-origin requests will fail.

**Migration:** Add `CORS_ORIGINS` to `wrangler.toml` or `.dev.vars`:
```toml
# wrangler.toml
[vars]
CORS_ORIGINS = "https://yourdomain.com,https://admin.yourdomain.com"

# .dev.vars (local)
CORS_ORIGINS=http://localhost:4321,http://localhost:8787
```

**Files changed:** `packages/core/src/middleware/cors.ts` (or equivalent), E2E tests

---

### PR #662 — Rate Limiting on Auth Endpoints

**Status:** Cherry-picked
**Cherry-picked:** 2026-03-01

**Commits (new SHAs on feature branch):**
```
f027479e [fork-patch] security: rate limiting on auth — PR #662
```

**Original upstream SHA:**
```
0a6ffb2c security: add rate limiting to auth endpoints
```

**Description:** Adds rate limiting to `/auth/login` and `/auth/register` endpoints to prevent brute-force attacks and credential stuffing. Without rate limiting, an attacker can attempt unlimited password guesses.

**Note:** Requires `CACHE_KV` binding in `wrangler.toml` for rate limit counters. If KV binding is not configured, rate limiting will be skipped (graceful degradation — verify behavior).

**Migration:** Add KV binding to `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "CACHE_KV"
id = "your-kv-namespace-id"
```

**Files changed:** `packages/core/src/auth/` (rate limit middleware)

---

### PR #663 — Security Headers Middleware

**Status:** Cherry-picked
**Cherry-picked:** 2026-03-01

**Commits (new SHAs on feature branch):**
```
f31136ba [fork-patch] security: security headers middleware — PR #663
```

**Original upstream SHA:**
```
cd18de8d security: add real security headers middleware
```

**Description:** Adds proper HTTP security headers to all responses: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`, and `Permissions-Policy`. These headers are baseline browser security controls.

**Migration:** No breaking changes. Headers are additive. Review CSP if your admin UI loads external resources (fonts, CDN assets).

**Files changed:** `packages/core/src/middleware/` (security headers middleware)

---

### PR #668 — CSRF Token Protection

**Status:** Cherry-picked, resolved merge conflict
**Cherry-picked:** 2026-03-01

**Commits (new SHAs on feature branch):**
```
e15bac3a [fork-patch] security: CSRF token protection — PR #668 (resolved merge conflict)
```

**Conflict resolved:** Multiple files needed merging with changes from PRs #659-#663:
- `packages/core/src/app.ts`: Both `securityHeadersMiddleware` import (#663) and `csrfProtection` import (#668) added — kept both
- `packages/core/src/middleware/index.ts`: Both `rateLimit` export (#662) and `csrfProtection`/`generateCsrfToken`/`validateCsrfToken` exports (#668) added — kept both
- `packages/core/src/routes/auth.ts`: Import line merged to include both `rateLimit` (#662) and `generateCsrfToken` (#668); CSRF cookie-setting calls added after login

**Original upstream SHA:**
```
822f6e66 security: add CSRF token protection (signed double-submit cookie)
```

**Description:** Implements signed double-submit cookie CSRF protection using Hono's built-in CSRF middleware. Prevents cross-site request forgery attacks where malicious sites trick authenticated users into making unintended state-changing requests.

**Prerequisite:** Requires Hono >= 4.5.8 (CVE-2024-43787 bypass in older versions).
- Fork's Hono version: `^4.11.7` (devDependencies), peer `^4.0.0`
- **Status:** Compatible (4.11.7 >= 4.5.8)

**Migration:** Frontend must include CSRF token in state-changing requests. Check how the admin UI sends forms/API calls.

**Files changed:** `packages/core/src/middleware/` (CSRF middleware), `packages/core/src/index.ts` (registration)

---

### PR #671 — XSS Sanitization for Public Form Submissions

**Status:** Cherry-picked
**Cherry-picked:** 2026-03-01

**Commits (new SHAs on feature branch):**
```
60432225 [fork-patch] security: XSS input sanitization — PR #671
```

**Original upstream SHA:**
```
b9f3a8aa fix: sanitize public form submission data to prevent stored XSS
```

**Description:** Sanitizes user-submitted data on public-facing form endpoints to prevent stored XSS attacks. Without sanitization, malicious scripts stored in the database execute for every user who views the content.

**Migration:** No breaking changes for well-formed submissions. Malicious HTML/JS in existing content is not retroactively sanitized — run a one-time cleanup if migrating live data.

**Files changed:** `packages/core/src/api/` (form submission handlers)

---

## Migration Review Workflow

Before applying security patches to a live deployment, follow this checklist:

### Pre-Cherry-Pick
- [ ] Review each PR's diff on GitHub before applying
- [ ] Confirm Hono version compatibility for PR #668 (`hono >= 4.5.8`)
- [ ] Identify any existing content with plain SHA-256 passwords (PR #659 breaks login for those users)
- [ ] Plan `CORS_ORIGINS` value for your deployment (PR #661 breaking change)

### Post-Cherry-Pick
- [ ] Run `wrangler dev` and verify admin login still works
- [ ] Verify CORS allows your frontend origin
- [ ] Test rate limiting by attempting rapid login failures
- [ ] Confirm security headers present in browser DevTools Network tab
- [ ] Test CSRF by attempting a state-changing request without token (should 403)
- [ ] Verify public form submissions are sanitized

### Environment Variables Required After All Patches

| Variable | PR | Required | Example |
|----------|----|----------|---------|
| `JWT_SECRET` | #660 | Yes | 32+ random chars |
| `CORS_ORIGINS` | #661 | Yes | `http://localhost:4321` |
| `CACHE_KV` binding | #662 | Yes (for rate limiting) | KV namespace ID |

### Wrangler Config Template

After all patches applied, add to `wrangler.toml`:

```toml
[vars]
CORS_ORIGINS = "https://yourdomain.com"

[[kv_namespaces]]
binding = "CACHE_KV"
id = "your-kv-namespace-id"
```

And for secrets:

```bash
wrangler secret put JWT_SECRET
```

---

## Infrastructure

### Staging D1 Database

- **Name:** my-astro-cms-db-staging
- **Database ID:** 83d65e82-86dd-4c43-8494-60f50e4c0053
- **Region:** WNAM (Western North America)
- **Purpose:** Migration testing before production apply — run migrations here first, verify, then apply to production
- **Location:** `my-astro-cms/wrangler.toml` under `[[env.staging.d1_databases]]`
- **Created:** 2026-03-01

#### Migration Review Workflow

1. Apply migration to staging: `npx wrangler d1 migrations apply DB --env staging`
2. Test staging deployment: `npx wrangler dev --env staging`
3. Verify functionality works as expected
4. Apply to production: `npx wrangler d1 migrations apply DB --env production`

> **Note:** Never apply migrations directly to production without staging verification.
