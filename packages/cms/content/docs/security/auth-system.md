---
title: Authentication System
slug: auth-system
excerpt: JWT internals, password hashing with PBKDF2, role-based access control, and API token authentication.
section: security
order: 1
status: published
---

## Overview

Flare CMS uses JWT (JSON Web Tokens) for session authentication and supports API tokens for programmatic access. The authentication system is implemented in the `AuthManager` class and enforced through Hono middleware.

## JWT Authentication

### Token Structure

JWT tokens are signed with HS256 (HMAC-SHA256) using the `JWT_SECRET` environment variable. If no secret is configured, a hardcoded fallback is used (suitable for local development only).

Each token contains this payload:

```typescript
{
  userId: string   // User's unique ID
  email: string    // User's email address
  role: string     // User's role (e.g., 'admin', 'editor', 'viewer')
  exp: number      // Expiration timestamp (Unix seconds)
  iat: number      // Issued-at timestamp (Unix seconds)
}
```

Tokens expire after **24 hours** from issuance.

### Token Generation

```typescript
import { AuthManager } from '@flare-cms/core'

const token = await AuthManager.generateToken(
  userId,
  email,
  role,
  jwtSecret  // optional, falls back to default
)
```

### Token Verification

The `AuthManager.verifyToken()` method decodes the token, validates the HS256 signature, and checks the `exp` claim. Returns `null` if the token is invalid or expired:

```typescript
const payload = await AuthManager.verifyToken(token, jwtSecret)
if (!payload) {
  // Token is invalid or expired
}
```

### Token Caching

Verified JWT payloads are cached in KV for 5 minutes to avoid re-verifying the signature on every request. The cache key is derived from the first 20 characters of the token:

```
auth:<token_prefix_20_chars>
```

This means a single JWT verification hits `crypto.subtle.verify` once, then serves from KV cache for up to 5 minutes.

## Password Hashing

### PBKDF2 (Current)

New passwords are hashed using **PBKDF2-SHA256** with these parameters:

| Parameter | Value |
|-----------|-------|
| Algorithm | PBKDF2 |
| Hash | SHA-256 |
| Iterations | 100,000 |
| Salt | 16 random bytes |
| Key length | 256 bits |

The stored hash format is:

```
pbkdf2:<iterations>:<salt_hex>:<hash_hex>
```

Example: `pbkdf2:100000:a1b2c3d4e5f6...:9f8e7d6c5b4a...`

### Legacy SHA-256

Older accounts may have passwords hashed with a simple SHA-256 + static salt. The system detects legacy hashes (they lack the `pbkdf2:` prefix) and verifies them transparently:

```typescript
AuthManager.isLegacyHash(storedHash) // true if no 'pbkdf2:' prefix
```

### Constant-Time Comparison

Both PBKDF2 and legacy password verification use constant-time comparison (XOR-based, character by character) to prevent timing attacks.

## Authentication Middleware

### `requireAuth()`

Protects routes by requiring a valid JWT or API token. Checks credentials in this order:

1. **API Key** -- `X-API-Key` header is checked first. If present, validates against the `api_tokens` table. Invalid keys get an immediate 401.
2. **JWT (Authorization header)** -- `Authorization: Bearer <token>` header
3. **JWT (Cookie)** -- `auth_token` cookie (used by the admin UI)

If no credentials are found, the middleware returns 401 (JSON for API requests) or redirects to `/auth/login` (for browser requests based on the `Accept` header).

```typescript
import { requireAuth } from '@flare-cms/core'

app.get('/api/protected', requireAuth(), async (c) => {
  const user = c.get('user') // JWT payload
  return c.json({ userId: user.userId })
})
```

### `requireRole(role)`

Requires authentication AND a specific role. Can accept a single role string or an array of allowed roles:

```typescript
import { requireRole } from '@flare-cms/core'

// Single role
app.delete('/api/users/:id', requireAuth(), requireRole('admin'), handler)

// Multiple roles
app.put('/api/content/:id', requireAuth(), requireRole(['admin', 'editor']), handler)
```

Returns 403 (Insufficient permissions) if the user's role is not in the allowed list. Logs a warning with the user ID, requested resource, method, and role mismatch.

### `optionalAuth()`

Attempts to authenticate but does not block the request if no token is present. Useful for routes that behave differently for authenticated vs. anonymous users:

```typescript
import { optionalAuth } from '@flare-cms/core'

app.get('/api/content', optionalAuth(), async (c) => {
  const user = c.get('user') // May be undefined
  if (user) {
    // Show draft content for authenticated users
  }
})
```

## API Token Authentication

For programmatic access (CI/CD, scripts, external integrations), Flare CMS supports API tokens sent via the `X-API-Key` header.

API tokens are stored in the `api_tokens` D1 table with:

- User ID association
- Optional expiration date
- Last-used timestamp tracking

When a valid API token is presented, the middleware sets the user context with:

- `userId` from the token record
- `email` as `api-token@system`
- `role` as `viewer`

## Auth Cookie Management

The `AuthManager.setAuthCookie()` method sets the `auth_token` cookie with secure defaults:

```typescript
AuthManager.setAuthCookie(c, token, {
  maxAge: 86400,         // 24 hours (default)
  secure: true,          // HTTPS only (default)
  httpOnly: true,        // No JavaScript access (default)
  sameSite: 'Strict'     // Same-site only (default)
})
```

These defaults ensure the auth cookie is not accessible to client-side JavaScript and is only sent on same-site HTTPS requests.

## Role-Based Access Control

Flare CMS uses a simple role hierarchy:

| Role | Capabilities |
|------|-------------|
| `admin` | Full access -- manage users, settings, content, plugins, and all API endpoints |
| `editor` | Create, edit, and publish content; manage media |
| `viewer` | Read-only access to content and media |

Roles are stored as a string field in the user record and embedded in the JWT payload. The `requireRole()` middleware enforces role checks after authentication.

## Security Recommendations

1. **Always set `JWT_SECRET`** in production via `wrangler secret put JWT_SECRET`. The fallback key is publicly known and insecure.
2. **Rotate secrets** periodically. Changing the JWT secret invalidates all active sessions.
3. **Use API tokens** for automated access instead of embedding user credentials in scripts.
4. **Monitor auth logs** -- failed login attempts and permission denials are logged with structured context (user ID, resource, method, roles).

## Next Steps

- See [Rate Limiting](/docs/security/rate-limiting) for request throttling configuration
- See [CSRF & CORS](/docs/security/csrf-cors) for cross-site request protection
- See [Security Headers](/docs/security/security-headers) for HTTP security headers
