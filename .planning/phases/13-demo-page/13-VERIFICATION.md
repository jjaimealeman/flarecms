---
phase: 13-demo-page
verified: 2026-03-18T15:17:04Z
status: passed
score: 5/5 must-haves verified
---

# Phase 13: Demo Page Verification Report

**Phase Goal:** Visitors on flarecms.dev see a clear path to try the CMS — one page, minimal friction, straight into the admin
**Verified:** 2026-03-18T15:17:04Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                              | Status     | Evidence                                                                                  |
|----|--------------------------------------------------------------------|------------|-------------------------------------------------------------------------------------------|
| 1  | Visiting /demo shows explanation + email input                     | VERIFIED   | demo.astro renders audience toggle, headlines, feature bullets, email form (504 lines)    |
| 2  | Page displays 30-min / 50-op / 6-hr disclaimer                    | VERIFIED   | Line 154: "Demo sessions last 30 minutes with a limit of 50 API operations. Sandbox data resets every 6 hours." |
| 3  | After OTP verify, visitor redirected to admin as demo user         | VERIFIED   | Lines 398–404: checks `result.data.token`, then `window.location.href = cmsUrl + '/demo/auth/exchange?token=' + result.data.token` |
| 4  | Exchange endpoint validates JWT and sets httpOnly cookies          | VERIFIED   | demo-sandbox/index.ts lines 337–372: GET /exchange verifies JWT, setCookie auth_token + csrf_token, redirects to /admin |
| 5  | Demo is discoverable (nav, hero, footer all link to /demo)         | VERIFIED   | homepage.ts navLinks has Demo entry; Layout.astro desktop CTA + mobile CTA; Hero.astro href="/demo"; Layout.astro footer "Try Demo" link |

**Score:** 5/5 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/site/src/pages/demo.astro` | Complete demo page with toggle, email form, OTP, redirect | VERIFIED | 504 lines, no stubs, exported as Astro page |
| `packages/core/src/plugins/core-plugins/demo-sandbox/index.ts` | CORS, exchange endpoint, token in verify response | VERIFIED | 394 lines, CORS on lines 110–115, exchange GET on line 337, token in verify response on line 316 |
| `packages/cms/wrangler.toml` | Production CORS_ORIGINS includes flarecms.dev | VERIFIED | Line 44: `CORS_ORIGINS = "https://flarecms.dev,https://flare-site.pages.dev"` |
| `packages/site/src/data/homepage.ts` | navLinks contains Demo entry | VERIFIED | Line 120: `{ label: 'Demo', href: '/demo' }` |
| `packages/site/src/layouts/Layout.astro` | /demo links in desktop nav, mobile nav, footer | VERIFIED | Line 145 (desktop CTA), line 284 (mobile CTA), line 357 (footer) |
| `packages/site/src/components/Hero.astro` | /demo link present | VERIFIED | Line 39: `href="/demo"` with Plausible event |

---

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| demo.astro | CMS `/demo/auth/request` | cross-origin POST | WIRED | Line 308: `fetch(cmsUrl + '/demo/auth/request', { method: 'POST', ... })` with response handling that shows OTP section |
| demo.astro | CMS `/demo/auth/verify` | cross-origin POST | WIRED | Line 386: `fetch(cmsUrl + '/demo/auth/verify', { method: 'POST', ... })` with token extracted from response |
| demo.astro | CMS `/demo/auth/exchange?token=` | redirect | WIRED | Line 403: `window.location.href = cmsUrl + '/demo/auth/exchange?token=' + result.data.token` |
| demo-sandbox/index.ts GET /exchange | DB JWT verify | `hono/jwt` `verify()` | WIRED | Line 347: `await verify(token, jwtSecret, 'HS256')` with redirect-to-error on failure |
| demo-sandbox/index.ts GET /exchange | admin redirect | `c.redirect('/admin')` | WIRED | Line 371: `return c.redirect('/admin', 302)` after cookies set |
| demo-sandbox/index.ts | CORS flarecms.dev | `hono/cors` middleware | WIRED | Lines 110–115: `cors({ origin: ['http://localhost:4321', 'https://flarecms.dev'], credentials: true })` |
| core app.ts | demo-sandbox routes | import + route loop | WIRED | Line 54: import; lines 343–344: routes loop wires all plugin routes into the Hono app |

---

## Requirements Coverage

| Requirement | Status | Notes |
|---|---|---|
| /demo page exists on flarecms.dev | SATISFIED | Astro page at correct path |
| Email OTP flow | SATISFIED | Full request → verify → exchange pipeline implemented |
| Session limits disclosed | SATISFIED | Disclaimer visible before email entry |
| Redirect lands authenticated | SATISFIED | Exchange endpoint sets httpOnly cookies same-origin then redirects to /admin |
| Demo discoverable in nav | SATISFIED | navLinks array drives desktop nav, mobile nav, and footer via Layout.astro |

---

## Anti-Patterns Found

None. No TODO/FIXME/placeholder patterns in any of the verified files. All handlers have real implementations. The `verify` endpoint returns a real JWT token. The `exchange` endpoint validates and sets real cookies.

---

## Human Verification Required

The following items require a live environment to confirm end-to-end:

### 1. Email Delivery

**Test:** Submit a real email address on /demo, click "Get Access"
**Expected:** OTP email arrives in inbox within ~10 seconds from Flare CMS team address
**Why human:** Resend API integration and email plugin settings cannot be verified structurally — the code path exists and is wired, but API keys and fromEmail config are stored in the production DB

### 2. Cookie Domain Behavior

**Test:** Complete the full OTP flow on production flarecms.dev, observe that after the exchange redirect the browser lands on admin.flarecms.dev with an active admin session
**Expected:** Admin dashboard loads, user is recognized as a demo user (viewer role), not prompted to log in again
**Why human:** SameSite=Strict cookie behavior across flarecms.dev → admin.flarecms.dev subdomain redirect can only be confirmed with a real browser on the real domain

### 3. 30-Minute Session Expiry

**Test:** Log in as demo user, wait 30 minutes, attempt any authenticated action
**Expected:** Session expires, user is redirected to login
**Why human:** JWT expiry enforcement depends on runtime clock; cannot verify from static code

---

## Summary

Phase 13 is fully implemented. All structural requirements are satisfied:

- `demo.astro` is a complete 504-line page with audience toggle, disclaimer, email form, OTP inputs (6-digit), success state, and full JS orchestration. No stubs or placeholders.
- The demo-sandbox plugin contains all three required endpoints: `POST /request`, `POST /verify` (returns `token` in body), and `GET /exchange` (validates JWT, sets cookies, redirects to `/admin`).
- CORS is correctly configured in the plugin middleware allowing `https://flarecms.dev` with `credentials: true`.
- Production `wrangler.toml` includes `flarecms.dev` in `CORS_ORIGINS` for the global CORS middleware.
- The plugin is imported and wired into the core Hono app via `packages/core/src/app.ts`.
- Navigation links are present in desktop nav, mobile nav, hero CTA, and footer across all Layout.astro consumers.

Three items require human verification (email delivery, cross-subdomain cookie behavior, session expiry) but none of these represent structural gaps — the code is correct.

---

_Verified: 2026-03-18T15:17:04Z_
_Verifier: Claude (gsd-verifier)_
