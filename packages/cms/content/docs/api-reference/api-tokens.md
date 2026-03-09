---
title: API Tokens
slug: api-tokens
excerpt: Read-only access keys for headless API access with collection scoping.
section: api-reference
order: 4
status: published
---

## What Are API Tokens?

API tokens are **read-only access keys** designed for headless frontend access. Instead of logging in with email/password and managing JWT tokens, you create a long-lived API token and include it in your requests.

This is how your Astro frontend (or any other client) authenticates to the Flare CMS API.

> [!NOTE]
> API tokens are **read-only**. They can only perform `GET` requests. Any `POST`, `PUT`, or `DELETE` request with an API token will be rejected with a `403` error.

## Using API Tokens

Include the token in the `X-API-Key` header:

**curl:**

```bash
curl "http://localhost:8787/api/collections/blog-posts/content" \
  -H "X-API-Key: st_a1b2c3d4e5f6g7h8i9j0..."
```

**TypeScript:**

```typescript
const API_TOKEN = process.env.FLARE_API_TOKEN

const response = await fetch(
  'http://localhost:8787/api/collections/blog-posts/content?status=published',
  {
    headers: {
      'X-API-Key': API_TOKEN,
    },
  }
)

const { data } = await response.json()
```

**Astro example:**

```typescript
// src/lib/flare.ts
const CMS_URL = import.meta.env.CMS_API_URL
const API_KEY = import.meta.env.CMS_API_KEY

export async function getCollection(name: string) {
  const response = await fetch(
    `${CMS_URL}/api/collections/${name}/content?status=published&limit=100`,
    {
      headers: { 'X-API-Key': API_KEY },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch ${name}: ${response.status}`)
  }

  const { data } = await response.json()
  return data
}
```

## Token Format

API tokens use the prefix `st_` followed by a random string:

```
st_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

After creation, only the prefix (first 8 characters) is stored and displayed in the admin UI. **The full token value is shown only once at creation time** -- copy it immediately.

## Collection Scoping

Tokens can be scoped to specific collections. A scoped token can only access content from its allowed collections.

```bash
# This works if the token is scoped to "blog-posts"
curl "http://localhost:8787/api/collections/blog-posts/content" \
  -H "X-API-Key: st_your_token"

# This returns 403 if the token is NOT scoped to "pages"
curl "http://localhost:8787/api/collections/pages/content" \
  -H "X-API-Key: st_your_token"
# => {"error": "Access denied: token is not authorized for collection 'pages'"}
```

If no collections are selected during creation, the token has access to **all collections**.

## Creating Tokens

Tokens are created through the admin UI at `/admin/api-tokens`:

1. Go to **Admin > API Tokens**
2. Click **Create Token**
3. Enter a descriptive name (e.g., "Astro frontend production")
4. Choose an expiration (or "Never expires")
5. Select which collections the token can access (leave empty for all)
6. Click **Create Token**
7. **Copy the token immediately** -- it won't be shown again

## Token Expiration

Tokens can be created with these expiration options:

| Option | Duration |
|--------|----------|
| Never expires | No expiration |
| 30 days | Short-lived, good for testing |
| 90 days | Medium-term access |
| 180 days | Semi-permanent |
| 1 year | Long-term production use |

Expired tokens are rejected with a `401` error.

## Revoking Tokens

To revoke a token, go to **Admin > API Tokens** and click **Revoke** next to the token. This is immediate and cannot be undone.

Revoke tokens when:
- A token may have been compromised
- A frontend deployment is decommissioned
- An employee leaves the team
- You want to rotate credentials

## API Token vs JWT Auth

| Feature | API Token | JWT Auth |
|---------|-----------|----------|
| **Access level** | Read-only | Full read/write |
| **Lifetime** | Configurable (days to never) | 24 hours |
| **Scoping** | Per-collection | Full access |
| **Best for** | Headless frontends | Admin operations |
| **Auth method** | `X-API-Key` header | `Authorization: Bearer` header or cookie |
| **User role** | `viewer` | Based on user account |

## Best Practices

1. **Use separate tokens per environment** -- one for local dev, one for staging, one for production
2. **Scope tokens to needed collections** -- don't give a blog frontend access to user settings
3. **Set expiration dates** for non-production tokens
4. **Store tokens in environment variables**, never in source code
5. **Rotate production tokens periodically** -- create a new token, update your deployment, then revoke the old one

```bash
# Store in .env (never commit this file)
CMS_API_KEY=st_your_production_token_here
```
