---
title: Building Plugins
slug: building-plugins
excerpt: Step-by-step guide to building a custom Flare CMS plugin using the PluginBuilder SDK.
section: plugins
order: 3
status: published
---

## Overview

The `PluginBuilder` SDK provides a fluent API for creating Flare CMS plugins. Instead of manually constructing a `Plugin` object, you chain method calls to declare routes, hooks, middleware, models, admin pages, and lifecycle callbacks. The SDK is exported from `@flare-cms/core`.

> **Note:** The PluginBuilder SDK is currently in beta. The API may change in future releases.

## Quick Start

Here is a minimal plugin that logs a message when content is saved:

```typescript
import { PluginBuilder, HOOKS } from '@flare-cms/core'

const plugin = PluginBuilder.create({
  name: 'content-logger',
  version: '1.0.0',
  description: 'Logs all content save events'
})
  .addHook(HOOKS.CONTENT_SAVE, async (data, context) => {
    context.context.logger?.info(`Content saved: ${data.id}`)
    return data
  })
  .build()

export default plugin
```

## PluginBuilder API Reference

### Creating a Builder

```typescript
const builder = PluginBuilder.create({
  name: 'my-plugin',       // Required: unique identifier
  version: '1.0.0',        // Required: semver version
  description: 'My plugin' // Optional
})
```

### `.metadata(options)`

Add author info, license, compatibility range, and dependencies:

```typescript
builder.metadata({
  author: {
    name: 'Your Name',
    email: 'you@example.com',
    url: 'https://example.com'
  },
  license: 'MIT',
  compatibility: '^1.0.0',
  dependencies: ['core-auth']
})
```

### `.addRoute(path, handler, options?)`

Mount a Hono sub-application at a path:

```typescript
import { Hono } from 'hono'

const api = new Hono()
api.get('/', (c) => c.json({ status: 'ok' }))
api.post('/', (c) => c.json({ created: true }))

builder.addRoute('/api/my-plugin', api, {
  requiresAuth: true,
  roles: ['admin'],
  description: 'My plugin API'
})
```

### `.addHook(name, handler, options?)`

Register a handler for a hook event:

```typescript
builder.addHook(HOOKS.CONTENT_CREATE, async (data, context) => {
  // Transform or inspect data
  // Return data to pass to the next handler
  return data
}, {
  priority: 5,  // Lower = runs earlier (default: 10)
  description: 'Validate content before creation'
})
```

### `.addSingleMiddleware(name, handler, options?)`

Add Hono middleware:

```typescript
builder.addSingleMiddleware('request-timer', async (c, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start
  c.header('X-Response-Time', `${duration}ms`)
}, {
  global: true,
  priority: 1
})
```

### `.addModel(name, options)`

Declare a database model with a Zod schema and SQL migration:

```typescript
import { z } from 'zod'

builder.addModel('BookmarkModel', {
  tableName: 'bookmarks',
  schema: z.object({
    url: z.string().url(),
    title: z.string().min(1),
    tags: z.string().optional()
  }),
  migrations: [`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      tags TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `],
  extendsContent: false
})
```

### `.addService(name, implementation, options?)`

Register a service that other plugins can consume:

```typescript
class BookmarkService {
  async getAll(db) { /* ... */ }
  async create(db, data) { /* ... */ }
}

builder.addService('bookmarks', new BookmarkService(), {
  singleton: true,
  description: 'Bookmark CRUD operations'
})
```

### `.addAdminPage(path, title, component, options?)`

Add a page to the admin interface:

```typescript
builder.addAdminPage('/admin/bookmarks', 'Bookmarks', 'BookmarkList', {
  icon: 'bookmark',
  permissions: ['admin']
})
```

### `.addMenuItem(label, path, options?)`

Add an item to the admin navigation menu:

```typescript
builder.addMenuItem('Bookmarks', '/admin/bookmarks', {
  icon: 'bookmark',
  order: 60,
  permissions: ['admin']
})
```

### `.addComponent(name, template, options?)`

Register a UI component template:

```typescript
builder.addComponent('BookmarkCard', (props) => {
  return `<div class="bookmark-card">
    <a href="${props.url}">${props.title}</a>
  </div>`
})
```

### `.lifecycle(hooks)`

Attach lifecycle callbacks for install, uninstall, activate, deactivate, and configure:

```typescript
builder.lifecycle({
  install: async (context) => {
    context.logger.info('Plugin installed')
    // Run migrations, seed data, etc.
  },
  activate: async (context) => {
    context.logger.info('Plugin activated')
    // Register routes on the app instance
    if (context.app) {
      context.app.use('/my-route/*', myMiddleware)
    }
  },
  deactivate: async (context) => {
    context.logger.info('Plugin deactivated')
  },
  uninstall: async (context) => {
    context.logger.info('Plugin uninstalled')
    // Clean up database tables, etc.
  }
})
```

### `.build()`

Finalize and return the `Plugin` object. Throws if `name` or `version` is missing:

```typescript
const plugin = builder.build()
export default plugin
```

## Complete Example: Bookmarks Plugin

Here is a full plugin that adds a bookmarks feature with API routes, content hooks, an admin page, and lifecycle management:

```typescript
import { Hono } from 'hono'
import { z } from 'zod'
import { PluginBuilder, PluginHelpers, HOOKS } from '@flare-cms/core'

// Define the API routes
const api = new Hono()

api.get('/', async (c) => {
  const db = c.env.DB
  const { results } = await db.prepare(
    'SELECT * FROM bookmarks ORDER BY created_at DESC'
  ).all()
  return c.json(results)
})

api.post('/', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  const id = crypto.randomUUID()
  await db.prepare(
    'INSERT INTO bookmarks (id, url, title, tags) VALUES (?, ?, ?, ?)'
  ).bind(id, body.url, body.title, body.tags || null).run()
  return c.json({ id }, 201)
})

api.delete('/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  await db.prepare('DELETE FROM bookmarks WHERE id = ?').bind(id).run()
  return c.json({ deleted: true })
})

// Build the plugin
const bookmarksPlugin = PluginBuilder.create({
  name: 'bookmarks',
  version: '1.0.0',
  description: 'Save and organize bookmarks with tagging'
})
  .metadata({
    author: { name: 'Your Name' },
    license: 'MIT',
    compatibility: '^1.0.0',
    dependencies: ['core-auth']
  })
  .addRoute('/api/bookmarks', api, {
    requiresAuth: true,
    description: 'Bookmarks CRUD API'
  })
  .addModel('Bookmark', {
    tableName: 'bookmarks',
    schema: z.object({
      url: z.string().url(),
      title: z.string().min(1),
      tags: z.string().optional()
    }),
    migrations: [
      PluginHelpers.createMigration('bookmarks', [
        { name: 'id', type: 'TEXT', primaryKey: true },
        { name: 'url', type: 'TEXT' },
        { name: 'title', type: 'TEXT' },
        { name: 'tags', type: 'TEXT', nullable: true }
      ])
    ]
  })
  .addHook(HOOKS.CONTENT_DELETE, async (data, context) => {
    // Clean up bookmarks that reference deleted content
    context.context.logger?.info(
      `Content deleted: ${data.id}, checking related bookmarks`
    )
    return data
  })
  .addAdminPage('/admin/bookmarks', 'Bookmarks', 'BookmarkList', {
    icon: 'bookmark',
    permissions: ['admin']
  })
  .addMenuItem('Bookmarks', '/admin/bookmarks', {
    icon: 'bookmark',
    order: 60
  })
  .lifecycle({
    install: async (ctx) => {
      ctx.logger.info('Bookmarks plugin installed')
    },
    activate: async (ctx) => {
      ctx.logger.info('Bookmarks plugin activated')
    }
  })
  .build()

export default bookmarksPlugin
```

## Helper Utilities

The `PluginHelpers` class provides shortcuts for common patterns:

### `PluginHelpers.createModelAPI(modelName, options?)`

Generates a Hono app with standard REST endpoints (GET list, GET by ID, POST, PUT, DELETE) for a model:

```typescript
const api = PluginHelpers.createModelAPI('Bookmark', {
  basePath: '/bookmarks',
  permissions: {
    read: ['viewer', 'admin'],
    write: ['admin'],
    delete: ['admin']
  }
})
```

### `PluginHelpers.createAdminInterface(modelName, options?)`

Generates admin page and menu item definitions for a model:

```typescript
const { pages, menuItems } = PluginHelpers.createAdminInterface('Bookmark', {
  icon: 'bookmark',
  permissions: ['admin'],
  fields: [
    { name: 'url', type: 'string', label: 'URL', required: true },
    { name: 'title', type: 'string', label: 'Title', required: true }
  ]
})

builder.addAdminPages(pages)
builder.addMenuItems(menuItems)
```

### `PluginHelpers.createMigration(tableName, fields)`

Generates a CREATE TABLE SQL statement with `created_at`/`updated_at` columns and an auto-update trigger:

```typescript
const sql = PluginHelpers.createMigration('bookmarks', [
  { name: 'id', type: 'TEXT', primaryKey: true },
  { name: 'url', type: 'TEXT' },
  { name: 'title', type: 'TEXT' },
  { name: 'tags', type: 'TEXT', nullable: true }
])
```

### `PluginHelpers.createSchema(fields)`

Generates a Zod validation schema from a field definition array:

```typescript
const schema = PluginHelpers.createSchema([
  { name: 'url', type: 'string', validation: { url: true } },
  { name: 'title', type: 'string', validation: { min: 1, max: 200 } },
  { name: 'tags', type: 'string', optional: true }
])
```

## Plugin Templates

The `PluginTemplates` class provides pre-built plugin patterns:

### `PluginTemplates.contentType(name, fields)`

Creates a complete content type plugin with model, API routes, and admin interface:

```typescript
import { PluginTemplates } from '@flare-cms/core'

const faqPlugin = PluginTemplates.contentType('FAQ', [
  { name: 'question', type: 'string', label: 'Question', required: true },
  { name: 'answer', type: 'string', label: 'Answer', required: true },
  { name: 'category', type: 'string', label: 'Category' }
])
```

### `PluginTemplates.analytics(name, options?)`

Creates an analytics plugin with request tracking middleware and optional dashboard:

```typescript
const myAnalytics = PluginTemplates.analytics('page-views', {
  dashboard: true
})
```

## Plugin Manifest

Plugins can include a `manifest.json` file for metadata and settings definitions. This is used by the admin plugin settings UI to render configuration forms automatically:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "A custom plugin",
  "author": "Your Name",
  "category": "content",
  "tags": ["custom", "content"],
  "dependencies": [],
  "settings": {
    "apiKey": {
      "type": "string",
      "label": "API Key",
      "description": "External service API key",
      "default": ""
    },
    "maxItems": {
      "type": "number",
      "label": "Max Items",
      "default": 100,
      "min": 1,
      "max": 1000
    },
    "enabled": {
      "type": "boolean",
      "label": "Enable Feature",
      "default": true
    }
  }
}
```

Settings types supported: `string`, `number`, `boolean`, `select` (with `options` array).

## Best Practices

1. **Always declare dependencies** -- if your plugin needs another plugin, list it in `dependencies` so the registry can resolve load order
2. **Use scoped hooks** -- the `PluginContext.hooks` property is already scoped to your plugin, so cleanup is automatic on uninstall
3. **Set priority deliberately** -- default priority is 10; use lower numbers for hooks that must run first (validation) and higher numbers for hooks that run after (logging)
4. **Handle errors in hooks** -- the hook system catches non-critical errors and continues executing; throw errors with "CRITICAL" in the message to halt the chain
5. **Use the logger** -- `context.logger.info()` prefixes messages with `[Plugin:name]` for easy debugging
6. **Keep migrations idempotent** -- use `CREATE TABLE IF NOT EXISTS` and `CREATE TRIGGER IF NOT EXISTS`

## Next Steps

- See [Plugin System](/docs/plugins/plugin-system) for the full hook types reference and architecture details
- See [Core Plugins](/docs/plugins/core-plugins) for examples of production plugins built with PluginBuilder
