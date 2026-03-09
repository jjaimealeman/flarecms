---
title: CI/CD Pipeline
slug: ci-cd
excerpt: GitHub Actions workflow for automated builds and deployments to Cloudflare Workers and Pages.
section: deployment
order: 5
status: published
---

## Overview

Flare CMS uses GitHub Actions for continuous deployment. Pushing to the `main` branch automatically builds the core package, deploys the CMS Worker, and deploys the Astro site to Cloudflare Pages -- all in parallel after the core build completes.

## Workflow Architecture

The pipeline has three jobs:

```
push to main
    │
    ▼
┌──────────────┐
│  build-core  │  Build @flare-cms/core, upload artifact
└──────┬───────┘
       │
  ┌────┴────┐
  ▼         ▼
┌──────┐  ┌──────────┐
│deploy│  │deploy-site│  Run in parallel
│-cms  │  │          │
└──────┘  └──────────┘
```

### Job 1: build-core

Builds the `@flare-cms/core` package and uploads the compiled output as a GitHub Actions artifact:

1. Checkout repository
2. Install pnpm and Node.js 20
3. `pnpm install --frozen-lockfile`
4. `pnpm build` (builds all workspace packages)
5. Upload `packages/core/dist/` as the `core-dist` artifact

### Job 2: deploy-cms

Deploys the CMS Worker to Cloudflare (depends on build-core):

1. Checkout repository
2. Install pnpm and Node.js 20
3. `pnpm install --frozen-lockfile`
4. Download the `core-dist` artifact into `packages/core/dist/`
5. Run `npx wrangler deploy --env production` from `packages/cms/`

### Job 3: deploy-site

Builds and deploys the Astro frontend to Cloudflare Pages (depends on build-core):

1. Checkout repository
2. Install pnpm and Node.js 20
3. `pnpm install --frozen-lockfile`
4. Download the `core-dist` artifact into `packages/core/dist/`
5. Build the Astro site with `pnpm run build` (sets `PUBLIC_FLARE_API_URL`)
6. Deploy to Cloudflare Pages with `npx wrangler pages deploy ./dist --project-name flare-site --branch main`

## Required GitHub Secrets

Two secrets must be configured in your GitHub repository settings (Settings > Secrets and variables > Actions):

| Secret | Description | How to get it |
|--------|-------------|---------------|
| `CF_API_TOKEN` | Cloudflare API token with Workers and Pages permissions | [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) > Create Token |
| `CF_ACCOUNT_ID` | Your Cloudflare account ID | Dashboard URL: `dash.cloudflare.com/<account-id>` |

### Creating the API Token

When creating the Cloudflare API token, grant these permissions:

| Permission | Access |
|-----------|--------|
| Account > Cloudflare Workers | Edit |
| Account > Cloudflare Pages | Edit |
| Account > D1 | Edit |
| Account > R2 | Edit |

Optionally scope the token to your specific account to limit exposure.

## Workflow File

The workflow lives at `.github/workflows/deploy.yml`:

```yaml
name: Deploy Flare CMS

on:
  push:
    branches: [main]

jobs:
  build-core:
    name: Build Core
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with:
          name: core-dist
          path: packages/core/dist/

  deploy-cms:
    name: Deploy CMS Worker
    needs: build-core
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with:
          name: core-dist
          path: packages/core/dist/
      - name: Deploy CMS to Cloudflare Workers
        working-directory: packages/cms
        run: npx wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}

  deploy-site:
    name: Deploy Site to Pages
    needs: build-core
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with:
          name: core-dist
          path: packages/core/dist/
      - name: Build Astro site
        working-directory: packages/site
        run: pnpm run build
        env:
          PUBLIC_FLARE_API_URL: https://flare-cms.jjaimealeman.workers.dev
      - name: Deploy to Cloudflare Pages
        working-directory: packages/site
        run: npx wrangler pages deploy ./dist --project-name flare-site --branch main
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
```

## Environment Variables in CI

| Variable | Where Set | Used By |
|----------|-----------|---------|
| `CLOUDFLARE_API_TOKEN` | GitHub Secret `CF_API_TOKEN` | Wrangler (both deploy jobs) |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Secret `CF_ACCOUNT_ID` | Wrangler (both deploy jobs) |
| `PUBLIC_FLARE_API_URL` | Inline in workflow | Astro build (deploy-site job) |

The `PUBLIC_FLARE_API_URL` tells the Astro frontend where the CMS API lives. Update this to match your production Worker URL.

## Deployment Flow

When you push to `main`:

1. **build-core** runs first (~1-2 minutes)
2. **deploy-cms** and **deploy-site** start simultaneously after build-core succeeds
3. CMS Worker is live at `https://flare-cms.your-subdomain.workers.dev`
4. Astro site is live at `https://flare-site.pages.dev`

Total deployment time is typically 2-4 minutes.

## Adding Tests

To add a test step before deployment, insert a test job between build-core and the deploy jobs:

```yaml
test:
  name: Run Tests
  needs: build-core
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - uses: actions/download-artifact@v4
      with:
        name: core-dist
        path: packages/core/dist/
    - run: pnpm test

deploy-cms:
  needs: [build-core, test]  # Now depends on test passing
  # ...

deploy-site:
  needs: [build-core, test]  # Now depends on test passing
  # ...
```

## Database Migrations in CI

The current workflow does not run migrations automatically. To add migration deployment:

```yaml
# Add as a step in deploy-cms, before the deploy step:
- name: Apply D1 Migrations
  working-directory: packages/cms
  run: npx wrangler d1 migrations apply my-astro-cms-db --env production
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
```

Run migrations before deploying the Worker so the database schema is ready when the new code goes live.

## Next Steps

- See [Cloudflare Workers](/docs/deployment/cloudflare-workers) for the initial deployment walkthrough
- See [Wrangler Configuration](/docs/deployment/wrangler-config) for environment and binding setup
- See [D1 Database](/docs/deployment/d1-database) for migration management
