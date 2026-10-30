---
phase: 12-demo-authentication
verified: 2026-03-16T20:43:20Z
status: passed
score: 7/7 must-haves verified
---

# Phase 12: Demo Authentication Verification Report

**Phase Goal:** A visitor can go from entering their email to sitting in the admin dashboard in under 60 seconds, with no password to remember
**Verified:** 2026-03-16T20:43:20Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                              | Status     | Evidence                                                                                          |
| --- | -------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| 1   | Visitor submits email to POST /demo/auth/request and receives a 6-digit OTP via Resend             | VERIFIED   | index.ts L112-212: full handler with OTPService, Resend fetch, `getDemoOtpEmailHtml()` wired      |
| 2   | Visitor submits OTP to POST /demo/auth/verify and gets auth_token + csrf_token cookies (30-min)    | VERIFIED   | index.ts L220-312: sign() with exp:nowSeconds+1800, setCookie auth_token+csrf_token maxAge:1800   |
| 3   | Demo user is viewer role; sandbox boundaries enforced by KV key, not role                          | VERIFIED   | demo-service.ts L71: INSERT role='viewer'; index.ts L254: createDemoUser; KV key set L110         |
| 4   | Disposable email domains rejected with 422                                                         | VERIFIED   | index.ts L40-64: DISPOSABLE_DOMAINS Set (~23 domains); L141-143: domain check returns 422         |
| 5   | Rate limit of 3 OTP requests per email per hour enforced                                           | VERIFIED   | index.ts L148-151: otpService.checkRateLimit(email, DEMO_OTP_SETTINGS) returns 429               |
| 6   | Already-logged-in admin users blocked with 409                                                     | VERIFIED   | index.ts L127-137: AuthManager.verifyToken on auth_token cookie, role==='admin' returns 409       |
| 7   | OTP expires after 5 minutes, invalidates after 3 wrong attempts                                    | VERIFIED   | index.ts L28-34: DEMO_OTP_SETTINGS {codeExpiryMinutes:5, maxAttempts:3}; L241: incrementAttempts  |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact                                                                          | Expected                                        | Status     | Details                                                                  |
| --------------------------------------------------------------------------------- | ----------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| `packages/core/src/plugins/core-plugins/demo-sandbox/index.ts`                   | Demo auth Hono routes at /demo/auth, demoAuthAPI | VERIFIED   | 334 lines, exports demoSandboxPlugin, demoAuthAPI defined at L103        |
| `packages/core/src/plugins/core-plugins/demo-sandbox/email-templates.ts`         | getDemoOtpEmailHtml() branded email template    | VERIFIED   | 107 lines, exports getDemoOtpEmailHtml() returning {html, text}          |
| `packages/core/src/app.ts`                                                        | demoSandboxPlugin.routes registration + CSRF exemption | VERIFIED | L265: exemptPaths:['/demo/auth']; L343-347: route registration loop |

### Key Link Verification

| From                         | To                                    | Via                             | Status     | Details                                                        |
| ---------------------------- | ------------------------------------- | ------------------------------- | ---------- | -------------------------------------------------------------- |
| demo-sandbox/index.ts        | otp-login-plugin/otp-service.ts       | import OTPService               | WIRED      | L18: `import { OTPService } from '../otp-login-plugin/otp-service'`; new OTPService(db) at L145, L235 |
| demo-sandbox/index.ts        | demo-sandbox/demo-service.ts          | import createDemoUser           | WIRED      | L20: `import { createDemoUser } from './demo-service'`; called at L254  |
| demo-sandbox/index.ts        | hono/jwt sign()                       | direct JWT with 30-min exp      | WIRED      | L14: `import { sign } from 'hono/jwt'`; called at L270 with exp:nowSeconds+1800 |
| demo-sandbox/index.ts        | middleware/csrf.ts generateCsrfToken  | import generateCsrfToken        | WIRED      | L22: `import { AuthManager, generateCsrfToken } from '../../../middleware'`; called at L292 |
| app.ts                       | demo-sandbox/index.ts                 | route registration              | WIRED      | L343-347: `demoSandboxPlugin.routes` loop, before otpLoginPlugin at L351 |
| app.ts                       | middleware/csrf.ts                    | CSRF exemption for /demo/auth   | WIRED      | L265: `csrfProtection({ exemptPaths: ['/demo/auth'] })`        |

### Requirements Coverage

All 7 must-haves from the PLAN.md `must_haves.truths` are satisfied. No REQUIREMENTS.md mapping exists for this phase (milestone-level planning).

### Anti-Patterns Found

None. Full scan of index.ts (334 lines) and email-templates.ts (107 lines) found zero TODO/FIXME/placeholder/stub patterns. Both files have substantive implementations with real logic, no empty returns, no console.log-only handlers.

### Human Verification Required

1. **End-to-end OTP delivery via Resend**
   **Test:** POST /demo/auth/request with a real email address while wrangler dev is running and email plugin is configured with a Resend API key.
   **Expected:** Email arrives within seconds with the branded dark-mode template and a 6-digit code.
   **Why human:** Email delivery cannot be verified programmatically — depends on Resend service, email plugin DB settings, and actual email receipt.

2. **Full login flow: email to admin dashboard**
   **Test:** Submit real email, receive OTP, POST /demo/auth/verify, follow redirect to /admin.
   **Expected:** Admin dashboard loads as a demo/viewer user with access to demo-sandbox-collection (editor) and read-only view of other collections. Session expires after 30 minutes.
   **Why human:** Cookie jar behavior, browser redirect, and actual admin UI rendering require a browser session.

3. **30-minute session expiry and redirect (deferred to Phase 13)**
   **Test:** After JWT expiry, attempt to navigate within admin.
   **Expected:** User is redirected back to the demo page.
   **Why human + deferred:** Client-side expiry redirect is a Phase 13 (Demo Page) concern. Phase 12's responsibility is confirmed: JWT has exp:nowSeconds+1800 (L268-269 in index.ts). The redirect behavior itself is out of scope for this phase.

### Gaps Summary

No gaps. All 7 must-haves verified at all three levels (exists, substantive, wired). The implementation exactly matches the plan specification with no deviations noted in SUMMARY.md confirmed against actual code.

---

_Verified: 2026-03-16T20:43:20Z_
_Verifier: Claude (gsd-verifier)_
