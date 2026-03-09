---
title: Rate Limiting
slug: rate-limiting
excerpt: KV-based sliding window rate limiter -- configuration, headers, and graceful degradation.
section: security
order: 2
status: published
---

## Overview

Flare CMS includes a KV-based rate limiter that uses a sliding window approach to throttle requests. It is implemented as Hono middleware and stores request counts in the `CACHE_KV` binding.

## How It Works

The rate limiter tracks requests per client IP within a configurable time window:

1. Extract the client IP from `cf-connecting-ip` (Cloudflare) or `x-forwarded-for` headers
2. Look up the current count in KV using key `ratelimit:<prefix>:<ip>`
3. If the window has expired, reset the counter
4. Increment the count
5. If count exceeds `max`, return 429 (Too Many Requests)
6. Otherwise, continue to the next handler

## Configuration

The `rateLimit()` function accepts three parameters:

```typescript
import { rateLimit } from '@flare-cms/core'

app.use('/api/*', rateLimit({
  max: 100,           // Maximum requests per window
  windowMs: 60000,    // Window duration in milliseconds (60 seconds)
  keyPrefix: 'api'    // Namespace for KV keys
}))
```

| Option | Type | Description |
|--------|------|-------------|
| `max` | `number` | Maximum number of requests allowed per window |
| `windowMs` | `number` | Window duration in milliseconds |
| `keyPrefix` | `string` | Prefix for KV rate limit keys (enables different limits per route group) |

### Multiple Rate Limits

You can apply different limits to different route groups using the `keyPrefix`:

```typescript
// Strict limit on auth endpoints (prevent brute force)
app.use('/auth/*', rateLimit({
  max: 10,
  windowMs: 60000,
  keyPrefix: 'auth'
}))

// Moderate limit on API endpoints
app.use('/api/*', rateLimit({
  max: 100,
  windowMs: 60000,
  keyPrefix: 'api'
}))

// Generous limit on public content
app.use('/content/*', rateLimit({
  max: 500,
  windowMs: 60000,
  keyPrefix: 'content'
}))
```

## Response Headers

Every response includes rate limit headers so clients can monitor their usage:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in the current window |
| `X-RateLimit-Remaining` | Requests remaining in the current window |
| `X-RateLimit-Reset` | Unix timestamp (seconds) when the window resets |

When the limit is exceeded, an additional header is sent:

| Header | Description |
|--------|-------------|
| `Retry-After` | Seconds until the client can retry |

### Example Response (Rate Limited)

```
HTTP/1.1 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1709913600

{
  "error": "Too many requests. Please try again later."
}
```

## KV Storage

Rate limit entries are stored in the `CACHE_KV` namespace with automatic expiration:

- **Key format:** `ratelimit:<prefix>:<ip>`
- **Value:** JSON `{ count: number, resetAt: number }`
- **TTL:** Set to match the remaining window duration (KV `expirationTtl`)

Because KV entries expire automatically, there is no need for manual cleanup.

## Graceful Degradation

The rate limiter is designed to never break your application:

- **No KV binding:** If the `CACHE_KV` binding is not available (e.g., in local development without wrangler), the middleware silently skips rate limiting and allows the request through
- **KV errors:** If a KV read or write fails, the error is logged as non-fatal and the request proceeds normally

```typescript
// From the source:
// Rate limiting should never break the app
console.error('Rate limiter error (non-fatal):', error)
return await next()
```

## Client IP Detection

The rate limiter identifies clients using these headers in order:

1. `cf-connecting-ip` -- set automatically by Cloudflare Workers
2. `x-forwarded-for` -- fallback for proxied requests
3. `'unknown'` -- default if no IP header is available

On Cloudflare Workers, `cf-connecting-ip` is always present and reflects the true client IP, even behind Cloudflare's proxy.

## Next Steps

- See [CSRF & CORS](/docs/security/csrf-cors) for cross-site request protection
- See [Security Headers](/docs/security/security-headers) for HTTP response headers
- See [Authentication System](/docs/security/auth-system) for JWT and API token authentication
