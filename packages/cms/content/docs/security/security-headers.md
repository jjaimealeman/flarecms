---
title: Security Headers
slug: security-headers
excerpt: HTTP security headers set on every response -- X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, and HSTS.
section: security
order: 4
status: published
---

## Overview

Flare CMS sets standard HTTP security headers on every response through the `securityHeadersMiddleware`. These headers instruct browsers to enable built-in security features that protect against common attack vectors.

## Headers Set

The middleware runs after the response handler (`await next()`) and sets these headers:

### X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```

Prevents browsers from MIME-sniffing the `Content-Type` header. Without this, a browser might interpret a JSON response as HTML and execute embedded scripts (content type confusion attacks).

### X-Frame-Options

```
X-Frame-Options: SAMEORIGIN
```

Allows the page to be framed only by pages on the same origin. Prevents clickjacking attacks where an attacker embeds your admin UI in an invisible iframe and tricks users into clicking buttons.

### Referrer-Policy

```
Referrer-Policy: strict-origin-when-cross-origin
```

Controls how much referrer information is sent with requests:

- **Same-origin requests:** Full URL is sent
- **Cross-origin requests:** Only the origin (scheme + host + port) is sent
- **HTTPS to HTTP:** No referrer is sent

This prevents leaking sensitive URL paths (e.g., admin page URLs with tokens) to external sites.

### Permissions-Policy

```
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Disables access to sensitive browser APIs that a CMS does not need:

| Feature | Policy | Effect |
|---------|--------|--------|
| Camera | `camera=()` | Blocked for all origins |
| Microphone | `microphone=()` | Blocked for all origins |
| Geolocation | `geolocation=()` | Blocked for all origins |

This reduces the attack surface if malicious content or a compromised plugin tries to access these APIs.

### Strict-Transport-Security (HSTS)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

Instructs browsers to only connect via HTTPS for the next year (31,536,000 seconds), including all subdomains. This prevents SSL-stripping attacks and accidental HTTP connections.

**Important:** HSTS is only set in non-development environments. In development (`ENVIRONMENT=development` or unset), the header is omitted to avoid breaking local HTTP connections.

## Environment-Aware Behavior

The middleware checks the `ENVIRONMENT` variable to adjust its behavior:

```typescript
const environment = (c.env as any)?.ENVIRONMENT
if (environment !== 'development') {
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
}
```

| Environment | HSTS | Other Headers |
|-------------|------|---------------|
| `development` | Not set | All set |
| `staging` | Set | All set |
| `production` | Set | All set |
| Unset | Not set | All set |

## Applying the Middleware

The security headers middleware is applied globally in the Flare CMS application:

```typescript
import { securityHeadersMiddleware } from '@flare-cms/core'

app.use('*', securityHeadersMiddleware())
```

Because it runs after `await next()`, it adds headers to every response regardless of the route handler.

## Additional Protections

Beyond the security headers middleware, Flare CMS applies additional header-based protections through other middleware:

| Mechanism | Header/Behavior | Middleware |
|-----------|----------------|------------|
| CSRF | `csrf_token` cookie + `X-CSRF-Token` header validation | `csrfProtection()` |
| Rate limiting | `X-RateLimit-*` and `Retry-After` headers | `rateLimit()` |
| Auth cookies | `HttpOnly`, `Secure`, `SameSite=Strict` | `AuthManager.setAuthCookie()` |

## Testing Security Headers

You can verify headers are set correctly using curl:

```bash
curl -I https://flare-cms.your-domain.workers.dev/api/content

# Expected headers in response:
# X-Content-Type-Options: nosniff
# X-Frame-Options: SAMEORIGIN
# Referrer-Policy: strict-origin-when-cross-origin
# Permissions-Policy: camera=(), microphone=(), geolocation=()
# Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Next Steps

- See [Authentication System](/docs/security/auth-system) for JWT and session security
- See [CSRF & CORS](/docs/security/csrf-cors) for cross-site request protection
- See [Rate Limiting](/docs/security/rate-limiting) for request throttling
