# Phase 12: Demo Authentication - Research

**Researched:** 2026-03-16
**Domain:** Passwordless OTP login flow, JWT session lifecycle, Cloudflare KV expiry enforcement
**Confidence:** HIGH — all findings verified directly from codebase

## Summary

Phase 12 wires the OTP login plugin into the demo-sandbox plugin to create a complete passwordless signup flow. The existing OTP plugin (`/auth/otp/request` and `/auth/otp/verify`) already handles code generation, email delivery via Resend, and rate limiting. What it does NOT do is: (1) allow new user registration, (2) issue a short-TTL JWT for demo sessions, or (3) initialize the KV `demo-mutations:{userId}` key that Phase 11 sandbox middleware depends on.

The plan for this phase is a single new Hono route mounted on the demo-sandbox plugin: `POST /demo/auth/request` and `POST /demo/auth/verify`. These endpoints reuse the OTPService class directly (not the full OTP plugin route) and wire into `createDemoUser()` from the demo-service after a valid code. The session TTL is enforced by issuing a JWT with `exp` set to `now + 1800` (30 minutes), not 24 hours. No new tables are required.

**Primary recommendation:** Add two demo-specific auth endpoints to `demo-sandbox/index.ts` that use OTPService and createDemoUser internals. Do not fork the OTP plugin or modify it — call its service classes directly.

## Standard Stack

### Core (all already installed in the project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Hono | ^4 | Route handler | Already the app framework |
| zod | ^3 | Request validation | Already used across all plugins |
| OTPService | internal | Code gen, storage, verification | Already in otp-login-plugin/otp-service.ts |
| AuthManager | internal | JWT generation with configurable exp | Already in middleware/auth.ts |
| createDemoUser | internal | User creation + KV init | Already in demo-sandbox/demo-service.ts |
| Resend API | direct fetch | Email delivery | Same pattern as otp-login-plugin/index.ts L167 |

### No New Dependencies Required

Everything needed exists. The plan is wiring, not building.

## Architecture Patterns

### Recommended File Structure

```
packages/core/src/plugins/core-plugins/demo-sandbox/
├── index.ts           # Plugin factory — add Hono routes here (Phase 12)
├── demo-service.ts    # createDemoUser() — already complete
├── middleware.ts      # demoMutationGuard, demoUploadGuard — already complete
└── email-templates.ts # NEW: demo OTP email template (branded Flare CMS)
```

```
packages/core/src/db/migrations/
└── 039_demo_auth.sql  # New migration (next number after 038_demo_sandbox.sql)
```

### Pattern 1: Route Registration in Plugin index.ts

The demo-sandbox plugin currently has no routes. Routes are added via `builder.addRoute()` before `builder.build()`. OTP Login plugin shows the exact pattern:

```typescript
// Source: packages/core/src/plugins/core-plugins/otp-login-plugin/index.ts L343-348
builder.addRoute('/auth/otp', otpAPI, {
  description: 'OTP authentication endpoints',
  requiresAuth: false,
  priority: 100
})
```

For the demo plugin, the mount point should be `/demo/auth` and routes must be registered before the generic `/admin/plugins` route in app.ts (same caveat as OTP Login — see app.ts L339-345).

Routes must also be registered in app.ts like OTP Login:
```typescript
// Same pattern as app.ts L341-345
if (demoSandboxPlugin.routes && demoSandboxPlugin.routes.length > 0) {
  for (const route of demoSandboxPlugin.routes) {
    app.route(route.path, route.handler as any)
  }
}
```

### Pattern 2: 30-Minute JWT via AuthManager

`AuthManager.generateToken()` hardcodes `exp` to 24 hours. For demo sessions, pass the result of `generateToken` is NOT usable directly — the `exp` must be overridden.

Two options:
1. **Add an optional `ttlSeconds` param to `AuthManager.generateToken()`** — preferred, clean
2. **Create a `generateDemoToken()` helper in demo-service.ts** that builds the payload manually and calls `sign()` from `hono/jwt` directly

The `sign()` function from `hono/jwt` is what `AuthManager.generateToken()` already calls. Mirroring the pattern:

```typescript
// Source: packages/core/src/middleware/auth.ts L19-28
import { sign } from 'hono/jwt'
const payload = {
  userId, email, role,
  exp: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
  iat: Math.floor(Date.now() / 1000)
}
const token = await sign(payload, secret || JWT_SECRET_FALLBACK, 'HS256')
```

The cookie must also use `maxAge: 1800` (not the 24h default in `AuthManager.setAuthCookie()`).

### Pattern 3: KV Demo Session Expiry Tracking

The 30-minute hard expiry enforced server-side comes from the JWT `exp`. When the JWT expires, `requireAuth()` middleware rejects it and redirects to `/auth/login`. This is already in place (auth.ts L36, L248).

For client-side warning (5-minute countdown), the `exp` claim is embedded in the JWT. The frontend (Phase 13) can decode the JWT payload from a JavaScript-accessible cookie or via a `/api/system/me` endpoint that returns expiry info.

**Critical insight:** The JWT cookie is `httpOnly: true`, so JavaScript cannot read it. The expiry timestamp must be separately surfaced to the frontend. Options:
- Write `exp` into a non-httpOnly cookie alongside the auth cookie (e.g. `demo_session_exp`)
- Have the verify endpoint return `expiresAt` in the JSON response body (Phase 13 stores in sessionStorage)

The JSON response approach is lower surface area. Phase 13 stores `expiresAt` after a successful verify and drives the countdown timer.

### Pattern 4: CSRF Exemption for Demo Routes

CSRF middleware exempts paths in the `DEFAULT_EXEMPT_PATHS` list or through `extraExemptPaths`. The demo auth endpoints (`/demo/auth/request`, `/demo/auth/verify`) have no `auth_token` cookie on arrival (they ARE the login flow), so CSRF middleware already skips them automatically:

```typescript
// Source: packages/core/src/middleware/csrf.ts L204-208
// Bearer-only or API-key-only requests (no auth_token cookie) — exempt
const authCookie = getCookie(c, 'auth_token')
if (!authCookie) {
  await next()
  return
}
```

No explicit exemption needed for the OTP request/verify endpoints. This is how the existing `/auth/otp/request` and `/auth/otp/verify` work today.

### Pattern 5: KV Mutation Counter Initialization

After OTP verification and `createDemoUser()`, the KV `demo-mutations:{userId}` key is set to `'0'` with a 24-hour TTL by `createDemoUser()`. This is already handled by the demo service for new users. For returning users (email already in DB), `createDemoUser()` already resets the counter.

The demo session JWT TTL is 30 minutes, but the KV counter TTL stays 24 hours intentionally — this tracks the sandbox mutation budget across potential re-logins within a day.

### Anti-Patterns to Avoid

- **Don't modify the OTP login plugin** — it's a general-purpose plugin. The demo flow is a consumer, not a modification.
- **Don't set `allowNewUserRegistration: true` on the core OTP plugin** — that would let anyone register via OTP globally. Demo user creation is handled by the separate `createDemoUser()` function.
- **Don't use `AuthManager.generateToken()` for demo sessions without overriding exp** — it will issue a 24h token, defeating the 30-minute requirement.
- **Don't skip the CSRF cookie alongside auth_token** — `auth/login` route (auth.ts L198-199) calls `setCsrfCookie()` after setting the auth cookie. Demo verify must do the same so subsequent admin requests pass CSRF checks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OTP code generation | Custom random logic | `OTPService.generateCode()` | Already uses `crypto.getRandomValues()`, modular bias-free |
| OTP storage/verification | Custom D1 queries | `OTPService.createOTPCode()` / `OTPService.verifyCode()` | Handles attempts, expiry, used flag |
| Rate limiting | Custom KV counter | `OTPService.checkRateLimit()` | Already queries `otp_codes` table with 1-hour window |
| User creation | Direct INSERT | `createDemoUser()` | Handles new/returning, permissions, KV init, signup record |
| Email delivery | New Resend integration | Same fetch-to-Resend pattern as otp-login-plugin/index.ts L167 | Just change template; infrastructure is proven |
| Session revocation | Custom mechanism | KV `revoked:{userId}` put with TTL | Auth middleware checks this on every request — same path as force-logout |
| Disposable email filtering | Custom domain list | Inline blocklist in the request handler | See pitfalls below — keep it small and embedded |

## Common Pitfalls

### Pitfall 1: CSRF Cookie Not Set After Demo Login

**What goes wrong:** User successfully completes OTP flow, gets `auth_token` cookie, then every POST to admin (edit content, save, etc.) returns 403 CSRF error.

**Why it happens:** The demo verify endpoint sets `auth_token` but doesn't also call `setCsrfCookie()`. All auth cookie-authenticated POST requests go through CSRF validation (csrf.ts L204-208 — only skips if NO auth cookie). The admin UI sends `X-CSRF-Token` header using the `csrf_token` cookie value.

**How to avoid:** After setting the auth cookie in the demo verify handler, also call `setCsrfCookie(c)` — same as `auth.ts` L198-199. The `setCsrfCookie` function is defined at the top of `auth.ts` but is not exported. Either export it or re-implement the three-line pattern inline in the demo verify handler.

**Warning signs:** OTP verification returns 200, redirect to /admin works, but any content edit immediately fails with 403.

### Pitfall 2: OTP `allowNewUserRegistration` Flag Bypassed

**What goes wrong:** Demo users try to use the standard `/auth/otp/request` endpoint. Since `allowNewUserRegistration: false` by default, the OTP plugin silently succeeds (returns the vague "if an account exists..." message) but never actually sends a code.

**Why it happens:** The OTP plugin was designed for existing-user auth, not signup. The demo flow requires creating a new user.

**How to avoid:** The demo auth endpoints bypass the OTP plugin routes entirely. They call `OTPService` directly (which just creates and stores codes) and handle user creation separately via `createDemoUser()` after successful verification.

### Pitfall 3: JWT TTL vs Cookie maxAge Mismatch

**What goes wrong:** JWT expires at 30 minutes but cookie lives for 24 hours. After JWT expiry, the browser still sends the cookie, the server rejects it, and the user sees a confusing error rather than being redirected to /demo.

**Why it happens:** `maxAge` on the cookie is set separately from the JWT `exp`. If only one is changed, they diverge.

**How to avoid:** Set both to match: JWT `exp = now + 1800` AND cookie `maxAge: 1800`.

**Warning signs:** After 30 minutes, the user sees `/auth/login?error=Your session has expired` instead of a redirect to the demo page. (The redirect target for expired demo sessions should be `/demo`, not `/auth/login` — this is a UX difference the planner must address.)

### Pitfall 4: Repeat Visitor Session Collision

**What goes wrong:** A visitor with an active demo session re-enters their email. The system creates a new session, invalidating their existing one. Or it tries to find a KV key that may have expired.

**Why it happens:** `createDemoUser()` returns a fresh token for existing users and resets the KV counter. If they already have an active session, both tokens are simultaneously valid (JWTs are stateless).

**How to avoid (recommendation):** On OTP verify, if user exists and has an active JWT session, revoke the old session via `kv.put('revoked:{userId}', ..., { expirationTtl: 1800 })` before issuing a new token. This ensures clean session replacement. Alternatively, accept that two tokens can coexist for the 30-minute TTL window — it's low risk for a demo.

**Recommended approach:** Replace the session (revoke old, issue new). This aligns with the "fresh session" mental model for demo users.

### Pitfall 5: Disposable Email Domain List

**What goes wrong:** Bots use mailinator.com or guerrillamail.com addresses to consume Resend email quota.

**How to avoid:** Embed a small static blocklist in the handler. Do NOT fetch an external API at request time. A list of 20-30 well-known disposable domains (mailinator.com, guerrillamail.com, tempmail.com, throwaway.email, yopmail.com, sharklasers.com, etc.) covers the vast majority. Check `email.split('@')[1]` against the list before processing.

**Warning signs:** Resend quota spikes, no real users in demo_signups.

### Pitfall 6: Route Registration Order

**What goes wrong:** Demo auth routes return 404 or conflict with the generic `/admin/plugins/:id` handler.

**Why it happens:** In app.ts, OTP Login routes MUST be registered before `adminPluginRoutes` (see app.ts L339-347 comment). The same constraint applies to demo-sandbox routes.

**How to avoid:** Register `demoSandboxPlugin.routes` in app.ts immediately before `otpLoginPlugin.routes` (or alongside it), and definitely before `app.route('/admin/plugins', adminPluginRoutes)`.

### Pitfall 7: Migration Numbering

**What goes wrong:** New migration SQL file uses a number already taken, causing bundler to error.

**How to avoid:** The latest migration is `038_demo_sandbox.sql`. The next migration must be `039_demo_auth.sql` (or higher if any are added in parallel). Check `ls packages/core/src/db/migrations/` before naming.

## Code Examples

### Demo OTP Request Handler Skeleton

```typescript
// Source pattern: packages/core/src/plugins/core-plugins/otp-login-plugin/index.ts
demoAuthAPI.post('/request', async (c: any) => {
  const body = await c.req.json()
  const { email } = requestSchema.parse(body)
  const normalizedEmail = email.toLowerCase()

  // 1. Block disposable domains
  const domain = normalizedEmail.split('@')[1]
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return c.json({ error: 'Please use a real email address.' }, 422)
  }

  // 2. Rate limit: 3 OTP requests per email per hour (override plugin default of 5)
  const otpService = new OTPService(c.env.DB)
  const canRequest = await otpService.checkRateLimit(normalizedEmail, DEMO_OTP_SETTINGS)
  if (!canRequest) {
    return c.json({ error: 'Too many requests. Please wait an hour before trying again.' }, 429)
  }

  // 3. Create OTP code (creates new user if needed — done at verify time)
  const ipAddress = c.req.header('cf-connecting-ip') || 'unknown'
  const otpCode = await otpService.createOTPCode(normalizedEmail, DEMO_OTP_SETTINGS, ipAddress)

  // 4. Send branded email via Resend
  // ... (same fetch pattern as otp-login-plugin/index.ts L167)

  return c.json({ message: 'Check your email for a login code.', expiresIn: 300 })
})
```

### Demo OTP Verify Handler Skeleton

```typescript
// Source pattern: packages/core/src/plugins/core-plugins/otp-login-plugin/index.ts
demoAuthAPI.post('/verify', async (c: any) => {
  const { email, code } = verifySchema.parse(await c.req.json())
  const normalizedEmail = email.toLowerCase()
  const otpService = new OTPService(c.env.DB)

  const verification = await otpService.verifyCode(normalizedEmail, code, DEMO_OTP_SETTINGS)
  if (!verification.valid) {
    await otpService.incrementAttempts(normalizedEmail, code)
    return c.json({ error: verification.error, attemptsRemaining: verification.attemptsRemaining }, 401)
  }

  // Create or retrieve demo user
  const { token: _unused, isNew } = await createDemoUser(
    c.env.DB, c.env.CACHE_KV, normalizedEmail,
    c.req.header('cf-connecting-ip') || 'unknown',
    c.req.header('user-agent') || null,
    c.env.JWT_SECRET
  )

  // Issue 30-minute JWT instead of the 24h default
  const user = await c.env.DB.prepare('SELECT id, email, role FROM users WHERE email = ?')
    .bind(normalizedEmail).first()
  const nowSeconds = Math.floor(Date.now() / 1000)
  const expiresAt = nowSeconds + 1800 // 30 minutes
  const demoToken = await sign(
    { userId: user.id, email: user.email, role: user.role, exp: expiresAt, iat: nowSeconds },
    c.env.JWT_SECRET || JWT_SECRET_FALLBACK,
    'HS256'
  )

  // Set auth cookie (30-min maxAge)
  setCookie(c, 'auth_token', demoToken, {
    httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 1800
  })

  // Set CSRF cookie (required for admin POST requests to work)
  await setCsrfCookie(c) // or inline the 3-line pattern

  // Revoke any previous demo session for this user
  await c.env.CACHE_KV.put(`revoked:${user.id}`, JSON.stringify({ revokedAt: Date.now() }), { expirationTtl: 1800 })
  // Then immediately un-revoke by deleting (the new token is valid)
  // Actually: don't revoke — just let old token expire naturally. KV doesn't support delete-then-set atomically.
  // The 30-min TTL is short enough that coexistence is acceptable.

  return c.json({
    success: true,
    isNew,
    expiresAt: expiresAt * 1000, // milliseconds for JS Date
    redirect: '/admin/dashboard'
  })
})
```

### DEMO_OTP_SETTINGS Constant

```typescript
// Phase 12 overrides relative to OTP plugin defaults
const DEMO_OTP_SETTINGS = {
  codeLength: 6,
  codeExpiryMinutes: 5,   // shorter than plugin default of 10
  maxAttempts: 3,
  rateLimitPerHour: 3,    // tighter than plugin default of 5
  allowNewUserRegistration: true // ignored by OTPService — handled by createDemoUser()
}
```

### Disposable Domain Blocklist

```typescript
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.de',
  'guerrillamail.net', 'guerrillamail.org', 'spam4.me', 'trashmail.com',
  'trashmail.me', 'trashmail.net', 'dispostable.com', 'maildrop.cc',
  'mailnull.com', 'spamgourmet.com', '10minutemail.com', 'temp-mail.org',
])
```

### Migration 039

```sql
-- Migration 039: Demo Authentication
-- Ensures otp-login plugin has allowNewUserRegistration setting for demo flow
-- Note: No new tables needed — otp_codes and demo_signups already exist

-- Ensure OTP Login plugin has correct settings for demo support
-- The demo auth endpoints use OTPService directly with their own settings,
-- so this migration is informational only.
-- No schema changes required.
SELECT 1; -- placeholder to satisfy migration runner
```

**Actual migration content:** If the otp-login plugin needs to be `active` (not `inactive`) for the demo flow, update its status here. Currently it's seeded as `inactive` in migration 026. Check whether the demo endpoints rely on plugin status or just the service classes directly. Since demo routes call `OTPService` directly (bypassing the plugin route check), plugin status doesn't matter.

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| `AuthManager.generateToken()` default 24h | Issue custom JWT payload with 30-min exp | Use `sign()` from `hono/jwt` directly |
| Password auth | OTPService for code generation | Already shipped in otp-login-plugin |
| Demo user via direct POST to /demo/signup | OTP-gated POST to /demo/auth/verify | Phase 12 replaces what was noted as a "Phase 12" TODO in demo-sandbox/index.ts |

## Open Questions

1. **setCsrfCookie availability**
   - What we know: `setCsrfCookie()` is defined in `auth.ts` as a module-private async function (not exported)
   - What's unclear: Should it be exported from auth.ts, or should demo-sandbox duplicate the 3-line pattern?
   - Recommendation: Export `setCsrfCookie` from `auth.ts` and import it in demo-sandbox. Cleaner than duplication.

2. **Redirect target after session expiry**
   - What we know: When JWT expires, auth middleware redirects to `/auth/login?error=...` for HTML requests
   - What's unclear: The demo experience should redirect to `/demo` (Phase 13 page), not the standard login page
   - Recommendation: This is a Phase 13 concern (the countdown modal handles it client-side). The server-side auth.ts redirect to `/auth/login` is the fallback for direct URL access. Planner may need a Phase 13 note.

3. **Already-logged-in admin visiting /demo**
   - What we know: Decision says "block demo entry if already logged in as admin"
   - What's unclear: This check (`if role === 'admin'`) happens in the request handler or in Phase 13 frontend
   - Recommendation: Check in the `/demo/auth/request` handler — if a valid `auth_token` cookie exists and decodes to `role: 'admin'`, return a 409 with message "You're already logged in as an admin. Log out first."

4. **Migration 039 necessity**
   - What we know: `otp_codes` table (migration 026) and `demo_signups` table (migration 038) already exist
   - What's unclear: Is any schema change needed for Phase 12?
   - Recommendation: No schema change is needed. Migration 039 may be a no-op or can register the demo-auth flow in the plugins table if desired. Planner can decide whether a migration is needed at all.

## Sources

### Primary (HIGH confidence)

- Direct code read: `packages/core/src/plugins/core-plugins/otp-login-plugin/index.ts` — OTP route patterns, email delivery via Resend
- Direct code read: `packages/core/src/plugins/core-plugins/otp-login-plugin/otp-service.ts` — OTPService API (generateCode, createOTPCode, verifyCode, checkRateLimit, incrementAttempts)
- Direct code read: `packages/core/src/plugins/core-plugins/demo-sandbox/demo-service.ts` — createDemoUser() signature and behavior
- Direct code read: `packages/core/src/plugins/core-plugins/demo-sandbox/middleware.ts` — KV key pattern `demo-mutations:{userId}`
- Direct code read: `packages/core/src/middleware/auth.ts` — AuthManager.generateToken(), requireAuth(), KV revocation pattern
- Direct code read: `packages/core/src/middleware/csrf.ts` — CSRF exemption logic (no-cookie path)
- Direct code read: `packages/core/src/app.ts` — route registration order, plugin route pattern
- Direct code read: `packages/core/src/db/migrations/038_demo_sandbox.sql` — latest migration number confirmed

## Metadata

**Confidence breakdown:**
- OTP service reuse: HIGH — code read, fully understood
- JWT 30-min session pattern: HIGH — auth.ts L19-28 is the exact pattern to mirror
- CSRF exemption for unauthenticated requests: HIGH — csrf.ts L204-208 is definitive
- Disposable email blocklist: MEDIUM — static list approach is standard, specific domains from common knowledge
- Route registration order: HIGH — app.ts comments are explicit about this constraint
- Migration necessity: HIGH — confirmed no new schema needed for Phase 12

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable internal codebase, no external dependencies changing)
