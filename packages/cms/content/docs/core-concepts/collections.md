---
title: Collections
slug: collections
excerpt: Define typed content schemas with collections — the building blocks of your CMS content model.
section: core-concepts
order: 2
status: published
---

## What are collections?

A **collection** is a content type definition. Think of it like a database table schema, but described in TypeScript. Each collection defines:

- What fields the content has (title, body, image, etc.)
- What types those fields are (string, richtext, media, etc.)
- Which fields appear in the admin list view
- Which fields are searchable

Collections are defined as TypeScript files in `packages/cms/src/collections/` and are automatically synced to the database on startup.

## Defining a collection

Here's a complete collection definition:

```typescript
import type { CollectionConfig } from '@flare-cms/core'

export default {
  name: 'blog-posts',
  displayName: 'Blog Posts',
  description: 'Manage your blog posts',
  icon: '📝',

  schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Title',
        required: true,
        maxLength: 200
      },
      slug: {
        type: 'slug',
        title: 'URL Slug',
        required: true,
        maxLength: 200
      },
      excerpt: {
        type: 'textarea',
        title: 'Excerpt',
        maxLength: 500,
        helpText: 'A short summary of the post'
      },
      content: {
        type: 'quill',
        title: 'Content',
        required: true
      },
      featuredImage: {
        type: 'media',
        title: 'Featured Image'
      },
      author: {
        type: 'string',
        title: 'Author',
        required: true
      },
      publishedAt: {
        type: 'datetime',
        title: 'Published Date'
      },
      status: {
        type: 'select',
        title: 'Status',
        enum: ['draft', 'published', 'archived'],
        enumLabels: ['Draft', 'Published', 'Archived'],
        default: 'draft'
      },
      tags: {
        type: 'string',
        title: 'Tags',
        helpText: 'Comma-separated tags'
      }
    },
    required: ['title', 'slug', 'content', 'author']
  },

  listFields: ['title', 'author', 'status', 'publishedAt'],
  searchFields: ['title', 'excerpt', 'author'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'desc'
} satisfies CollectionConfig
```

## CollectionConfig interface

| Property | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Machine name, kebab-case (e.g., `blog-posts`) |
| `displayName` | `string` | Yes | Human-readable name for the admin UI |
| `description` | `string` | No | Optional description |
| `icon` | `string` | No | Emoji or icon name for the admin sidebar |
| `color` | `string` | No | Hex color for the admin UI |
| `schema` | `CollectionSchema` | Yes | Field definitions (see below) |
| `managed` | `boolean` | No | If `true`, can't be edited in the UI (default: `true` for config-based) |
| `isActive` | `boolean` | No | Enable/disable the collection (default: `true`) |
| `listFields` | `string[]` | No | Fields shown in the admin list view |
| `searchFields` | `string[]` | No | Fields included in search |
| `defaultSort` | `string` | No | Default sort field |
| `defaultSortOrder` | `'asc' \| 'desc'` | No | Default sort direction |
| `metadata` | `Record<string, any>` | No | Arbitrary metadata |

## Schema definition

The `schema` property uses a JSON Schema-like format:

```typescript
schema: {
  type: 'object',
  properties: {
    fieldName: {
      type: 'string',      // FieldType
      title: 'Field Name', // Label in admin UI
      required: true,      // Validation
      // ...more options
    }
  },
  required: ['fieldName']  // Array of required field names
}
```

## Field types

Flare CMS supports 23 field types through the `FieldType` union:

### Text fields

| Type | Description | Use Case |
|---|---|---|
| `string` | Single-line text input | Titles, names, short text |
| `textarea` | Multi-line text input | Excerpts, descriptions |
| `slug` | URL-safe string (auto-generated) | URL paths |
| `email` | Email address with validation | Contact fields |
| `url` | URL with validation | Links, external references |

### Rich content

| Type | Description | Use Case |
|---|---|---|
| `richtext` | Basic rich text editor | Simple formatted content |
| `markdown` | Markdown editor | Technical content |
| `quill` | Quill rich text editor | Blog posts, articles |
| `tinymce` | TinyMCE editor | Complex content editing |
| `mdxeditor` | MDX editor | Documentation, interactive content |

### Data types

| Type | Description | Use Case |
|---|---|---|
| `number` | Numeric input | Prices, quantities, ratings |
| `boolean` | True/false toggle | Flags, toggles |
| `date` | Date picker (no time) | Birth dates, deadlines |
| `datetime` | Date and time picker | Publish dates, events |
| `json` | Raw JSON editor | Structured data, config |

### Selection fields

| Type | Description | Use Case |
|---|---|---|
| `select` | Single-choice dropdown | Status, category |
| `multiselect` | Multiple-choice dropdown | Tags, categories |
| `checkbox` | Checkbox input | Agreement, opt-in |
| `radio` | Radio button group | Exclusive choices |
| `color` | Color picker | Theme colors, branding |

### Relational fields

| Type | Description | Use Case |
|---|---|---|
| `reference` | Link to another collection entry | Author, category |
| `media` | Link to uploaded media | Images, files |
| `file` | File upload field | Documents, downloads |

### Composite fields

| Type | Description | Use Case |
|---|---|---|
| `array` | List of items | Repeated elements |
| `object` | Nested object | Grouped fields |

> [!NOTE]
> The `select` field type has a known issue: the `default` value in the field config is ignored by the admin UI. The field will always start empty regardless of what you set as the default.

## FieldConfig options

Each field can have these configuration options:

```typescript
interface FieldConfig {
  type: FieldType           // Required — the field type
  title?: string            // Label in the admin UI
  description?: string      // Help text below the field
  required?: boolean        // Is the field required?
  default?: any             // Default value
  placeholder?: string      // Placeholder text
  helpText?: string         // Additional help text

  // Validation
  min?: number              // Minimum value (numbers) or min length
  max?: number              // Maximum value (numbers) or max length
  minLength?: number        // Minimum string length
  maxLength?: number        // Maximum string length
  pattern?: string          // Regex pattern for validation

  // Selection options (select, radio, multiselect)
  enum?: string[]           // Available options
  enumLabels?: string[]     // Display labels for options

  // Reference fields
  collection?: string | string[]  // Target collection(s)

  // Composite fields (array, object)
  items?: FieldConfig             // Schema for array items
  properties?: Record<string, FieldConfig>  // Schema for nested object
  blocks?: BlockDefinitions       // Block definitions for structured content
  discriminator?: string          // Discriminator field for blocks

  // UI hints
  format?: string           // Display format hint
  widget?: string           // Custom widget identifier

  // Conditional display
  dependsOn?: string        // Show only when this field has a value
  showWhen?: any            // Show only when dependsOn equals this value
}
```

## Registering collections

Collections must be registered before creating the app:

```typescript
import { registerCollections } from '@flare-cms/core'
import blogPostsCollection from './collections/blog-posts.collection'
import productsCollection from './collections/products.collection'

// Register in order — parent collections before children
registerCollections([
  blogPostsCollection,
  productsCollection,
])
```

> [!WARNING]
> Collection registration order matters. If a collection has `reference` fields pointing to another collection, register the referenced collection first.

## Auto-sync

When `autoSync: true` is set in the `FlareConfig`, collections are automatically synced to the database on the first request after a cold start. This means:

1. **New collections** are created in the `collections` table
2. **Changed collections** have their schema updated
3. **Removed collections** are cleaned up (if `cleanupRemovedCollections` runs)

The sync happens in the bootstrap middleware and only runs once per Worker isolate.

```typescript
const config: FlareConfig = {
  collections: {
    autoSync: true  // Enable automatic collection sync
  }
}
```

## File naming convention

Collection files follow the pattern `{name}.collection.ts` and live in `packages/cms/src/collections/`:

```
src/collections/
├── blog-posts.collection.ts
├── products.collection.ts
└── team-members.collection.ts
```

The file name should match the collection `name` property (both kebab-case).
