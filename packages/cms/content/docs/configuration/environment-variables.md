---
title: Environment Variables
slug: environment-variables
excerpt: Complete reference for all environment variables used by Flare CMS.
section: configuration
order: 1
status: published
---

## Overview

Flare CMS uses environment variables for configuration that varies between environments (local dev, staging, production). Variables are set in `wrangler.toml` under `[vars]` for non-sensitive values, or via `wrangler secret put` for secrets.

## Variable reference

### Core variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `ENVIRONMENT` | `string` | `"development"` | Current environment: `development`, `staging`, or `production` |
| `CORS_ORIGINS` | `string` | — | Comma-separated allowed origins for CORS headers |
| `MEDIA_DOMAIN` | `string` | — | Custom domain for media URLs (e.g., `images.flarecms.dev`) |

### Authentication

| Variable | Type | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | `string` | **Required** | Secret key for signing JWT tokens. Must be set — app refuses to start without it |

> [!WARNING]
> `JWT_SECRET` is the most important variable. The CMS will return a 500 error on every request if it's missing or set to the hardcoded default. For local dev, put it in `.dev.vars`. For production, use `wrangler secret put JWT_SECRET`.

### Webhooks

| Variable | Type | Default | Description |
|---|---|---|---|
| `WEBHOOK_URLS` | `string` | `""` | Comma-separated URLs to POST on content publish/unpublish events |
| `WEBHOOK_SECRET` | `string` | `""` | Shared secret for HMAC-SHA256 webhook signatures |

When `WEBHOOK_URLS` is empty, webhooks are disabled. When `WEBHOOK_SECRET` is empty, webhooks are sent unsigned (a warning is logged).

### Email (optional)

| Variable | Type | Default | Description |
|---|---|---|---|
| `SENDGRID_API_KEY` | `string` | — | SendGrid API key for transactional email |
| `DEFAULT_FROM_EMAIL` | `string` | — | Default sender email address |

### Media (optional)

| Variable | Type | Default | Description |
|---|---|---|---|
| `IMAGES_ACCOUNT_ID` | `string` | — | Cloudflare Images account ID (if using Cloudflare Images) |
| `IMAGES_API_TOKEN` | `string` | — | Cloudflare Images API token |
| `BUCKET_NAME` | `string` | — | Override R2 bucket name |

### Other (optional)

| Variable | Type | Default | Description |
|---|---|---|---|
| `GOOGLE_MAPS_API_KEY` | `string` | — | Google Maps API key (for location fields) |

## Setting variables

### Local development (`.dev.vars`)

For local development, create a `.dev.vars` file in `packages/cms/`:

```
JWT_SECRET=my-local-dev-secret-change-in-production
SENDGRID_API_KEY=SG.xxxx
```

> [!NOTE]
> `.dev.vars` is gitignored by default. Never commit secrets to version control.

### Non-secret variables (`wrangler.toml`)

Non-sensitive configuration goes in the `[vars]` section of `wrangler.toml`:

```toml
[vars]
ENVIRONMENT = "development"
CORS_ORIGINS = "http://localhost:4321,http://localhost:8787"
MEDIA_DOMAIN = "images.flarecms.dev"
WEBHOOK_URLS = ""
WEBHOOK_SECRET = ""
```

### Production secrets (`wrangler secret`)

For production, use Wrangler to set secrets securely:

```bash
wrangler secret put JWT_SECRET --env production
wrangler secret put WEBHOOK_SECRET --env production
wrangler secret put SENDGRID_API_KEY --env production
```

Secrets are encrypted at rest and only available to your Worker at runtime.

## Per-environment configuration

`wrangler.toml` supports environment-specific overrides:

```toml
# Default (local development)
[vars]
ENVIRONMENT = "development"
CORS_ORIGINS = "http://localhost:4321,http://localhost:8787"

# Production
[env.production]
name = "flare-cms"
vars = {
  ENVIRONMENT = "production",
  CORS_ORIGINS = "https://flare-site.pages.dev"
}

# Staging
[env.staging]
name = "flare-cms-staging"
vars = {
  ENVIRONMENT = "staging",
  CORS_ORIGINS = "http://localhost:4321,http://localhost:8787"
}
```

Deploy to a specific environment:

```bash
wrangler deploy --env production
wrangler deploy --env staging
```

## Accessing variables in code

In your Worker code, environment variables are available on the `c.env` object (Hono context):

```typescript
app.get('/example', (c) => {
  const environment = c.env.ENVIRONMENT    // "development"
  const corsOrigins = c.env.CORS_ORIGINS   // "http://localhost:4321,..."
  const jwtSecret = c.env.JWT_SECRET       // your secret
  const mediaDomain = c.env.MEDIA_DOMAIN   // "images.flarecms.dev"

  return c.json({ environment })
})
```

> [!TIP]
> The `Bindings` interface in `packages/core/src/app.ts` defines the TypeScript types for all available environment variables and bindings. If you add a new variable, add it to this interface for type safety.
