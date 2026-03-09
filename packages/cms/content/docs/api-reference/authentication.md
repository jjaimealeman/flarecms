---
title: Authentication
slug: authentication
excerpt: JWT-based authentication flow for the Flare CMS API with login, registration, and role-based access.
section: api-reference
order: 3
status: published
---

## Overview

Flare CMS uses **JWT (JSON Web Token)** authentication. When you log in, the server returns a signed JWT and sets it as an httpOnly cookie named `auth_token`. You can also pass the token via the `Authorization: Bearer` header for API-only access.

Tokens expire after **24 hours**.

## Login

### API Login (JSON)

Send a JSON body to `POST /auth/login`:

**curl:**

```bash
curl -X POST "http://localhost:8787/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "your-password"}'
```

**TypeScript:**

```typescript
const response = await fetch('http://localhost:8787/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'your-password',
  }),
})

const { user, token } = await response.json()
console.log(`Logged in as ${user.email} (${user.role})`)

// Use the token for subsequent requests
const contentResponse = await fetch('http://localhost:8787/api/content', {
  headers: { 'Authorization': `Bearer ${token}` },
})
```

**Successful response:**

```json
{
  "user": {
    "id": "user-uuid",
    "email": "admin@example.com",
    "username": "admin",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

The server also sets an `auth_token` httpOnly cookie automatically. If you're making requests from a browser, subsequent requests will include the cookie -- no need to manually pass the token.

### Form Login

There's also a form-encoded login endpoint at `POST /auth/login/form` used by the admin UI:

> [!NOTE]
> The form login endpoint uses `application/x-www-form-urlencoded`, not JSON. This is the endpoint the admin UI's HTML login form posts to. For programmatic API access, use the JSON endpoint at `/auth/login`.

```bash
curl -X POST "http://localhost:8787/auth/login/form" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@example.com&password=your-password"
```

## Registration

Register a new user with `POST /auth/register`:

```typescript
const response = await fetch('http://localhost:8787/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'newuser@example.com',
    password: 'secure-password-123',
    username: 'newuser',
    firstName: 'Jane',
    lastName: 'Doe',
  }),
})

const { user, token } = await response.json()
// New users get the "viewer" role by default
```

**Important details:**

- The first user to register automatically gets the **admin** role (bootstrap scenario)
- Subsequent registrations require registration to be enabled in settings
- Registration is rate-limited to **3 attempts per minute**
- Emails are normalized to lowercase

## Logout

```bash
# API logout (clears cookie)
curl -X POST "http://localhost:8787/auth/logout"

# Browser logout (clears cookie and redirects to login page)
curl "http://localhost:8787/auth/logout"
```

## JWT Token Structure

The JWT payload contains:

```json
{
  "userId": "user-uuid",
  "email": "admin@example.com",
  "role": "admin",
  "exp": 1709942400,
  "iat": 1709856000
}
```

| Field | Description |
|-------|-------------|
| `userId` | User's unique ID |
| `email` | User's email address |
| `role` | User's role (admin, editor, author, viewer) |
| `exp` | Expiration timestamp (Unix seconds) |
| `iat` | Issued-at timestamp (Unix seconds) |

Tokens are signed with HS256 using the `JWT_SECRET` environment variable. **Always set a strong secret in production.**

## Sending Authenticated Requests

You have two options for sending the JWT:

### Option 1: Authorization Header

```typescript
const response = await fetch('http://localhost:8787/api/content', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
})
```

### Option 2: Cookie (automatic)

If you logged in from a browser, the `auth_token` cookie is set automatically. Just make sure your fetch includes credentials:

```typescript
const response = await fetch('http://localhost:8787/api/content', {
  credentials: 'include',
})
```

## Role-Based Access

Flare CMS has four roles with ascending permissions:

| Role | Read | Create | Edit Own | Edit All | Delete | Admin |
|------|------|--------|----------|----------|--------|-------|
| **viewer** | Yes | -- | -- | -- | -- | -- |
| **author** | Yes | Yes | Yes | -- | Own only | -- |
| **editor** | Yes | Yes | Yes | Yes | Yes | -- |
| **admin** | Yes | Yes | Yes | Yes | Yes | Yes |

- **viewer** -- Read-only access. API tokens authenticate as this role.
- **author** -- Can create content and edit/delete their own items.
- **editor** -- Full content management across all collections.
- **admin** -- Everything plus user management, collection builder, settings, and plugins.

Permissions can also be scoped per-collection through the collection permissions system.

## Security Notes

- Passwords are hashed with **PBKDF2** (100,000 iterations, SHA-256). Legacy SHA-256 hashes are auto-migrated on login.
- Login is rate-limited to **5 attempts per minute** per IP.
- CSRF protection is enabled for browser sessions (signed cookie).
- JWT verification results are cached in KV for 5 minutes to reduce crypto overhead.
- Always set `JWT_SECRET` as a Wrangler secret in production -- never use the fallback value.

```bash
# Set your production JWT secret
wrangler secret put JWT_SECRET
```
