---
title: Collection Builder
slug: collection-builder
excerpt: Create and configure collections through the admin UI with the visual schema builder.
section: admin
order: 3
status: published
---

## Overview

The Collection Builder lets you create and manage content collections through the admin UI. A collection defines the structure (schema) of your content -- think of it like a database table with custom fields.

Navigate to **Admin > Collections** to get started.

## Managed vs Dynamic Collections

Flare CMS has two types of collections:

| Type | Defined In | Editable in UI | Use For |
|------|-----------|----------------|---------|
| **Managed** | Code (`collections/` directory) | No | Core content types (blog, pages) |
| **Dynamic** | Admin UI | Yes | User-created content types |

Managed collections are defined in your codebase using TypeScript and registered at build time. They show up in the admin UI but can't be modified there -- you'd edit the source file instead.

Dynamic collections are created entirely through the admin UI. They're stored in the database and can be modified at any time.

## Creating a Collection

1. Go to **Admin > Collections**
2. Click **Create Collection**
3. Fill in the basics:
   - **Display Name** -- Human-readable name (e.g., "Blog Posts")
   - **Name** -- URL-safe identifier, auto-generated from display name (e.g., `blog-posts`)
   - **Description** -- Optional description of what this collection stores
4. Add fields (see below)
5. Click **Create Collection**

## Adding Fields

Each field has these properties:

| Property | Required | Description |
|----------|----------|-------------|
| **Label** | Yes | Display label in the editor form |
| **Name** | Yes | Field identifier (camelCase) |
| **Type** | Yes | Data type (see field types below) |
| **Required** | No | Whether the field must be filled |
| **Searchable** | No | Include in search index |

### Field Types

| Type | Stores | Editor Widget |
|------|--------|---------------|
| `string` | Short text | Text input |
| `text` | Long text | Textarea |
| `number` | Numeric value | Number input |
| `boolean` | True/false | Toggle switch |
| `select` | One of preset options | Dropdown menu |
| `quill` | Rich HTML content | Quill WYSIWYG editor |
| `tinymce` | Rich HTML content | TinyMCE editor |
| `markdown` | Markdown text | EasyMDE editor |
| `image` | Image URL | Image picker with R2 upload |
| `date` | Timestamp | Date picker |
| `url` | URL string | URL input with validation |
| `email` | Email string | Email input with validation |

### Field Options

Some field types accept additional options:

**Select fields:**
```
Options: Option A, Option B, Option C
```
Enter comma-separated values. These become the dropdown choices.

**Number fields:**
- Min value
- Max value

**String fields:**
- Min length
- Max length
- Pattern (regex validation)

## Editing a Collection

Click on any dynamic collection to edit it. You can:

- Change the display name and description
- Add new fields
- Reorder fields (drag and drop)
- Remove fields
- Change field properties

> [!WARNING]
> Removing a field from a collection doesn't delete the data stored in existing content items. The field data remains in the `data` JSON blob but won't show in the editor form. There's no migration system -- plan your schema carefully.

## Collection Schema Format

Under the hood, collections use a JSON Schema-like format:

```json
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "title": "Title",
      "required": true
    },
    "content": {
      "type": "quill",
      "title": "Content"
    },
    "featuredImage": {
      "type": "image",
      "title": "Featured Image"
    },
    "category": {
      "type": "select",
      "title": "Category",
      "enum": ["tech", "design", "news"]
    }
  },
  "required": ["title"]
}
```

If you prefer code over UI, you can define managed collections in TypeScript:

```typescript
import type { CollectionConfig } from '@flare-cms/core'

export default {
  name: 'blog-posts',
  displayName: 'Blog Posts',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', title: 'Title', required: true },
      content: { type: 'quill', title: 'Content' },
      excerpt: { type: 'text', title: 'Excerpt' },
      featuredImage: { type: 'image', title: 'Featured Image' },
    },
    required: ['title'],
  },
  listFields: ['title', 'status'],
  searchFields: ['title'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'desc',
} satisfies CollectionConfig
```

## List View Configuration

Collections control how items appear in the content list:

- **listFields** -- Which fields to show as columns (default: title, status)
- **searchFields** -- Which fields to search when filtering (default: title)
- **defaultSort** -- Sort field (default: createdAt)
- **defaultSortOrder** -- `asc` or `desc` (default: desc)

These are currently only configurable via code (managed collections).

## Tips

- **Use kebab-case for collection names** -- `blog-posts` not `blogPosts` or `Blog Posts`
- **Use camelCase for field names** -- `featuredImage` not `featured_image` or `FeaturedImage`
- **Keep schemas focused** -- One collection per content type, not one giant collection
- **Required fields prevent empty content** -- Mark essential fields as required
- **Searchable fields slow down large collections** -- Only mark fields you actually search
