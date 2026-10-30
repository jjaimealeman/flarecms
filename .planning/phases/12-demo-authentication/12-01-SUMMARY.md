---
phase: 12-demo-authentication
plan: 01
subsystem: auth
tags: [otp, jwt, hono, resend, csrf, demo, passwordless, email]

# Dependency graph
requires:
  - phase: 11-sandbox-foundation
    provides: demo-sandbox plugin stub, demo-service.ts, KV-based mutation guard, D1 schema (demo_signups, otp_codes tables)
  - phase: 09-otp-login-plugin
    provides: OTPService (createOTPCode, verifyCode, incrementAttempts, checkRateLimit)
provides:
  - POST /demo/auth/request endpoint (email validation, disposable domain blocking, OTP creation, Resend email send)
  - POST /demo/auth/verify endpoint (OTP verification, demo user creation, 30-min JWT, dual cookie set)
  - getDemoOtpEmailHtml() branded email template (dark-mode HTML + plain text fallback)
  - CSRF exemption for /demo/auth paths in app.ts
  - Route registration for demo-sandbox plugin before OTP Login in app.ts
affects:
  - 13-demo-page-ui (consumes these endpoints from browser, expects redirect:/admin response shape)
  - 14-demo-observability (monitors OTP request/verify rates, demo signup analytics)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OTP settings override: DEMO_OTP_SETTINGS const with tighter limits (3 req/hr, 5-min expiry, 3 attempts) — distinct from otp-login-plugin DEFAULT_SETTINGS"
    - "30-min JWT via direct sign() call: AuthManager.generateToken() hardcodes 24h — for non-standard TTLs call hono/jwt sign() directly with explicit exp"
    - "Dual cookie set on verify: auth_token (httpOnly) + csrf_token (httpOnly:false) both with maxAge:1800 to match JWT exp"
    - "Disposable domain block via static Set at module level — no DB/KV lookup needed"
    - "CSRF exemptPaths array passed to csrfProtection() — prevents stale cookie from blocking unauthenticated demo login POST"

key-files:
  created:
    - packages/core/src/plugins/core-plugins/demo-sandbox/email-templates.ts
  modified:
    - packages/core/src/plugins/core-plugins/demo-sandbox/index.ts
    - packages/core/src/app.ts

key-decisions:
  - "30-min JWT issued via direct sign() not AuthManager.generateToken() because AuthManager hardcodes 24h TTL"
  - "CSRF exempted for /demo/auth: demo users have no csrf_token yet at time of POST /verify, but stale auth_token cookie from prior session would trigger validation"
  - "Disposable domain blocking at /request, not /verify — fail early before OTP code is created"
  - "Admin 409 check uses verifyToken() on existing auth_token cookie — returns 409 only for role==='admin', not viewer/editor"
  - "Email send failure is non-blocking: OTP code is still created, error is logged — user can retry"

patterns-established:
  - "Plugin auth routes: addRoute('/demo/auth', demoAuthAPI, { requiresAuth: false, priority: 100 })"
  - "Route registration order in app.ts: Demo Sandbox BEFORE OTP Login BEFORE adminPluginRoutes"

# Metrics
duration: 7min
completed: 2026-03-16
---

# Phase 12 Plan 01: Demo Authentication Summary

**OTP-gated passwordless demo login via POST /demo/auth/request + /verify, 30-min JWT session with dual cookies, and branded Resend email template**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-16T20:36:58Z
- **Completed:** 2026-03-16T20:40:27Z
- **Tasks:** 2
- **Files modified:** 3 (+ 1 created)

## Accomplishments

- Two working API endpoints: POST /demo/auth/request (OTP delivery) and POST /demo/auth/verify (session creation)
- Branded dark-mode HTML email with large monospace OTP code display, 5-minute expiry notice, and Flare CMS styling
- 30-minute JWT session issued directly via hono/jwt sign() with matching auth_token + csrf_token cookies
- Disposable domain blocking (~23 domains), rate limiting (3/hr), and admin-session 409 guard all wired
- CSRF middleware exempts /demo/auth to prevent stale cookie blocking the unauthenticated POST flow
- All existing 1200 tests still passing (11 pre-existing failures confirmed unrelated to this change)

## Task Commits

Each task was committed atomically:

1. **Task 1: Branded email template and demo auth endpoints** - `faa058a` (feat)
2. **Task 2: Route registration and CSRF exemption** - `37b8b03` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/core/src/plugins/core-plugins/demo-sandbox/email-templates.ts` - getDemoOtpEmailHtml() returning branded HTML + plain text OTP email
- `packages/core/src/plugins/core-plugins/demo-sandbox/index.ts` - demoAuthAPI Hono sub-app with POST /request and POST /verify, registered via builder.addRoute('/demo/auth', ...)
- `packages/core/src/app.ts` - CSRF exemptPaths for /demo/auth, demo-sandbox route registration before OTP Login

## Decisions Made

- **30-min JWT via direct sign():** AuthManager.generateToken() hardcodes 24h. For the demo session the plan explicitly requires 1800s, so sign() is called directly with `exp: nowSeconds + 1800`. Same pattern used if any future short-lived token is needed.
- **CSRF exemption is safe:** /demo/auth endpoints perform their own validation (email format, disposable domain, OTP code, rate limit). They create a session but don't modify any existing user data. The exemption is path-specific, not global.
- **Email failure is non-blocking:** If Resend returns an error, the OTP code is still created in the DB and the /request endpoint returns 200. User can retry. This avoids a situation where Resend is temporarily unavailable blocking all demo logins.
- **Admin 409 only for role=admin:** Viewers and editors with an existing session are not blocked from demo auth. Only admins (who presumably own the install) get the 409.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - build passed on first attempt, no import resolution issues.

## User Setup Required

None - no external service configuration required. Email plugin settings (Resend API key) were already configured in Phase 9 (OTP login plugin). Demo auth reuses the same email plugin DB row.

## Next Phase Readiness

- POST /demo/auth/request and POST /demo/auth/verify are fully implemented and registered
- Phase 13 (demo page UI) can build the OTP form that POSTs to these endpoints
- Response shape on verify: `{ success: true, isNew: boolean, expiresAt: number, redirect: '/admin' }`
- Smoke test available: `curl -X POST /demo/auth/request -d '{"email":"test@mailinator.com"}'` returns 422 (disposable domain)
- No blockers for Phase 13

---
*Phase: 12-demo-authentication*
*Completed: 2026-03-16*
