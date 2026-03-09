---
title: Settings
slug: settings
excerpt: Configure Flare CMS behavior with the FlareConfig object — collections, plugins, middleware, and more.
section: configuration
order: 3
status: published
---

## Overview

The `FlareConfig` object controls how your Flare CMS application behaves. You pass it to `createFlareApp()` when initializing the app:

```typescript
import { createFlareApp } from '@flare-cms/core'
import type { FlareConfig } from '@flare-cms/core'

const config: FlareConfig = {
  collections: {
    autoSync: true
  },
  plugins: {
    directory: './src/plugins',
    autoLoad: false
  }
}

const app = createFlareApp(config)
```

## FlareConfig reference

```typescript
interface FlareConfig {
  // Collections configuration
  collections?: {
    directory?: string    // Path to collection config files
    autoSync?: boolean    // Auto-sync collections on startup
  }

  // Plugins configuration
  plugins?: {
    directory?: string    // Path to plugin files
    autoLoad?: boolean    // Auto-load plugins from directory
    disableAll?: boolean  // Disable all plugins including core
    instances?: Plugin[]  // Plugin instances to install
  }

  // Custom routes
  routes?: Array<{
    path: string          // Route prefix (e.g., '/api/custom')
    handler: Hono         // Hono sub-app to mount
  }>

  // Custom middleware
  middleware?: {
    beforeAuth?: MiddlewareFn[]  // Runs before auth middleware
    afterAuth?: MiddlewareFn[]   // Runs after auth middleware
  }

  // App metadata
  version?: string       // Custom version string
  name?: string          // App name (default: "Flare CMS")
}
```

## Collections settings

### `collections.autoSync`

**Type:** `boolean`
**Default:** `false`

When `true`, Flare CMS automatically syncs your file-based collection definitions to the database on the first request after a cold start.

```typescript
collections: {
  autoSync: true
}
```

What sync does:
- **Creates** new collections found in registered configs
- **Updates** collections whose schema has changed
- **Reports** sync results (created/updated/unchanged/error)

> [!TIP]
> Always enable `autoSync` unless you're managing collection schemas manually through the admin UI.

### `collections.directory`

**Type:** `string`
**Default:** `undefined`

Path to a directory containing collection config files. This is an alternative to manually importing and registering collections.

```typescript
collections: {
  directory: './src/collections'
}
```

> [!NOTE]
> Most setups use `registerCollections()` with explicit imports instead of directory scanning. The directory option exists for projects with many collections.

## Plugin settings

### `plugins.directory`

**Type:** `string`
**Default:** `undefined`

Path to custom plugin files for auto-loading.

```typescript
plugins: {
  directory: './src/plugins'
}
```

### `plugins.autoLoad`

**Type:** `boolean`
**Default:** `false`

When `true`, automatically loads and activates plugins from the directory.

```typescript
plugins: {
  directory: './src/plugins',
  autoLoad: true
}
```

### `plugins.disableAll`

**Type:** `boolean`
**Default:** `false`

Disables all plugins, including core plugins (cache, database tools, seed data). Useful for debugging or minimal setups.

```typescript
plugins: {
  disableAll: true
}
```

> [!WARNING]
> Disabling all plugins removes core functionality like the cache dashboard and database tools from the admin UI.

### `plugins.instances`

**Type:** `Plugin[]`
**Default:** `undefined`

Pass pre-configured plugin instances directly. These are installed during the bootstrap phase.

```typescript
import { myCustomPlugin } from './plugins/my-plugin'

plugins: {
  instances: [myCustomPlugin()]
}
```

## Custom routes

Mount additional Hono sub-applications at specific paths:

```typescript
import { Hono } from 'hono'

const customApi = new Hono()
customApi.get('/hello', (c) => c.json({ message: 'Hello!' }))

const config: FlareConfig = {
  routes: [
    { path: '/api/custom', handler: customApi }
  ]
}
```

Custom routes are registered **after** all core routes, so they won't override built-in endpoints.

## Custom middleware

Add middleware that runs at specific points in the request chain:

### `middleware.beforeAuth`

Runs **before** the authentication middleware. Use this for:
- Request validation
- Binding checks
- Custom logging
- Rate limiting

```typescript
import { validateBindingsMiddleware } from './middleware/validate-bindings'

middleware: {
  beforeAuth: [validateBindingsMiddleware()]
}
```

### `middleware.afterAuth`

Runs **after** authentication is available. Use this for:
- Permission checks
- User-specific logic
- Request transformation

```typescript
middleware: {
  afterAuth: [
    async (c, next) => {
      console.log('User:', c.get('user')?.email)
      await next()
    }
  ]
}
```

## App metadata

### `version`

**Type:** `string`
**Default:** Core package version

Override the version string shown in the health endpoint and admin UI:

```typescript
{
  version: '2.0.0-beta'
}
```

### `name`

**Type:** `string`
**Default:** `"Flare CMS"`

Override the application name:

```typescript
{
  name: 'My Custom CMS'
}
```

## Complete example

Here's the actual configuration used by the Flare CMS backend:

```typescript
import { createFlareApp, registerCollections, SchedulerService } from '@flare-cms/core'
import type { FlareConfig } from '@flare-cms/core'
import { validateBindingsMiddleware } from './middleware/validate-bindings'
import blogPostsCollection from './collections/blog-posts.collection'
import docsSectionsCollection from './collections/docs-sections.collection'
import docsCollection from './collections/docs.collection'

// Register collections BEFORE creating the app
registerCollections([
  blogPostsCollection,
  docsSectionsCollection,
  docsCollection,
])

const config: FlareConfig = {
  collections: {
    autoSync: true
  },
  plugins: {
    directory: './src/plugins',
    autoLoad: false
  },
  middleware: {
    beforeAuth: [validateBindingsMiddleware()]
  }
}

const app = createFlareApp(config)

export default {
  fetch: app.fetch.bind(app),
  async scheduled(controller, env, ctx) {
    const scheduler = new SchedulerService(env.DB, env, ctx)
    ctx.waitUntil(scheduler.processScheduledContent())
  },
}
```
