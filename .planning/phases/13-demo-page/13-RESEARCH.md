# Phase 13: Demo Page - Research

**Researched:** 2026-03-16
**Domain:** Astro 5 SSR page + cross-domain auth handoff (flarecms.dev → admin.flarecms.dev)
**Confidence:** HIGH

---

## Summary

Phase 13 is an Astro page at `flarecms.dev/demo` that talks to Phase 12's OTP endpoints on `admin.flarecms.dev`, then redirects the authenticated visitor into the admin. The research covers three concerns: the page build itself (Astro + Tailwind v4 + vanilla JS), the cross-domain cookie problem, and the wiring changes needed elsewhere (nav, footer, CORS config).

The page work is straightforward — the existing design system (Outfit font, flare-500 orange, surface-* tokens, dark/light theme) is well-documented in the codebase. The hard part is auth handoff: the Phase 12 `/demo/auth/verify` endpoint sets `SameSite=Strict` cookies on the CMS Worker domain. Those cookies cannot survive a cross-origin fetch from `flarecms.dev`. The solution is **token-in-URL exchange**: the site JS receives the signed JWT in the verify response body, then navigates the browser to `admin.flarecms.dev/demo/auth/exchange?token=JWT`. A new `GET /demo/auth/exchange` endpoint on the CMS Worker reads the token, validates it, sets the httpOnly cookies (now same-origin), and redirects to `/admin`.

**Primary recommendation:** Build the Astro page as a self-contained `.astro` file with inline `<script is:inline>` for all interactivity. Add a `GET /demo/auth/exchange` endpoint to the demo-sandbox plugin. Update `CORS_ORIGINS` in wrangler.toml production env to include `flarecms.dev`.

---

## Standard Stack

This phase uses no new libraries. Everything needed is already in the project.

### Core (already installed)
| Tool | Version | Purpose | Source |
|------|---------|---------|--------|
| Astro 5 | installed | SSR page at `/demo` | `packages/site/` |
| Tailwind CSS v4 | installed | Styling — use existing design tokens | `global.css` |
| Hono JWT `sign` | installed | Token signing on CMS side | core dependency |
| `hono/cookie` `setCookie` | installed | Cookie writing on exchange endpoint | already used in demo-sandbox/index.ts |

### No new packages needed
The CONTEXT.md is clear: pure Astro + vanilla JS, no React/Vue. All APIs are already in place from Phase 12.

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure

```
packages/site/src/pages/
└── demo.astro              # New page — self-contained

packages/core/src/plugins/core-plugins/demo-sandbox/
└── index.ts                # Add GET /demo/auth/exchange route here
```

Also touch:
- `packages/site/src/data/homepage.ts` — add Demo to `navLinks`
- `packages/site/src/layouts/Layout.astro` — uncomment 3 TODO demo CTAs
- `packages/cms/wrangler.toml` — fix CORS_ORIGINS production value

### Pattern 1: Token-in-URL Cross-Domain Auth Handoff

**What:** Site page calls CMS verify endpoint via fetch (cross-origin). Verify returns the JWT in the response body. Site JS then navigates to `admin.flarecms.dev/demo/auth/exchange?token=JWT`. Exchange endpoint runs on the CMS Worker (same origin as the cookies), validates the token, sets httpOnly cookies, redirects to `/admin`.

**Why this works:** Cookies set by the exchange endpoint are set by the CMS Worker while the browser is already navigating to `admin.flarecms.dev`. They are same-origin cookies. `SameSite=Strict` is fine here.

**Why the direct approach fails:** The verify endpoint sets `SameSite=Strict` cookies in a CORS response. The browser will store these cookies for `admin.flarecms.dev` after the fetch, but `SameSite=Strict` means they will NOT be sent when the browser later navigates from `flarecms.dev` to `admin.flarecms.dev` (cross-site top-level navigation). So the admin would have no auth cookies on arrival.

**Security note for token-in-URL:** The JWT already has a 30-minute expiry (from Phase 12 verify). For the exchange token specifically, consider a shorter window (60 seconds) to reduce exposure — but this requires either a separate short-lived exchange token or relying on the full 30-min JWT. The simplest approach is to reuse the demo JWT from verify (already signed, 30-min TTL) and treat the exchange as a one-time navigation. The exchange endpoint should verify the JWT signature before setting cookies.

```typescript
// Source: packages/core/src/plugins/core-plugins/demo-sandbox/index.ts (new route to add)

/**
 * GET /demo/auth/exchange?token=JWT
 *
 * Cross-domain auth handoff. Called by browser navigation (not fetch).
 * Validates the JWT, sets auth_token + csrf_token cookies same-origin,
 * then redirects to /admin.
 */
demoAuthAPI.get('/exchange', async (c: any) => {
  const token = c.req.query('token')
  if (!token) {
    return c.redirect('/admin/login?error=missing_token')
  }

  const jwtSecret = c.env.JWT_SECRET || JWT_SECRET_FALLBACK

  try {
    const { verify } = await import('hono/jwt')
    const payload = await verify(token, jwtSecret, 'HS256') as any

    if (!payload?.userId) {
      return c.redirect('/admin/login?error=invalid_token')
    }

    // Set cookies (same-origin — browser is navigating here from flarecms.dev)
    const nowSeconds = Math.floor(Date.now() / 1000)
    const remainingTtl = Math.max(0, payload.exp - nowSeconds)

    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/',
      maxAge: remainingTtl,
    })

    const csrfToken = await generateCsrfToken(jwtSecret)
    const isDev = c.env?.ENVIRONMENT === 'development' || !c.env?.ENVIRONMENT
    setCookie(c, 'csrf_token', csrfToken, {
      httpOnly: false,
      secure: !isDev,
      sameSite: 'Strict',
      path: '/',
      maxAge: remainingTtl,
    })

    return c.redirect('/admin')
  } catch {
    return c.redirect('/admin/login?error=invalid_token')
  }
})
```

**Client-side redirect (in demo.astro `<script is:inline>`):**
```javascript
// After successful verify response:
const data = await verifyRes.json()
if (data.success && data.token) {
  const exchangeUrl = 'https://admin.flarecms.dev/demo/auth/exchange?token=' + encodeURIComponent(data.token)
  window.location.href = exchangeUrl
}
```

This means the verify endpoint must return `token` in its response body. Currently it returns `{ success, isNew, expiresAt, redirect }` — needs `token` added.

### Pattern 2: Audience Toggle (Pill Switch)

**What:** A pill-shaped toggle above the content that swaps all headline/subtitle/bullets between Developer and Client audiences. Same email form beneath regardless.

**Implementation:** Two sets of content blocks, toggled by `hidden` class. Alpine.js would be cleaner but this project uses vanilla JS only. Use `data-audience="dev"` and `data-audience="client"` attributes.

```javascript
// Vanilla JS toggle pattern — matches existing site codebase style
(function() {
  var current = 'dev'
  document.querySelectorAll('[data-toggle-audience]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      current = this.dataset.toggleAudience
      document.querySelectorAll('[data-audience]').forEach(function(el) {
        el.classList.toggle('hidden', el.dataset.audience !== current)
      })
      document.querySelectorAll('[data-toggle-audience]').forEach(function(b) {
        b.classList.toggle('bg-surface-secondary', b.dataset.toggleAudience === current)
        b.classList.toggle('text-text-primary', b.dataset.toggleAudience === current)
        b.classList.toggle('text-text-tertiary', b.dataset.toggleAudience !== current)
      })
    })
  })
})()
```

### Pattern 3: 6-Digit OTP Box Input

**What:** Six individual `<input>` elements with `maxlength="1"`. Auto-advance on input, backspace moves back, paste fills all boxes.

**Implementation:**
```javascript
// Auto-advance + backspace + paste pattern
otpInputs.forEach(function(input, index) {
  input.addEventListener('input', function() {
    if (this.value.length === 1 && index < otpInputs.length - 1) {
      otpInputs[index + 1].focus()
    }
    checkAllFilled()
  })
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Backspace' && !this.value && index > 0) {
      otpInputs[index - 1].focus()
    }
  })
  input.addEventListener('paste', function(e) {
    var pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '')
    if (pasted.length >= 6) {
      e.preventDefault()
      pasted.split('').slice(0, 6).forEach(function(ch, i) {
        if (otpInputs[i]) otpInputs[i].value = ch
      })
      otpInputs[5].focus()
      checkAllFilled()
    }
  })
})
```

### Pattern 4: Two-Step Form (Email → OTP)

**What:** The page shows the email input first. After submission, it swaps to the OTP digit boxes. This is an inline DOM swap (no page reload) — matches site's existing pattern of `classList.add('hidden')`.

**State machine:** `email-step` div → hidden on submit → `otp-step` div → shown on submit. Error handling resets to the relevant step.

### Pattern 5: CORS for /demo/auth/* Routes

The CORS middleware is only on `/api/*` routes (via `apiRoutes.use('*', cors(...))`). The `/demo/auth/*` routes go through `demoAuthAPI` Hono instance which has NO CORS middleware. Cross-origin fetch from `flarecms.dev` to `admin.flarecms.dev/demo/auth/request` and `/verify` will fail without CORS headers.

**Fix:** Add a CORS middleware to `demoAuthAPI` in demo-sandbox/index.ts that allows `flarecms.dev` (and localhost for dev).

```typescript
// Add at top of demoAuthAPI route setup, before .post('/request', ...)
demoAuthAPI.use('*', cors({
  origin: (origin) => {
    const allowed = ['https://flarecms.dev', 'http://localhost:4321', 'http://localhost:8787']
    return allowed.includes(origin) ? origin : null
  },
  allowMethods: ['POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))
```

Also update `wrangler.toml` production CORS_ORIGINS from `flare-site.pages.dev` to `flarecms.dev`.

### Anti-Patterns to Avoid

- **Using `SameSite=None; Secure`** to make cookies cross-site: This works but reduces cookie security and requires the CMS to always be on HTTPS. It's a broader security downgrade than token-in-URL.
- **Shared cookie domain (`.flarecms.dev`)**: Requires both `flarecms.dev` and `admin.flarecms.dev` to set the cookie on the root domain. Cloudflare Pages and Workers are separate origins — Pages cannot set domain-scoped cookies for a Worker subdomain.
- **postMessage between windows**: Would require opening admin in a popup, which browsers block or users close. Not suitable here.
- **Storing JWT in localStorage on the site, passing via URL fragment**: The fragment approach leaks the JWT in the browser history. The query string approach (with a short-lived or single-use token) is acceptable given the 30-min TTL already in place.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| JWT signing/verifying | Custom crypto | `hono/jwt` `sign` + `verify` — already used in demo-sandbox/index.ts |
| CSRF token generation | Custom HMAC | `generateCsrfToken` from `'../../../middleware'` — already imported in demo-sandbox/index.ts |
| Cookie setting | Raw `Set-Cookie` headers | `setCookie` from `hono/cookie` — already used |
| OTP input UX | Custom library | 20 lines of vanilla JS — see Pattern 3 above |
| Email/OTP sending | New code | Phase 12 already built POST /demo/auth/request + POST /demo/auth/verify |

**Key insight:** Phase 12 did all the hard backend work. Phase 13's backend addition is one new GET endpoint (exchange) plus one response field addition (token in verify response body). The rest is frontend.

---

## Common Pitfalls

### Pitfall 1: Verify Response Missing Token Field

**What goes wrong:** The current `/demo/auth/verify` response returns `{ success, isNew, expiresAt, redirect }`. The frontend needs `token` to do the exchange redirect.

**Why it happens:** The verify endpoint was designed before the cross-domain handoff decision was finalized. The token was set only in cookies.

**How to avoid:** Add `token: demoToken` to the verify response JSON. The `demoToken` variable is already in scope at the return statement.

**Warning signs:** Site JS receives `data.token === undefined` after verify, redirect goes to wrong URL.

### Pitfall 2: CORS Missing on /demo/auth/* Routes

**What goes wrong:** Fetch from `flarecms.dev` to `admin.flarecms.dev/demo/auth/request` fails with "CORS policy: No 'Access-Control-Allow-Origin' header".

**Why it happens:** The CORS middleware is wired only on `apiRoutes` (the `/api/*` prefix). The `demoAuthAPI` routes are registered at `/demo/auth/*` via a different route registration path.

**How to avoid:** Add `cors()` middleware to `demoAuthAPI` before the first `.post()` handler. Also update wrangler.toml production `CORS_ORIGINS` to include `https://flarecms.dev`.

**Warning signs:** Network tab shows preflight OPTIONS returning no CORS headers, or 405 on OPTIONS.

### Pitfall 3: SameSite=Strict Blocks Cookie on Navigation

**What goes wrong:** The verify endpoint sets cookies in its CORS response. The browser stores the cookies for `admin.flarecms.dev`. When JS then does `window.location.href = 'https://admin.flarecms.dev/admin'`, the browser treats this as a cross-site navigation and `SameSite=Strict` cookies are NOT sent. The admin loads unauthenticated.

**Why it happens:** `SameSite=Strict` means the cookie is only sent when the request originates from the same site as the cookie's domain. A top-level navigation from `flarecms.dev` to `admin.flarecms.dev` is cross-site.

**How to avoid:** Use the exchange endpoint pattern (Pattern 1). The browser navigates directly to `admin.flarecms.dev/demo/auth/exchange?token=JWT` which sets the cookies from within the same site, then redirects to `/admin` (same-site navigation).

### Pitfall 4: Production CORS_ORIGINS Not Updated

**What goes wrong:** Local dev works (wrangler.toml dev has `localhost:4321`), but production site at `flarecms.dev` gets CORS errors calling the CMS Worker.

**Why it happens:** `wrangler.toml` `[env.production]` currently sets `CORS_ORIGINS = "https://flare-site.pages.dev"` — the Pages preview URL, not the custom domain.

**How to avoid:** Update `wrangler.toml` production CORS_ORIGINS to `"https://flarecms.dev"`.

### Pitfall 5: classList.add with Space-Separated Classes

**What goes wrong:** `element.classList.add('foo bar')` fails silently — it tries to add a class literally named `"foo bar"` rather than two classes.

**Why it happens:** Known gotcha in the project (documented in CLAUDE.md admin template section).

**How to avoid:** Always `classList.add('foo', 'bar')` or use multiple `classList.add` calls.

### Pitfall 6: Nav "Try Demo" Links Have TODO Comments

**What goes wrong:** Three places in Layout.astro have TODO comments for demo CTAs that need to be uncommented. Missing one means an orphaned TODO after the phase.

**Locations:**
- Line 145: `<!-- TODO: Re-enable when /demo with roles + OTP login is ready -->`  (desktop CTA button area)
- Line 281: `<!-- TODO: Re-enable when /demo with roles + OTP login is ready -->` (mobile menu CTA)
- Hero.astro line ~38: commented-out "Try the Demo" button
- Layout.astro footer line ~351: commented-out footer demo link

**How to avoid:** Plan covers all four uncomment locations explicitly.

---

## Code Examples

### Verify Endpoint Response Modification (in demo-sandbox/index.ts)

```typescript
// Source: packages/core/src/plugins/core-plugins/demo-sandbox/index.ts
// Current return at end of demoAuthAPI.post('/verify', ...)
// Change from:
return c.json({
  success: true,
  isNew,
  expiresAt: expiresAt * 1000,
  redirect: '/admin',
})

// Change to (add token field):
return c.json({
  success: true,
  isNew,
  expiresAt: expiresAt * 1000,
  redirect: '/admin',
  token: demoToken,  // <-- add this line
})
```

### Demo Page Fetch Pattern (demo.astro `<script is:inline>`)

```javascript
// POST to CMS cross-origin — needs CORS headers on the CMS side
const CMS_URL = 'https://admin.flarecms.dev'

async function requestOtp(email) {
  const res = await fetch(CMS_URL + '/demo/auth/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return res.json()
}

async function verifyOtp(email, code) {
  const res = await fetch(CMS_URL + '/demo/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
  return { ok: res.ok, data: await res.json() }
}

// After successful verify:
function redirectToAdmin(token) {
  window.location.href = CMS_URL + '/demo/auth/exchange?token=' + encodeURIComponent(token)
}
```

**Note:** No `credentials: 'include'` needed on the fetch calls — we are NOT relying on cookies from the site's fetch. We only need the token in the response body.

### Disclaimer Box Pattern (matches existing site callout style)

```html
<!-- Subtle info callout — placed above email form -->
<div class="flex gap-3 px-4 py-3 rounded-lg bg-surface-secondary border border-border text-sm text-text-secondary mb-6">
  <svg class="w-4 h-4 mt-0.5 shrink-0 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
  </svg>
  <div>
    <!-- Developer view -->
    <span data-audience="dev">30-minute session &middot; 50 API operations &middot; data resets every 6 hours</span>
    <!-- Client view -->
    <span data-audience="client" class="hidden">30-minute session &middot; 50 content edits &middot; data resets every 6 hours</span>
  </div>
</div>
```

### Page Layout Decision (Claude's Discretion)

Use the full site `<Layout>` with nav and footer. The demo page is a legitimate part of the site, not a standalone app. The existing nav (sticky, scroll-shrink, dark/light theme toggle) provides context about what product they're about to try.

---

## State of the Art

| Current State | What Phase 13 Changes |
|---------------|----------------------|
| Nav has no Demo link (TODO comments) | Add Demo to navLinks array + uncomment 3 CTA spots |
| `/demo/auth/verify` returns no `token` in body | Add `token: demoToken` to response |
| `demoAuthAPI` has no CORS middleware | Add `cors()` before first route handler |
| wrangler.toml production CORS_ORIGINS = `flare-site.pages.dev` | Change to `flarecms.dev` |
| No `/demo/auth/exchange` endpoint exists | Add GET handler to demoAuthAPI |
| `flarecms.dev/demo` does not exist | Create `demo.astro` page |

---

## Open Questions

1. **Exchange token — use full JWT or a short-lived one-time code?**
   - What we know: Full 30-min JWT works and is already signed. Short-lived tokens would require a new DB table or KV key for the exchange store.
   - What's unclear: How often do users share URLs or have URL history sniffed in this scenario? (Demo users are self-selected, low-value targets.)
   - Recommendation: Use the full JWT from verify. The 30-minute expiry is acceptable for a public demo. Avoid DB complexity for a one-time exchange.

2. **Resend code cooldown UX (Claude's Discretion)**
   - The OTP settings allow 3 requests/hour per email. After requesting, show a "Resend code" link with a 60-second cooldown timer (purely visual — enforce the rate limit on the server).

3. **Local dev testing the cross-domain flow**
   - wrangler dev runs on `localhost:8787`. The Astro site is `localhost:4321`. These are different ports = different origins, so CORS is required even locally. The existing dev CORS_ORIGINS already has `localhost:4321`. The exchange redirect points to `localhost:8787/demo/auth/exchange` in dev.
   - The demo.astro script needs an env variable for `CMS_URL` so it points to localhost in dev and `admin.flarecms.dev` in prod.
   - `PUBLIC_FLARE_API_URL` is already set in the Pages dashboard and wrangler.jsonc — reuse this for `CMS_URL`.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `packages/core/src/plugins/core-plugins/demo-sandbox/index.ts` — full verify endpoint implementation
- Direct code inspection: `packages/core/src/routes/api.ts` — CORS middleware scope (only on /api/*)
- Direct code inspection: `packages/cms/wrangler.toml` — current production CORS_ORIGINS value
- Direct code inspection: `packages/site/src/layouts/Layout.astro` — TODO comments for demo CTAs, existing design patterns
- Direct code inspection: `packages/site/src/styles/global.css` — all design tokens, font, color scale
- Direct code inspection: `packages/site/src/data/homepage.ts` — navLinks array (no Demo entry yet)

### Secondary (MEDIUM confidence)
- MDN SameSite cookies documentation (known browser behavior): `SameSite=Strict` cookies are not sent on cross-site top-level navigation. This is established browser behavior, not project-specific.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — everything needed is already installed, verified in package files
- Architecture (cross-domain handoff): HIGH — code inspection confirmed the CORS gap, cookie sameSite settings, and missing token in response body
- Architecture (page structure): HIGH — existing pages follow clear patterns, design system is documented
- Pitfalls: HIGH — all confirmed by direct code inspection, not assumptions
- Code examples: HIGH — based on existing patterns in the codebase

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable stack, no fast-moving deps)
