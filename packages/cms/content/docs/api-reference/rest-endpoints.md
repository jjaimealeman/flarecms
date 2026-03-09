---
title: REST Endpoints
slug: rest-endpoints
excerpt: Complete reference for every Flare CMS API endpoint with request and response examples.
section: api-reference
order: 1
status: published
---

## Base URL

All API endpoints are served from your CMS Worker URL:

```
https://your-cms.your-account.workers.dev/api
```

During local development:

```
http://localhost:8787/api
```

## Response Envelope

Every API response follows the same envelope format:

```json
{
  "data": [],
  "meta": {
    "count": 10,
    "timestamp": "2026-03-08T12:00:00.000Z",
    "cache": {
      "hit": false,
      "source": "database"
    },
    "timing": {
      "total": 45,
      "execution": 12,
      "unit": "ms"
    }
  }
}
```

The `meta` object always includes `timing` information so you can monitor performance. When the cache plugin is active, you'll also see `cache.hit` and `cache.source` fields.

## Authentication Methods

Endpoints use three auth levels:

| Level | How | When |
|-------|-----|------|
| **None** | No auth needed | Public read endpoints |
| **API Key** | `X-API-Key` header | Headless frontend reads |
| **JWT** | `Authorization: Bearer <token>` or `auth_token` cookie | Admin write operations |

See [Authentication](/docs/api-reference/authentication) for the full JWT flow and [API Tokens](/docs/api-reference/api-tokens) for key-based access.

## Content API

These are the endpoints you'll use most often to read and write content.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/content` | None | List all content with filtering |
| `GET` | `/api/content/check-slug` | None | Check if a slug is available |
| `GET` | `/api/content/:id` | None | Get a single content item by ID |
| `POST` | `/api/content` | JWT | Create new content |
| `PUT` | `/api/content/:id` | JWT | Update existing content |
| `DELETE` | `/api/content/:id` | JWT | Delete content |

## Collection API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/collections` | None | List all active collections |
| `GET` | `/api/collections/:name/content` | None | Get content from a specific collection |

## Media API

All media endpoints require JWT authentication.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/media` | JWT | List all media files |
| `POST` | `/api/media/upload` | JWT | Upload a file to R2 storage |
| `DELETE` | `/api/media/:id` | JWT | Delete a media file |

## System API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/` | None | OpenAPI 3.0 specification |
| `GET` | `/api/health` | None | Basic health check |
| `GET` | `/api/system/health` | None | Detailed health with DB/KV latency |

## Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/login` | None | Login with JSON body |
| `POST` | `/auth/login/form` | None | Login with form-encoded body |
| `POST` | `/auth/register` | None | Register a new user (JSON) |
| `POST` | `/auth/logout` | None | Clear auth cookie |
| `GET` | `/auth/logout` | None | Clear auth cookie and redirect |

---

## Detailed Examples

### List content from a collection

The most common operation -- fetching published content for your frontend.

**curl:**

```bash
curl "http://localhost:8787/api/collections/blog-posts/content?status=published&limit=10"
```

**TypeScript:**

```typescript
const response = await fetch(
  'http://localhost:8787/api/collections/blog-posts/content?status=published&limit=10'
)
const { data, meta } = await response.json()

console.log(`Found ${meta.count} posts (${meta.timing.total}ms)`)
data.forEach(post => {
  console.log(post.title, post.slug)
})
```

**Response:**

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Getting Started with Flare CMS",
      "slug": "getting-started-with-flare-cms",
      "status": "published",
      "collectionId": "coll-uuid-here",
      "data": {
        "content": "<p>Welcome to Flare CMS...</p>",
        "featuredImage": "https://images.flarecms.dev/uploads/hero.jpg"
      },
      "created_at": 1709856000000,
      "updated_at": 1709942400000
    }
  ],
  "meta": {
    "count": 1,
    "timestamp": "2026-03-08T12:00:00.000Z",
    "cache": { "hit": false, "source": "database" },
    "timing": { "total": 23, "execution": 8, "unit": "ms" }
  }
}
```

### Get a single content item

**curl:**

```bash
curl "http://localhost:8787/api/content/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

**TypeScript:**

```typescript
const response = await fetch(
  `http://localhost:8787/api/content/${contentId}`
)
const { data } = await response.json()

console.log(data.title)
console.log(data.data.content)
```

**Response:**

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Getting Started with Flare CMS",
    "slug": "getting-started-with-flare-cms",
    "status": "published",
    "collectionId": "coll-uuid-here",
    "data": {
      "content": "<p>Welcome to Flare CMS...</p>"
    },
    "created_at": 1709856000000,
    "updated_at": 1709942400000
  }
}
```

### Create content

Requires JWT authentication. Pass the token as a Bearer header or rely on the `auth_token` cookie.

**curl:**

```bash
curl -X POST "http://localhost:8787/api/content" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "collectionId": "coll-uuid-here",
    "title": "My New Post",
    "slug": "my-new-post",
    "status": "draft",
    "data": {
      "content": "<p>Hello world</p>",
      "excerpt": "A short summary"
    }
  }'
```

**TypeScript:**

```typescript
const response = await fetch('http://localhost:8787/api/content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    collectionId: 'coll-uuid-here',
    title: 'My New Post',
    slug: 'my-new-post',
    status: 'draft',
    data: {
      content: '<p>Hello world</p>',
      excerpt: 'A short summary',
    },
  }),
})

const { data } = await response.json()
console.log('Created:', data.id)
```

**Response (201):**

```json
{
  "data": {
    "id": "new-uuid-here",
    "title": "My New Post",
    "slug": "my-new-post",
    "status": "draft",
    "collectionId": "coll-uuid-here",
    "data": {
      "content": "<p>Hello world</p>",
      "excerpt": "A short summary"
    },
    "created_at": 1709942400000,
    "updated_at": 1709942400000
  }
}
```

### Upload media

Files are uploaded via `multipart/form-data` and stored in Cloudflare R2.

**curl:**

```bash
curl -X POST "http://localhost:8787/api/media/upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@./photo.jpg" \
  -F "folder=blog-images"
```

**TypeScript:**

```typescript
const formData = new FormData()
formData.append('file', fileBlob, 'photo.jpg')
formData.append('folder', 'blog-images')

const response = await fetch('http://localhost:8787/api/media/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
})

const result = await response.json()
console.log('Uploaded to:', result.data.url)
```

## Error Responses

All errors follow the same shape:

```json
{
  "error": "Content not found"
}
```

Some errors include additional detail:

```json
{
  "error": "Failed to create content",
  "details": "UNIQUE constraint failed: content.slug"
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request (invalid body or params) |
| `401` | Not authenticated |
| `403` | Insufficient permissions or blocked by hook |
| `404` | Resource not found |
| `409` | Conflict (duplicate slug, invalid status transition) |
| `500` | Server error |

## CORS

Cross-origin requests are controlled by the `CORS_ORIGINS` environment variable. Set it to a comma-separated list of allowed origins:

```toml
# wrangler.toml
[vars]
CORS_ORIGINS = "https://your-site.com,http://localhost:4321"
```

If `CORS_ORIGINS` is not set, all cross-origin requests are rejected (secure default).

Allowed methods: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
Allowed headers: `Content-Type`, `Authorization`, `X-API-Key`

## Rate Limiting

Authentication endpoints are rate-limited:

- **Login:** 5 attempts per minute per IP
- **Registration:** 3 attempts per minute per IP

API content endpoints are not rate-limited by default but can be throttled via the cache plugin.

## Cache Headers

When the cache plugin is active, API responses include cache headers:

| Header | Value | Meaning |
|--------|-------|---------|
| `X-Cache-Status` | `HIT` or `MISS` | Whether response came from cache |
| `X-Cache-Source` | `memory`, `kv`, or `database` | Where the data came from |
| `X-Cache-TTL` | `300` | Remaining cache lifetime in seconds |
| `X-Response-Time` | `23ms` | Total response time |
