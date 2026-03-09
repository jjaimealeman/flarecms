---
title: R2 Storage
slug: r2-storage
excerpt: R2 bucket creation, media uploads, custom domain setup, and local development behavior.
section: deployment
order: 3
status: published
---

## What Is R2?

R2 is Cloudflare's S3-compatible object storage. Flare CMS uses R2 to store media files (images, documents, videos) uploaded through the admin UI. R2 has no egress fees, making it cost-effective for serving media assets.

## Bucket Setup

### Creating an R2 Bucket

```bash
npx wrangler r2 bucket create my-astro-cms-media
```

The bucket is configured in `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "my-astro-cms-media"
```

The `binding = "MEDIA_BUCKET"` makes the bucket available as `c.env.MEDIA_BUCKET` in your Worker code.

### Bucket Per Environment

All environments in the default Flare CMS configuration share the same R2 bucket (`my-astro-cms-media`). This simplifies media management -- files uploaded in staging are available in production.

If you need isolated buckets per environment, create separate buckets and configure them:

```toml
[[env.staging.r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "my-astro-cms-media-staging"
```

## Custom Domain for Media

Flare CMS is configured to serve media through a custom domain for clean URLs and CDN caching.

### Setup

1. In the Cloudflare dashboard, go to **R2** > **my-astro-cms-media** > **Settings** > **Public access**
2. Enable **Custom domain** and add your domain (e.g., `images.flarecms.dev`)
3. Cloudflare will automatically configure the DNS record

### Configuration

Set the `MEDIA_DOMAIN` environment variable in `wrangler.toml`:

```toml
[vars]
MEDIA_DOMAIN = "images.flarecms.dev"
```

The CMS uses this domain to generate public URLs for uploaded media. For example, a file uploaded as `uploads/photo.jpg` would be accessible at `https://images.flarecms.dev/uploads/photo.jpg`.

### Without a Custom Domain

If you don't configure a custom domain, media files are still accessible through the R2 public URL or via your Worker's media API endpoints.

## Uploading Files

The core media plugin handles file uploads through the admin UI and API:

```typescript
// Upload via API
const formData = new FormData()
formData.append('file', fileBlob, 'photo.jpg')

const response = await fetch('/api/media/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>'
  },
  body: formData
})
```

Files are stored in R2 with their original filename under the `uploads/` prefix. The media plugin tracks metadata (filename, content type, size, upload date) in the D1 database.

## R2 API in Workers

Access R2 through the environment binding:

```typescript
// Put an object
await c.env.MEDIA_BUCKET.put('uploads/photo.jpg', fileBuffer, {
  httpMetadata: {
    contentType: 'image/jpeg'
  }
})

// Get an object
const object = await c.env.MEDIA_BUCKET.get('uploads/photo.jpg')
if (object) {
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream'
    }
  })
}

// Delete an object
await c.env.MEDIA_BUCKET.delete('uploads/photo.jpg')

// List objects
const listed = await c.env.MEDIA_BUCKET.list({ prefix: 'uploads/' })
```

## Local Development

When running `wrangler dev`, R2 uses a local directory (`.wrangler/state/r2/`) to simulate bucket storage:

- Files are stored as regular files on your filesystem
- The R2 API behaves identically to production
- Data persists between `wrangler dev` restarts

Note that local R2 does not support custom domains. Media URLs in local development point to `localhost:8787/api/media/*`.

## Storage Limits and Pricing

| Feature | Free Tier | Workers Paid |
|---------|-----------|-------------|
| Storage | 10 GB | 10 GB included, $0.015/GB-month after |
| Class A operations (write) | 1M/month | 1M included, $4.50/M after |
| Class B operations (read) | 10M/month | 10M included, $0.36/M after |
| Egress | Free | Free (always) |

R2 never charges for data egress (bandwidth), which makes it significantly cheaper than S3 or GCS for serving media.

## Next Steps

- See [Wrangler Configuration](/docs/deployment/wrangler-config) for all R2 binding options
- See [Cloudflare Workers](/docs/deployment/cloudflare-workers) for deployment overview
- See [D1 Database](/docs/deployment/d1-database) for database configuration
