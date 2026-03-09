---
title: CSRF & CORS
slug: csrf-cors
excerpt: Signed double-submit cookie CSRF protection and CORS origin configuration.
section: security
order: 3
status: published
---

## CSRF Protection

Flare CMS implements **Signed Double-Submit Cookie** CSRF protection -- a stateless approach that works without server-side session storage, making it ideal for Cloudflare Workers.

### How It Works

1. On every **GET/HEAD/OPTIONS** request, the middleware ensures a `csrf_token` cookie exists. If the cookie is missing or has an invalid signature, a new token is generated.
2. On **POST/PUT/DELETE/PATCH** requests, the middleware validates that:
   - The `csrf_token` cookie is present
   - An `X-CSRF-Token` header (or `_csrf` form field) matches the cookie value
   - The HMAC signature in the token is valid

### Token Format

CSRF tokens use the format `<nonce>.<hmac_signature>`:

- **Nonce:** 32 random bytes, base64url-encoded
- **Signature:** HMAC-SHA256 of the nonce, keyed with `JWT_SECRET`, base64url-encoded

The HMAC signature ensures tokens cannot be forged without knowing the server secret. Validation uses `crypto.subtle.verify` which provides constant-time comparison.

### Token Lifecycle

- Tokens are set as cookies with `maxAge: 86400` (24 hours)
- The cookie is `httpOnly: false` (JavaScript must read it to send the header)
- The cookie is `secure: true` in production, `secure: false` in development
- `sameSite: Strict` prevents the cookie from being sent on cross-site requests
- If an existing cookie has a valid HMAC, it is reused (no new `Set-Cookie` header)

### Usage in JavaScript

When making state-changing requests from the admin UI, include the CSRF token:

```javascript
// Read the csrf_token cookie
function getCsrfToken() {
  const match = document.cookie.match(/csrf_token=([^;]+)/)
  return match ? match[1] : null
}

// Include in fetch requests
fetch('/api/content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken()
  },
  body: JSON.stringify(data)
})
```

For HTML form submissions, include the token as a hidden field:

```html
<form method="POST" action="/api/content">
  <input type="hidden" name="_csrf" value="{{csrfToken}}">
  <!-- form fields -->
</form>
```

### Exempt Paths

Certain paths are exempt from CSRF validation:

**Auth routes** (creating sessions, not modifying resources):
- `/auth/login`
- `/auth/register`
- `/auth/seed-admin`
- `/auth/accept-invitation`
- `/auth/reset-password`
- `/auth/request-password-reset`

**Public form submissions:**
- `/forms/*` and `/api/forms/*` (but NOT `/admin/forms/*`)

**Search API:**
- `/api/search*` (read-only POST for complex query parameters)

**Bearer-only and API-key-only requests:**
- If no `auth_token` cookie is present (the request uses only `Authorization: Bearer` or `X-API-Key`), CSRF validation is skipped. CSRF attacks exploit cookie-based authentication; token-header-based auth is not vulnerable.

### Configuration

```typescript
import { csrfProtection } from '@flare-cms/core'

app.use('*', csrfProtection({
  exemptPaths: ['/api/webhooks']  // Additional paths to exempt
}))
```

### Error Responses

When CSRF validation fails, the middleware returns 403:

- **Browser requests** (Accept: text/html): HTML error page with "403 Forbidden"
- **API requests:** `{ "error": "CSRF token missing|mismatch|invalid", "status": 403 }`

## CORS Configuration

CORS (Cross-Origin Resource Sharing) is configured through the `CORS_ORIGINS` environment variable in `wrangler.toml`.

### Configuration

Set allowed origins as a comma-separated list:

```toml
# wrangler.toml
[vars]
CORS_ORIGINS = "http://localhost:4321,http://localhost:8787"

[env.production.vars]
CORS_ORIGINS = "https://flare-site.pages.dev"
```

### How Origins Are Used

The `CORS_ORIGINS` variable defines which domains are allowed to make cross-origin requests to the CMS API. In the default configuration:

- **Development:** Both the Astro dev server (`localhost:4321`) and the CMS admin (`localhost:8787`) are allowed
- **Production:** Only the deployed site domain is allowed

### Recommended Settings

| Environment | CORS_ORIGINS |
|-------------|-------------|
| Development | `http://localhost:4321,http://localhost:8787` |
| Staging | Your staging domain(s) |
| Production | Your production site domain only |

Keep the origin list as restrictive as possible. Only include domains that genuinely need to make cross-origin API requests.

## CSRF + CORS Together

These two mechanisms complement each other:

- **CORS** prevents unauthorized origins from making requests at the browser level
- **CSRF** prevents authorized origins from being tricked into making unwanted requests

Both should be enabled in production. The CSRF middleware is applied globally, while CORS origins are configured per environment.

## Next Steps

- See [Security Headers](/docs/security/security-headers) for additional HTTP security headers
- See [Authentication System](/docs/security/auth-system) for JWT and session management
- See [Rate Limiting](/docs/security/rate-limiting) for request throttling
