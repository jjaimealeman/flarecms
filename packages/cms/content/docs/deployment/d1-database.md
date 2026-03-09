---
title: D1 Database
slug: d1-database
excerpt: D1 creation, Drizzle ORM migrations, local vs remote databases, and backup strategies.
section: deployment
order: 2
status: published
---

## What Is D1?

D1 is Cloudflare's serverless SQLite database. It runs on Cloudflare's network alongside your Worker, providing low-latency database access without managing database servers. Flare CMS uses D1 as its primary data store for content, users, collections, and plugin data.

## Database Setup

### Creating a D1 Database

```bash
npx wrangler d1 create my-astro-cms-db
```

This outputs a database ID. Update it in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-astro-cms-db"
database_id = "your-database-id-here"
```

The `binding = "DB"` makes the database available as `c.env.DB` in your Worker code.

### Separate Databases per Environment

For staging, create a separate database:

```bash
npx wrangler d1 create my-astro-cms-db-staging
```

Then configure it in the staging environment section of `wrangler.toml`:

```toml
[[env.staging.d1_databases]]
binding = "DB"
database_name = "my-astro-cms-db-staging"
database_id = "your-staging-database-id"
```

## Migrations

Flare CMS uses Drizzle ORM for schema management. Migrations are bundled in the `@flare-cms/core` package.

### Migration Location

Migrations are stored at:

```
packages/core/migrations/
```

And referenced in `wrangler.toml` via the installed package:

```toml
[[d1_databases]]
migrations_dir = "./node_modules/@flare-cms/core/migrations"
```

### Applying Migrations

**To your remote (production) database:**

```bash
npx wrangler d1 migrations apply my-astro-cms-db
```

**To a specific environment:**

```bash
npx wrangler d1 migrations apply my-astro-cms-db-staging --env staging
```

**To your local database:**

```bash
npx wrangler d1 migrations apply my-astro-cms-db --local
```

### Listing Applied Migrations

```bash
npx wrangler d1 migrations list my-astro-cms-db
```

## Local vs Remote

### Local Development

When running `wrangler dev`, D1 uses a local SQLite file stored in `.wrangler/state/`. This means:

- No network latency
- Data persists between `wrangler dev` restarts
- Complete isolation from production data
- Migrations still need to be applied with `--local`

### Remote (Production)

The production D1 database runs on Cloudflare's edge network. It uses SQLite under the hood but is distributed and managed by Cloudflare. Key characteristics:

- **Read replicas** are distributed globally for low-latency reads
- **Writes** go to a primary location
- **Storage limit:** 10 GB per database (Workers Paid plan)
- **Row size limit:** 1 MB per row

## Database Schema

Flare CMS creates these core tables:

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, password hash, role) |
| `collections` | Content collection definitions |
| `content` | Content entries for all collections |
| `content_versions` | Content version history |
| `workflow_history` | Workflow state transitions |
| `api_tokens` | API authentication tokens |
| `form_submissions` | Public form submission data |
| `email_templates` | Email template definitions |

### Important Rules

- **Use SQL `NULL`** for nullable foreign key columns. Never use the string `'null'`.
- **Deletion order** for cascading deletes: `content_versions` -> `workflow_history` -> `content` -> `collections`
- **SQLite types:** D1 uses SQLite's type system (TEXT, INTEGER, REAL, BLOB). Drizzle maps JavaScript types automatically.

## Querying D1 in Workers

In your Worker code, access D1 through the environment binding:

```typescript
// In a Hono route handler
app.get('/api/example', async (c) => {
  const db = c.env.DB

  // Prepared statement (recommended -- prevents SQL injection)
  const { results } = await db.prepare(
    'SELECT * FROM content WHERE collection_id = ?'
  ).bind(collectionId).all()

  return c.json(results)
})
```

Always use prepared statements with `.bind()` to prevent SQL injection.

## Backups

### Manual Backup

Export your database to a SQL file:

```bash
npx wrangler d1 export my-astro-cms-db --output backup.sql
```

### Restore from Backup

```bash
npx wrangler d1 execute my-astro-cms-db --file backup.sql
```

### Time Travel

D1 supports point-in-time recovery (Time Travel) on the Workers Paid plan. You can restore your database to any point in the last 30 days through the Cloudflare dashboard.

## Performance Tips

1. **Add indexes** for columns you frequently query or filter on
2. **Batch writes** when inserting multiple rows -- D1 supports batch API:
   ```typescript
   await db.batch([
     db.prepare('INSERT INTO ...').bind(...),
     db.prepare('INSERT INTO ...').bind(...),
   ])
   ```
3. **Keep row sizes small** -- large text/blob columns can impact performance
4. **Use the `--local` flag** during development to avoid hitting the remote database

## Next Steps

- See [R2 Storage](/docs/deployment/r2-storage) for media file configuration
- See [Wrangler Configuration](/docs/deployment/wrangler-config) for all database binding options
- See [CI/CD](/docs/deployment/ci-cd) for automated migration deployments
