# Phase 1: Security Hardening - Research

**Researched:** 2026-03-01
**Domain:** Cloudflare Workers security — JWT, PBKDF2, rate limiting, CORS, CSRF, security headers
**Confidence:** HIGH

---

## Summary

Phase 0 cherry-picked 7 security PRs (#659–#663, #668, #671) into the fork at
`sonicjs-fork/` on the `feature/security-prs` branch. **The security code is
complete and correct in the fork source.** The critical gap is that `my-astro-cms`
still imports from the npm-published `@sonicjs-cms/core@2.8.0`, which contains
none of the security patches — it still uses a hardcoded `JWT_SECRET`, plain
SHA-256 hashing, and wildcard CORS.

**Phase 1's primary job is not to write new security code — it is to wire
`my-astro-cms` to consume the security-patched fork source, then add the startup
assertion for JWT_SECRET, configure environment variables, and verify all six
security controls are active and correctly configured.**

**Primary recommendation:** Point `my-astro-cms` at the local fork via a
`file:` dependency, build the fork, configure `.dev.vars` and `wrangler.toml`,
then verify each SEC requirement end-to-end.

---

## What Already Exists in the Fork (Do Not Re-implement)

All security code is fully implemented in
`sonicjs-fork/packages/core/src/`. Reading these files directly:

### SEC-02: PBKDF2 Password Hashing — COMPLETE

File: `packages/core/src/middleware/auth.ts`

- `AuthManager.hashPassword()` — PBKDF2-SHA256, 100,000 iterations, 16-byte
  random salt per user, stored as `pbkdf2:<iterations>:<salt_hex>:<hash_hex>`
- `AuthManager.hashPasswordLegacy()` — old SHA-256 with static salt for
  verification only
- `AuthManager.verifyPassword()` — detects format automatically. If hash starts
  with `pbkdf2:`, uses PBKDF2 path. Otherwise falls back to legacy SHA-256 path.
  Uses constant-time comparison in both paths.
- `AuthManager.isLegacyHash()` — returns `!storedHash.startsWith('pbkdf2:')`

File: `packages/core/src/routes/auth.ts` (login handler, line ~262)

```typescript
// Transparent password hash migration: re-hash legacy SHA-256 to PBKDF2
if (AuthManager.isLegacyHash(user.password_hash)) {
  try {
    const newHash = await AuthManager.hashPassword(password)
    await db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .bind(newHash, Date.now(), user.id)
      .run()
  } catch (rehashError) {
    console.error('Password rehash failed (non-fatal):', rehashError)
  }
}
```

**Missing from fork:** Console log "User X migrated to PBKDF2" per CONTEXT.md
decision. The rehash block silently catches errors but does not log successful
migrations. One line needs adding.

### SEC-03: Rate Limiting — COMPLETE

File: `packages/core/src/middleware/rate-limit.ts`

- KV-based sliding window rate limiter
- Reads `c.env.CACHE_KV` — if missing, skips silently (fail-open, no error)
- Per-IP keyed on `cf-connecting-ip` or `x-forwarded-for`
- Sets `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
  `X-RateLimit-Reset` headers on all responses (200 and 429)
- Returns 429 JSON when limit exceeded

File: `packages/core/src/routes/auth.ts`

```typescript
// Login: 5 attempts per 60s window
authRoutes.post('/login',
  rateLimit({ max: 5, windowMs: 60 * 1000, keyPrefix: 'login' }),
  ...

// Register: 3 attempts per 60s window
authRoutes.post('/register',
  rateLimit({ max: 3, windowMs: 60 * 1000, keyPrefix: 'register' }),
  ...
```

**Rate limit parameters decided by PR:** 5 login / 3 register per 60-second
window. These are reasonable and already in code — no changes needed.

**Missing from wrangler.toml:** `CACHE_KV` KV namespace binding is not configured
in `my-astro-cms/wrangler.toml`. Without it, rate limiting silently degrades.
A KV namespace needs to be created and wired.

### SEC-04: Security Headers — COMPLETE

File: `packages/core/src/middleware/security-headers.ts`

```typescript
c.header('X-Content-Type-Options', 'nosniff')
c.header('X-Frame-Options', 'SAMEORIGIN')
c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
// HSTS only when ENVIRONMENT !== 'development'
c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
```

Registered in `app.ts`: `app.use('*', securityHeadersMiddleware())`

**Note:** CSP header is NOT set by this middleware. The current approach relies on
`X-Frame-Options` and `X-Content-Type-Options` without a full CSP. This is
acceptable for Phase 1 — CSP would be a Phase 2+ enhancement.

### SEC-05: CORS — COMPLETE

File: `packages/core/src/routes/api.ts` (line 35–44)

```typescript
apiRoutes.use('*', cors({
  origin: (origin, c) => {
    const allowed = (c.env as any)?.CORS_ORIGINS as string | undefined
    if (!allowed) return null // No env var = reject cross-origin (secure default)
    const list = allowed.split(',').map((s: string) => s.trim())
    return list.includes(origin) ? origin : null
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}))
```

**Format:** Comma-separated origins in `CORS_ORIGINS` env var.
Example: `http://localhost:4321,http://localhost:8787`

**Behavior when `CORS_ORIGINS` missing:** `origin` callback returns `null`, which
Hono CORS interprets as rejecting cross-origin requests. No startup failure, just
silent rejection of cross-origin requests.

**localhost auto-allow:** The CONTEXT.md decision says "auto-allow localhost:*
when running wrangler dev" — but the current PR implementation does NOT auto-allow
localhost. To satisfy this decision, either:
  - Add localhost entries to `CORS_ORIGINS` in `.dev.vars`
  - Or add an `ENVIRONMENT === 'development'` check in the origin callback

The simpler approach is to configure `.dev.vars` with localhost origins. The
origin callback modification is also acceptable.

**Note:** Media files at `/files/*` still use `Access-Control-Allow-Origin: *`
in `app.ts` line ~281. This is intentional for public media access and should
remain.

### SEC-06: CSRF — COMPLETE

File: `packages/core/src/middleware/csrf.ts`

- Signed double-submit cookie pattern using HMAC-SHA256 keyed with `JWT_SECRET`
- Token format: `<nonce>.<hmac_signature>` (both base64url-encoded)
- Cookie: `csrf_token` (httpOnly: false so JS can read it)
- Header: `X-CSRF-Token` (or `_csrf` field in form-encoded body)
- Safe methods (GET/HEAD/OPTIONS): set cookie, pass through
- Exempt: auth routes, `/forms/*`, `/api/forms/*`, `/api/search*`
- Exempt: requests with no `auth_token` cookie (Bearer/API-key clients)
- Returns 403 JSON or 403 HTML depending on `Accept` header

File: `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts`

The admin layout includes JavaScript that:
1. Reads `csrf_token` cookie value from `document.cookie`
2. Auto-attaches `X-CSRF-Token` header to all HTMX requests via `htmx:configRequest`
3. Auto-attaches `X-CSRF-Token` to all native `fetch()` calls via monkey-patching
4. Injects `_csrf` hidden field into regular HTML form submissions

**This means the admin UI already handles CSRF token delivery automatically.**
No changes needed to admin templates.

### SEC-01: JWT Secret — PARTIALLY COMPLETE

File: `packages/core/src/middleware/auth.ts`

```typescript
const JWT_SECRET_FALLBACK = 'your-super-secret-jwt-key-change-in-production'

static async generateToken(..., secret?: string): Promise<string> {
  return await sign(payload, secret || JWT_SECRET_FALLBACK, 'HS256')
}
```

The PR added `secret?` parameter support and `JWT_SECRET_FALLBACK`. The token
generation and verification use `c.env.JWT_SECRET || JWT_SECRET_FALLBACK`.

**Missing: Startup assertion that blocks all requests if JWT_SECRET equals the
fallback string.** This is the primary SEC-01 requirement — not just "read from
env", but "block startup if value matches the default hardcoded string". The
validate-bindings middleware in `my-astro-cms/src/middleware/validate-bindings.ts`
already shows the pattern for blocking startup checks. SEC-01 requires extending
this to:
1. Check `c.env.JWT_SECRET` exists
2. If it equals `'your-super-secret-jwt-key-change-in-production'`, return 500
   for ALL requests with a clear error message

This check belongs in `validate-bindings.ts` in `my-astro-cms/src/` (the app
layer), not in the core package, since it's an environment configuration check.

---

## Standard Stack

### Core (Already in Fork)

| Component | Implementation | Location |
|-----------|---------------|---------|
| PBKDF2 hashing | Web Crypto `SubtleCrypto.deriveBits()` | `middleware/auth.ts` |
| JWT | `hono/jwt` `sign()`/`verify()` | `middleware/auth.ts` |
| Rate limiting | KV-backed sliding window | `middleware/rate-limit.ts` |
| CSRF | Signed double-submit cookie (HMAC-SHA256) | `middleware/csrf.ts` |
| Security headers | Custom middleware | `middleware/security-headers.ts` |
| CORS | `hono/cors` with origin callback | `routes/api.ts` |

### Dependencies (Already in Fork's package.json)

```
hono ^4.11.7   — CSRF requires >= 4.5.8 (CVE-2024-43787). Fork is compatible.
zod            — Input validation on auth routes
```

No new npm dependencies are needed. All security features use:
- Web Crypto API (built into Cloudflare Workers runtime)
- Hono built-ins (`hono/jwt`, `hono/cors`, `hono/cookie`)

---

## Architecture: Wiring the Fork to my-astro-cms

**The most critical architectural task** is switching `my-astro-cms` from the
npm-published package to the local fork. Two approaches:

### Option A: file: Dependency (Recommended)

```json
// my-astro-cms/package.json
{
  "dependencies": {
    "@sonicjs-cms/core": "file:../sonicjs-fork/packages/core"
  }
}
```

This mirrors how the fork's own `my-sonicjs-app` does it. Requires:
1. Build the fork first: `cd sonicjs-fork && npm run build:core`
2. Update `my-astro-cms/package.json` to `file:../sonicjs-fork/packages/core`
3. Run `pnpm install` in `my-astro-cms/` to refresh the link

**Advantage:** Changes in fork source reflect immediately after rebuild. The
fork's dist folder is already present (`sonicjs-fork/packages/core/dist/`).

### Option B: npm link

Not recommended — pnpm has known issues with `npm link` and symlinks.

**Use Option A.**

---

## Environment Configuration Required

### `.dev.vars` (local development — create this file)

```
JWT_SECRET=a-long-random-string-at-least-32-characters-long
CORS_ORIGINS=http://localhost:4321,http://localhost:8787
ENVIRONMENT=development
```

**Note:** `.dev.vars` is already in `.gitignore` by wrangler convention.

### `wrangler.toml` additions needed

```toml
# Add KV namespace for rate limiting
[[kv_namespaces]]
binding = "CACHE_KV"
id = "YOUR_KV_NAMESPACE_ID"

# Add to [vars] section
[vars]
ENVIRONMENT = "development"
CORS_ORIGINS = "http://localhost:4321,http://localhost:8787"
```

**Create KV namespace:**
```bash
npx wrangler kv namespace create CACHE_KV
# Use the returned ID in wrangler.toml
```

**JWT_SECRET for production (never in wrangler.toml):**
```bash
npx wrangler secret put JWT_SECRET
# Enter a 32+ character random string
```

### Staging environment additions (wrangler.toml)

```toml
[env.staging.vars]
ENVIRONMENT = "staging"
CORS_ORIGINS = "https://staging.yourdomain.com"

[[env.staging.kv_namespaces]]
binding = "CACHE_KV"
id = "YOUR_STAGING_KV_ID"
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| PBKDF2 hashing | Custom crypto code | Already in `AuthManager.hashPassword()` |
| Constant-time comparison | `===` on strings | Already in `AuthManager.verifyPassword()` using bitwise XOR |
| CSRF token generation | UUID or random hex | Already in `generateCsrfToken()` using HMAC-SHA256 |
| CORS origin validation | Custom middleware | Already in `hono/cors` with origin callback |
| Rate limiting storage | In-memory Map | Already in KV-backed `rateLimit()` middleware |
| Security headers | Per-route headers | Already in `securityHeadersMiddleware()` |
| JWT signing/verification | Custom crypto | Already using `hono/jwt` |

**Key insight:** Zero new security primitives are needed. All code is in the fork.
The work is wiring, configuration, and one startup assertion.

---

## Common Pitfalls

### Pitfall 1: Forgetting to Build the Fork Before Installing

**What goes wrong:** `my-astro-cms` points to `file:../sonicjs-fork/packages/core`
but the fork's `dist/` is stale or TypeScript types don't match. Import errors
or runtime failures.

**How to avoid:** Always run `npm run build:core` in `sonicjs-fork/` before
`pnpm install` in `my-astro-cms/`. Add this to the dev workflow docs.

**Warning signs:** TypeScript errors about missing exports, or runtime behavior
matching the old npm package (e.g., hardcoded JWT secret still works).

### Pitfall 2: CACHE_KV Not Configured → Rate Limiting Silently Disabled

**What goes wrong:** Rate limiting middleware's first line is:
```typescript
const kv = (c.env as any)?.CACHE_KV
if (!kv) { return await next() }  // silently skips
```
If `CACHE_KV` binding is not in `wrangler.toml`, rate limiting does nothing —
no error, no warning. SEC-03 passes code review but doesn't actually work.

**How to avoid:** Create the KV namespace and add it to `wrangler.toml` before
testing. The validate-bindings middleware should warn (not block) when CACHE_KV
is absent.

**Warning signs:** No `X-RateLimit-*` headers in responses. Rapid login attempts
never return 429.

### Pitfall 3: JWT_SECRET Assertion Must Block in Middleware, Not at Import Time

**What goes wrong:** Checking `JWT_SECRET` at module load time (top of file) fails
in Cloudflare Workers because `env` bindings are not available at module
initialization — they're only available per-request in the handler context.

**How to avoid:** The startup assertion must be middleware that reads `c.env.JWT_SECRET`
per-request, not a module-level check. The existing `validateBindingsMiddleware()`
in `my-astro-cms/src/middleware/validate-bindings.ts` correctly uses the
middleware pattern — extend this file.

**Warning signs:** `c.env` is `undefined` at module load, assertion never triggers
even when secret is wrong.

### Pitfall 4: CORS Headers Missing from CSRF-Protected Responses

**What goes wrong:** CORS middleware is on `/api/*` routes. CSRF middleware is on
`app.use('*')`. If the frontend makes a PUT/POST to an `/api/` endpoint that also
gets CSRF-checked, a CORS preflight (OPTIONS) must be handled before CSRF
validation fires.

**How to avoid:** CSRF middleware already exempts safe methods (`GET/HEAD/OPTIONS`),
so OPTIONS preflights pass through. Verify CORS `allowHeaders` includes
`X-CSRF-Token` if frontend ever sends CSRF tokens to `/api/` endpoints.

**Current state:** `allowHeaders` in api.ts only includes `Content-Type`,
`Authorization`, `X-API-Key`. If CSRF token needs to flow to API routes, add
`X-CSRF-Token` to `allowHeaders`. For Phase 1, CSRF only targets admin routes
(cookie-authenticated), so API Bearer-token callers are exempt and this is likely
not an issue.

### Pitfall 5: pnpm Workspace Conflict with file: Dependency

**What goes wrong:** If `my-astro-cms` and `sonicjs-fork` are both under a pnpm
workspace root, pnpm may hoist or deduplicate the package in unexpected ways.

**How to avoid:** `my-astro-cms` uses its own `pnpm-lock.yaml` and is not in
the `sonicjs-fork` workspace. The `file:` path in `package.json` points outside
the project. This is a straightforward local dependency — just run `pnpm install`
after updating `package.json`.

### Pitfall 6: SHA-256 Admin Password Breaks on First Deploy

**What goes wrong:** The existing admin user created via `scripts/seed-admin.ts`
has a SHA-256 password hash (format: plain 64-char hex, no `pbkdf2:` prefix).
Once the security-patched fork is active, `verifyPassword()` still handles SHA-256
via the legacy path — so login WORKS. The re-hash happens transparently on login.
No user action needed, no passwords broken.

**Verify this works:** After switching to fork package, log in with existing admin
credentials and confirm the `password_hash` column updates to `pbkdf2:...` format.

---

## Code Examples

### Startup Assertion for JWT_SECRET (to add to validate-bindings.ts)

```typescript
// Source: Pattern from existing validate-bindings.ts + PR #660 FORK-CHANGES.md
const JWT_SECRET_HARDCODED_DEFAULT = 'your-super-secret-jwt-key-change-in-production'

export function validateBindingsMiddleware(): MiddlewareFn {
  return async (c: Context<{ Bindings: Bindings }>, next: () => Promise<void>) => {
    const missing: string[] = []

    if (!c.env.DB) missing.push('DB (D1 database)')
    if (!c.env.MEDIA_BUCKET) missing.push('MEDIA_BUCKET (R2 bucket)')

    if (missing.length > 0) {
      console.error('[Startup] Missing required bindings:', missing.join(', '))
      return c.json({ error: 'Service unavailable: infrastructure misconfiguration' }, 500)
    }

    // JWT_SECRET assertion — block all requests if using hardcoded default
    const jwtSecret = c.env.JWT_SECRET
    if (!jwtSecret || jwtSecret === JWT_SECRET_HARDCODED_DEFAULT) {
      console.error('[Startup] FATAL: JWT_SECRET is not set or is using the hardcoded default. Set wrangler secret put JWT_SECRET.')
      return c.json({
        error: 'Service unavailable: JWT_SECRET must be configured as a wrangler secret'
      }, 500)
    }

    // CACHE_KV warning — non-blocking
    if (!c.env.CACHE_KV) {
      console.warn('[Startup] CACHE_KV binding not configured — rate limiting disabled')
    }

    await next()
  }
}
```

### PBKDF2 Migration Log (one-line addition to auth.ts login handler)

```typescript
// Add after line ~269 in packages/core/src/routes/auth.ts
if (AuthManager.isLegacyHash(user.password_hash)) {
  try {
    const newHash = await AuthManager.hashPassword(password)
    await db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .bind(newHash, Date.now(), user.id)
      .run()
    console.log(`[Auth] User ${user.id} migrated from SHA-256 to PBKDF2`)  // ADD THIS
  } catch (rehashError) {
    console.error('Password rehash failed (non-fatal):', rehashError)
  }
}
```

### .dev.vars (create this file, do not commit)

```
JWT_SECRET=replace-with-32-plus-random-characters-generated-by-openssl
CORS_ORIGINS=http://localhost:4321,http://localhost:8787
ENVIRONMENT=development
```

Generate a secret: `openssl rand -base64 32`

### package.json update for file: dependency

```json
{
  "dependencies": {
    "@sonicjs-cms/core": "file:../sonicjs-fork/packages/core"
  }
}
```

Then rebuild and reinstall:
```bash
cd /home/jaime/www/_github/sonicjs/sonicjs-fork
npm run build:core

cd /home/jaime/www/_github/sonicjs/my-astro-cms
pnpm install
```

---

## State of the Art

| Old State (npm v2.8.0) | Current State (fork) | Impact |
|------------------------|---------------------|--------|
| Hardcoded JWT_SECRET | `c.env.JWT_SECRET \|\| fallback` | Token forgery possible if secret leaked |
| SHA-256 no salt | PBKDF2 100k iterations + per-user salt | Rainbow table attacks blocked |
| No rate limiting | KV-backed 5/60s login, 3/60s register | Brute force blocked |
| Wildcard CORS `*` | `CORS_ORIGINS` allowlist | CSRF via CORS prevented |
| No CSRF | Signed double-submit cookie | CSRF attacks blocked |
| Minimal headers | X-Frame-Options, X-Content-Type-Options, HSTS | Browser security controls active |

---

## Open Questions

1. **CORS_ORIGINS localhost auto-allow decision**
   - What we know: CONTEXT.md says "auto-allow localhost:* when running wrangler dev"
   - What's unclear: PR #661's origin callback does NOT auto-allow localhost — it only
     reads `CORS_ORIGINS` env var. To satisfy the decision, either add localhost to
     `.dev.vars` CORS_ORIGINS, or patch the callback to check `ENVIRONMENT=development`
   - Recommendation: Add to `.dev.vars` — simpler, no code change needed in fork

2. **CACHE_KV for local dev**
   - What we know: KV requires a created namespace with an ID. For local dev with
     `wrangler dev`, wrangler can simulate KV with `--local` but wrangler.toml still
     needs a `kv_namespaces` entry even for local simulation.
   - What's unclear: Whether `wrangler kv namespace create` is needed before local dev
     works, or if a placeholder ID suffices for `wrangler dev --local`
   - Recommendation: Create a real KV namespace for the rate limiting to function. A
     placeholder ID will cause KV operations to fail silently (fail-open, so CMS works
     but rate limiting doesn't).

3. **Fork build output matches my-astro-cms needs**
   - What we know: Fork already has a `dist/` directory. The `tsup.config.ts` outputs
     ESM and CJS with TypeScript declarations.
   - What's unclear: Whether the fork's `dist/` is built from the `feature/security-prs`
     branch or from `main`. Need to confirm by checking a security-specific export in
     `dist/middleware.js`.
   - Recommendation: Always run `npm run build:core` in the fork before installing, as
     part of the Phase 1 execution plan.

---

## Sources

### Primary (HIGH confidence)

- Direct file reads: `sonicjs-fork/packages/core/src/middleware/auth.ts` — PBKDF2
  implementation, JWT handling, isLegacyHash detection
- Direct file reads: `sonicjs-fork/packages/core/src/middleware/csrf.ts` — CSRF
  double-submit cookie implementation
- Direct file reads: `sonicjs-fork/packages/core/src/middleware/rate-limit.ts` — KV
  rate limiter, fail-open behavior
- Direct file reads: `sonicjs-fork/packages/core/src/middleware/security-headers.ts` — headers
- Direct file reads: `sonicjs-fork/packages/core/src/routes/auth.ts` — login handler
  with re-hash logic and rate limit wiring
- Direct file reads: `sonicjs-fork/packages/core/src/routes/api.ts` — CORS middleware
- Direct file reads: `sonicjs-fork/packages/core/src/app.ts` — Bindings interface,
  middleware registration order
- Direct file reads: `sonicjs-fork/FORK-CHANGES.md` — complete record of what each PR
  changed and conflict resolutions
- Direct file reads: `my-astro-cms/node_modules/@sonicjs-cms/core/dist/chunk-3E76TKR5.js` — confirmed
  installed npm package uses hardcoded JWT_SECRET (no security PRs present)
- Direct file reads: `my-astro-cms/src/middleware/validate-bindings.ts` — existing
  startup assertion pattern to extend

### Secondary (MEDIUM confidence)

- `sonicjs-fork/my-sonicjs-app/package.json` — confirmed `file:../packages/core`
  pattern is already used in the fork's own app
- `sonicjs-fork/packages/core/tsup.config.ts` — confirmed build outputs ESM + CJS

---

## Metadata

**Confidence breakdown:**
- What's already implemented in fork: HIGH — read source directly
- What's missing (JWT assertion, migration log): HIGH — confirmed by reading code
- Package wiring approach (file: dependency): HIGH — confirmed by fork's own app
- Rate limiting KV local dev behavior: MEDIUM — wrangler KV simulation not tested
- CORS localhost auto-allow approach: HIGH — both options (`.dev.vars` or code patch)
  are straightforward

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable — all source code is local, no external APIs)
