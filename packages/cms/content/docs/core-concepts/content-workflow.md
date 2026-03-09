---
title: Content Workflow
slug: content-workflow
excerpt: Understand the content lifecycle — statuses, transitions, slug locking, versioning, and soft delete.
section: core-concepts
order: 3
status: published
---

## Content lifecycle

Every piece of content in Flare CMS has a **status** that controls its visibility and behavior. Content moves through statuses via defined transitions.

### Statuses

| Status | Description | API visible |
|---|---|---|
| `draft` | Work in progress, not publicly visible | Only with auth |
| `published` | Live and publicly accessible | Yes |
| `archived` | Hidden from public, preserved for reference | Only with auth |

### Status transitions

Not all status changes are allowed. Here's the transition map:

```
          ┌──────────────────────┐
          │                      ▼
       ┌──────┐           ┌──────────┐
       │draft │◄──────────│ archived │
       └──────┘           └──────────┘
          │                      ▲
          │                      │
          ▼                      │
    ┌───────────┐                │
    │ published │────────────────┘
    └───────────┘
```

| From | Allowed transitions |
|---|---|
| `draft` | `published`, `archived` |
| `published` | `draft`, `archived` |
| `archived` | `draft` |

The state machine is defined in `packages/core/src/services/content-state-machine.ts` and enforced by both API routes and admin routes.

> [!WARNING]
> **Known limitation:** While the state machine technically allows `published -> draft` transitions, the admin UI currently only supports forward transitions. Once content is published, you may not be able to unpublish it through the admin interface. Use the API directly if you need to revert to draft status.

## Slug behavior

Every content entry has a `slug` field used for URL-friendly identifiers.

### Slug locking

Once content has been **published at least once** (indicated by a non-null `published_at` timestamp), the slug becomes **locked**. This prevents breaking existing URLs.

```typescript
// Slug is locked if content was ever published
function isSlugLocked(content) {
  return content.published_at !== null
    && content.published_at !== undefined
}
```

- **Draft content**: slug is editable
- **Published content**: slug is locked
- **Unpublished content**: slug remains locked (it was published before)

> [!TIP]
> If you need to change a slug after publishing, you'll need to create a new content entry with the desired slug and archive the old one.

## Scheduled publishing

Flare CMS supports **scheduled publish and unpublish** dates. Set a future date and the content will automatically transition at that time.

| Field | Purpose |
|---|---|
| `scheduled_publish_at` | Automatically publish at this timestamp |
| `scheduled_unpublish_at` | Automatically archive at this timestamp |

The scheduler runs as a **cron trigger** every minute (configured in `wrangler.toml`):

```toml
[triggers]
crons = ["* * * * *"]
```

The `SchedulerService` processes pending scheduled content on each cron invocation:

```typescript
export default {
  fetch: app.fetch.bind(app),
  async scheduled(controller, env, ctx) {
    const scheduler = new SchedulerService(env.DB, env, ctx)
    ctx.waitUntil(scheduler.processScheduledContent())
  },
}
```

## Content versioning

Content entries track version history through the `content_versions` table. Each time content is updated, the previous version can be preserved. This gives you:

- **Audit trail** — who changed what and when
- **Rollback capability** — restore previous versions
- **Change tracking** — see diffs between versions

## Soft delete

When you delete content through the admin UI or API, it's **soft-deleted** — the record is marked as deleted but not removed from the database. This allows:

- **Recovery** — undelete accidentally removed content
- **Audit compliance** — maintain records for regulatory requirements

> [!CAUTION]
> **Known limitation:** Soft-delete does not cascade to related records. If you soft-delete a content entry that other entries reference, those references will point to a deleted record. You'll need to clean up references manually.

## Workflow history

Status changes are logged in the `workflow_history` table, creating an audit trail:

| Field | Description |
|---|---|
| `content_id` | The content entry that changed |
| `from_status` | Previous status |
| `to_status` | New status |
| `changed_by` | User who made the change |
| `changed_at` | Timestamp of the change |

This history is visible in the admin UI and useful for understanding how content evolved over time.

## API examples

### Create content (draft)

```bash
curl -X POST http://localhost:8787/api/content/blog-posts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "title": "My First Post",
      "slug": "my-first-post",
      "content": "<p>Hello world!</p>",
      "author": "Admin"
    }
  }'
```

### Publish content

```bash
curl -X PUT http://localhost:8787/api/content/blog-posts/{id} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": { "status": "published" }
  }'
```

### Soft-delete content

```bash
curl -X DELETE http://localhost:8787/api/content/blog-posts/{id} \
  -H "Authorization: Bearer YOUR_TOKEN"
```
