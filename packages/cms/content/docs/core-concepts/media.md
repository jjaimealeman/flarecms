---
title: Media
slug: media
excerpt: Upload, organize, and serve images and files through R2 storage with optional custom domains.
section: core-concepts
order: 4
status: published
---

## Overview

Flare CMS stores media files in **Cloudflare R2** — an S3-compatible object storage service. R2 has no egress fees, making it ideal for serving images and files at scale.

Media is managed through the admin UI and accessible via the REST API.

## Storage architecture

```
Upload request
  ↓
Worker receives file
  ↓
Store in R2 (MEDIA_BUCKET binding)
  ↓
Record metadata in D1 (media table)
  ↓
Return media URL
```

Each uploaded file gets:
- An **R2 object key** (the storage path)
- A **database record** with metadata (filename, mime type, size, dimensions)
- A **public URL** for serving

## Uploading media

### Single file upload

Upload a file through the API:

```bash
curl -X POST http://localhost:8787/api/media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@photo.jpg"
```

### Admin UI upload

In the admin panel, navigate to **Media** in the sidebar. You can:
- Drag and drop files
- Click to browse and select files
- Upload multiple files at once

## Serving files

Media files are served through the `/files/*` route:

```
GET /files/{object-key}
```

For example:
```
http://localhost:8787/files/uploads/2024/photo.jpg
```

### Caching

Media responses are cached at the edge using the **Cache API**:

- First request fetches from R2 and caches the response
- Subsequent requests are served from the edge cache
- Cache headers: `public, max-age=31536000, s-maxage=31536000, immutable`
- CORS headers are set automatically (`Access-Control-Allow-Origin: *`)

> [!NOTE]
> The Cache API only works on custom domains. On `*.workers.dev` URLs and in local development, every request hits R2 directly. This is a Cloudflare platform limitation, not a bug.

## Custom domain

For production, you can serve media from a custom domain. Flare CMS is configured to use:

```
images.flarecms.dev
```

Set the `MEDIA_DOMAIN` environment variable in `wrangler.toml`:

```toml
[vars]
MEDIA_DOMAIN = "images.flarecms.dev"
```

When set, media URLs in API responses will use the custom domain instead of the worker URL.

## Image metadata

When you upload an image, Flare CMS extracts metadata:

| Field | Description |
|---|---|
| `filename` | Original filename |
| `mimeType` | MIME type (e.g., `image/jpeg`) |
| `size` | File size in bytes |
| `width` | Image width in pixels |
| `height` | Image height in pixels |

This metadata is stored in the `media` table and returned in API responses.

## Virtual folders

Media can be organized into **virtual folders**. These aren't actual filesystem directories — they're prefixes on the R2 object key:

```
uploads/
  blog/
    hero-image.jpg
    thumbnail.png
  team/
    headshot.jpg
```

The admin UI shows these as a folder tree for easy browsing.

## Media API endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/media` | List all media files |
| `POST` | `/api/media` | Upload a new file |
| `GET` | `/api/media/{id}` | Get media metadata |
| `DELETE` | `/api/media/{id}` | Delete a media file |
| `GET` | `/files/{key}` | Serve a media file (public) |

### List media

```bash
curl http://localhost:8787/api/media \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:

```json
{
  "data": [
    {
      "id": "media-123",
      "filename": "hero.jpg",
      "mimeType": "image/jpeg",
      "size": 245000,
      "width": 1920,
      "height": 1080,
      "url": "/files/uploads/hero.jpg",
      "createdAt": 1709856000000
    }
  ]
}
```

## R2 binding configuration

The R2 bucket is configured in `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "my-astro-cms-media"
```

> [!TIP]
> During local development, `wrangler dev` creates a local R2 emulation. Files uploaded locally are stored in `.wrangler/state/` and won't appear in your production R2 bucket.
