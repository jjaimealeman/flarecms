---
title: Filtering & Pagination
slug: filtering
excerpt: Query parameters for filtering, sorting, and paginating content responses.
section: api-reference
order: 2
status: published
---

## Query Parameters

Both `/api/content` and `/api/collections/:name/content` support the same query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | `50` | Maximum items to return (max: 1000) |
| `offset` | integer | `0` | Number of items to skip |
| `status` | string | -- | Filter by status: `draft`, `published`, or `archived` |
| `collection` | string | -- | Filter by collection name (only on `/api/content`) |

## Basic Filtering

### Filter by status

```bash
# Get only published content
curl "http://localhost:8787/api/content?status=published"

# Get drafts
curl "http://localhost:8787/api/content?status=draft"
```

### Filter by collection

```bash
# Get content from a specific collection
curl "http://localhost:8787/api/content?collection=blog-posts"

# Or use the collection-specific endpoint (preferred)
curl "http://localhost:8787/api/collections/blog-posts/content"
```

## Pagination

Use `limit` and `offset` together to paginate through results.

```typescript
const PAGE_SIZE = 10

async function getPage(page: number) {
  const offset = (page - 1) * PAGE_SIZE
  const response = await fetch(
    `http://localhost:8787/api/collections/blog-posts/content?limit=${PAGE_SIZE}&offset=${offset}&status=published`
  )
  const { data, meta } = await response.json()

  return {
    items: data,
    total: meta.count,
    page,
    hasMore: data.length === PAGE_SIZE,
  }
}

// Fetch page 1
const page1 = await getPage(1)
console.log(`Showing ${page1.items.length} of ${page1.total} items`)
```

The `meta.count` field tells you how many items matched in the current response. To build full pagination, you'll need to fetch until `data.length < limit`.

## Sorting

Content is sorted by `created_at` descending by default (newest first). The sorting behavior is built into the query builder and currently not configurable via query parameters.

> [!WARNING]
> **Known issue:** Advanced filters (field-level operators like `equals`, `contains`, `gt`, `lt`) are currently broken and return unreliable results. The query filter builder has bugs that produce incorrect SQL in certain conditions. **Use client-side filtering instead.**

## Client-Side Filtering Workaround

Since advanced server-side filters are unreliable, the recommended approach is to fetch all content and filter in your application code:

```typescript
// Fetch all published content from a collection
const response = await fetch(
  'http://localhost:8787/api/collections/blog-posts/content?status=published&limit=1000'
)
const { data } = await response.json()

// Filter client-side
const featured = data.filter(post => post.data.featured === true)
const recent = data
  .sort((a, b) => b.created_at - a.created_at)
  .slice(0, 5)

// Search by field value
const byAuthor = data.filter(
  post => post.data.author === 'Jane Doe'
)

// Sort by a custom field
const byTitle = [...data].sort((a, b) =>
  a.title.localeCompare(b.title)
)
```

This pattern works well for most sites because:

1. Cloudflare Workers + D1 are fast enough that fetching 100-500 items takes <50ms
2. Client-side filtering gives you full control over logic
3. The cache plugin keeps responses fast after the first request

For very large collections (1000+ items), use pagination to fetch in batches:

```typescript
async function fetchAll(collection: string) {
  const items = []
  let offset = 0
  const limit = 200

  while (true) {
    const response = await fetch(
      `http://localhost:8787/api/collections/${collection}/content?status=published&limit=${limit}&offset=${offset}`
    )
    const { data } = await response.json()
    items.push(...data)

    if (data.length < limit) break
    offset += limit
  }

  return items
}
```

## Combining Parameters

Parameters can be combined freely:

```bash
# Published blog posts, page 2
curl "http://localhost:8787/api/collections/blog-posts/content?status=published&limit=10&offset=10"

# All content from any collection, newest 5
curl "http://localhost:8787/api/content?limit=5"

# Drafts from docs collection
curl "http://localhost:8787/api/collections/docs/content?status=draft&limit=100"
```

## Response Metadata

Every response includes metadata that helps with pagination and debugging:

```json
{
  "data": [...],
  "meta": {
    "count": 10,
    "timestamp": "2026-03-08T12:00:00.000Z",
    "filter": {
      "limit": 10,
      "offset": 0,
      "where": {
        "and": [
          { "field": "collection_id", "operator": "equals", "value": "..." }
        ]
      }
    },
    "query": {
      "sql": "SELECT * FROM content WHERE collection_id = ? LIMIT 10 OFFSET 0",
      "params": ["collection-uuid"]
    },
    "cache": { "hit": false, "source": "database" },
    "timing": { "total": 32, "execution": 15, "unit": "ms" }
  }
}
```

The `meta.query` field shows you the exact SQL that ran -- handy for debugging.
