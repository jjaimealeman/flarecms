---
title: Quickstart
slug: quickstart
excerpt: Go from zero to a running Flare CMS instance in under 5 minutes.
section: getting-started
order: 1
status: published
---

## Prerequisites

Before you start, make sure you have these installed:

- **Node.js 18+** — [download here](https://nodejs.org/)
- **pnpm** — install with `npm install -g pnpm`
- **Wrangler CLI** — install with `npm install -g wrangler`

> [!TIP]
> Already have Node.js? Check your version with `node -v`. Flare CMS requires v18 or higher.

## 1. Clone the repo

```bash
git clone https://github.com/jjaimealeman/flarecms.git
cd flarecms
```

## 2. Install dependencies

```bash tab="pnpm"
pnpm install
```

```bash tab="npm"
npm install
```

```bash tab="yarn"
yarn install
```

## 3. Build the core package

The CMS backend depends on `@flare-cms/core`, so you need to build it first:

```bash
pnpm build
```

This runs `tsup` in `packages/core/` and produces the compiled output that the CMS package imports.

## 4. Set up the local database

Run D1 migrations to create the database schema locally:

```bash
cd packages/cms
pnpm run db:migrate:local
```

Then seed an admin user:

```bash
pnpm run seed
```

## 5. Set the JWT secret

Flare CMS requires a `JWT_SECRET` for authentication. For local development, create a `.dev.vars` file in `packages/cms/`:

```bash
echo 'JWT_SECRET=my-local-dev-secret-change-in-production' > .dev.vars
```

> [!WARNING]
> Never use this secret in production. Use `wrangler secret put JWT_SECRET` for deployed environments.

## 6. Start the dev server

```bash
wrangler dev
```

Visit [http://localhost:8787/admin](http://localhost:8787/admin) in your browser. You should see the Flare CMS admin login page.

Log in with the credentials from the seed script and you're in.

## 7. Create your first content

1. Click **Collections** in the admin sidebar
2. Pick a collection (like **Blog Posts**)
3. Click **New** to create an entry
4. Fill in the fields and hit **Save**

That's it. Your content is stored in D1 and available via the REST API at `/api/content/{collection-name}`.

## What's next?

- **[Installation](/docs/getting-started/installation)** — detailed setup for local dev and production
- **[Project Structure](/docs/getting-started/project-structure)** — understand the monorepo layout
- **[Collections](/docs/core-concepts/collections)** — define your own content schemas
- **[Architecture](/docs/core-concepts/architecture)** — how Flare CMS works under the hood
