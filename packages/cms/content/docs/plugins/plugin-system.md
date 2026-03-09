---
title: Plugin System
slug: plugin-system
excerpt: How the Flare CMS plugin architecture works -- hooks, lifecycle, registry, and extension points.
section: plugins
order: 1
status: published
---

## Overview

Flare CMS includes a full plugin system that lets you extend every part of the CMS: routes, middleware, database models, admin pages, and content lifecycle events. Plugins are plain TypeScript objects that conform to the `Plugin` interface, managed by a central `PluginManager` and connected through an event-driven hook system.

## Architecture

The plugin system has four core components:

| Component | Role |
|-----------|------|
| **PluginManager** | Central orchestrator -- installs, activates, and uninstalls plugins |
| **PluginRegistry** | Tracks registered plugins, their status, configs, and dependency order |
| **HookSystem** | Event bus for inter-plugin communication and lifecycle events |
| **PluginValidator** | Validates plugin definitions and dependency graphs before registration |

### How a plugin loads

1. `PluginManager.install(plugin)` validates the plugin definition
2. The plugin is registered in the `PluginRegistry`
3. A **scoped hook system** is created for the plugin (isolated cleanup on uninstall)
4. Plugin extensions are registered (routes, middleware, hooks, models, services)
5. The plugin's `install()` lifecycle callback runs
6. The `plugin:install` hook fires globally
7. The plugin's `activate()` callback runs
8. The registry marks the plugin as active

## Plugin Interface

Every plugin must have a `name` and `version`. All other fields are optional extension points:

```typescript
interface Plugin {
  name: string
  version: string
  description?: string
  author?: { name: string; email?: string; url?: string }
  dependencies?: string[]
  compatibility?: string
  license?: string

  // Extension points
  routes?: PluginRoutes[]
  middleware?: PluginMiddleware[]
  models?: PluginModel[]
  services?: PluginService[]
  adminPages?: PluginAdminPage[]
  adminComponents?: PluginComponent[]
  menuItems?: PluginMenuItem[]
  hooks?: PluginHook[]

  // Lifecycle callbacks
  install?: (context: PluginContext) => Promise<void>
  uninstall?: (context: PluginContext) => Promise<void>
  activate?: (context: PluginContext) => Promise<void>
  deactivate?: (context: PluginContext) => Promise<void>
  configure?: (config: PluginConfig) => Promise<void>
}
```

## Hook System

Hooks are the primary communication mechanism between plugins and core. The hook system is priority-ordered (lower number = earlier execution, default priority is 10) and supports cancellation.

### Standard Hook Names

Flare CMS defines these built-in hooks in the `HOOKS` constant:

**Application lifecycle:**

| Hook | Constant | Fires when |
|------|----------|------------|
| `app:init` | `HOOKS.APP_INIT` | Plugin system initializes |
| `app:ready` | `HOOKS.APP_READY` | Application is ready to serve |
| `app:shutdown` | `HOOKS.APP_SHUTDOWN` | Application is shutting down |

**Request lifecycle:**

| Hook | Constant | Fires when |
|------|----------|------------|
| `request:start` | `HOOKS.REQUEST_START` | Incoming request begins processing |
| `request:end` | `HOOKS.REQUEST_END` | Response is about to be sent |
| `request:error` | `HOOKS.REQUEST_ERROR` | Unhandled error during request |

**Authentication:**

| Hook | Constant | Fires when |
|------|----------|------------|
| `auth:login` | `HOOKS.AUTH_LOGIN` | User logs in |
| `auth:logout` | `HOOKS.AUTH_LOGOUT` | User logs out |
| `auth:register` | `HOOKS.AUTH_REGISTER` | New user registers |
| `user:login` | `HOOKS.USER_LOGIN` | User login event |
| `user:logout` | `HOOKS.USER_LOGOUT` | User logout event |

**Content lifecycle:**

| Hook | Constant | Fires when |
|------|----------|------------|
| `content:create` | `HOOKS.CONTENT_CREATE` | New content is created |
| `content:update` | `HOOKS.CONTENT_UPDATE` | Content is updated |
| `content:delete` | `HOOKS.CONTENT_DELETE` | Content is deleted |
| `content:publish` | `HOOKS.CONTENT_PUBLISH` | Content is published |
| `content:save` | `HOOKS.CONTENT_SAVE` | Content is saved (create or update) |

**Media lifecycle:**

| Hook | Constant | Fires when |
|------|----------|------------|
| `media:upload` | `HOOKS.MEDIA_UPLOAD` | File is uploaded |
| `media:delete` | `HOOKS.MEDIA_DELETE` | Media is deleted |
| `media:transform` | `HOOKS.MEDIA_TRANSFORM` | Image transformation requested |

**Plugin lifecycle:**

| Hook | Constant | Fires when |
|------|----------|------------|
| `plugin:install` | `HOOKS.PLUGIN_INSTALL` | Plugin is installed |
| `plugin:uninstall` | `HOOKS.PLUGIN_UNINSTALL` | Plugin is uninstalled |
| `plugin:activate` | `HOOKS.PLUGIN_ACTIVATE` | Plugin is activated |
| `plugin:deactivate` | `HOOKS.PLUGIN_DEACTIVATE` | Plugin is deactivated |

**Admin interface:**

| Hook | Constant | Fires when |
|------|----------|------------|
| `admin:menu:render` | `HOOKS.ADMIN_MENU_RENDER` | Admin menu is rendering |
| `admin:page:render` | `HOOKS.ADMIN_PAGE_RENDER` | Admin page is rendering |

**Database:**

| Hook | Constant | Fires when |
|------|----------|------------|
| `db:migrate` | `HOOKS.DB_MIGRATE` | Database migration runs |
| `db:seed` | `HOOKS.DB_SEED` | Database seeding runs |

### Hook Execution

Handlers run in priority order. Each handler receives the current data and a `HookContext`:

```typescript
const handler = async (data: any, context: HookContext) => {
  // Modify and return data to pass to next handler
  return { ...data, processed: true }

  // Or cancel the hook chain
  context.cancel()
  return data
}
```

The hook system prevents infinite recursion -- if a hook triggers itself, the recursive call is skipped with a console warning.

### Scoped Hooks

Each plugin gets a `ScopedHookSystem` that tracks which hooks it registered. When a plugin is uninstalled, `unregisterAll()` cleanly removes all its hooks without affecting other plugins.

## Plugin Context

When lifecycle callbacks run, they receive a `PluginContext` with access to CMS internals:

```typescript
interface PluginContext {
  db: D1Database
  kv: KVNamespace
  r2?: R2Bucket
  config: PluginConfig
  services: {
    auth: AuthService
    content: ContentService
    media: MediaService
  }
  hooks: ScopedHookSystem
  logger: PluginLogger
  app?: Hono  // Main app instance for registering routes
}
```

The `logger` provides namespaced logging (`debug`, `info`, `warn`, `error`) that prefixes messages with `[Plugin:name]`.

## Extension Points

### Routes

Plugins can add API routes that get mounted on the main Hono app:

```typescript
{
  routes: [{
    path: '/api/my-feature',
    handler: myHonoApp,
    requiresAuth: true,
    roles: ['admin']
  }]
}
```

### Middleware

Plugin middleware is sorted by priority and can be applied globally or to specific routes:

```typescript
{
  middleware: [{
    name: 'my-middleware',
    handler: myMiddlewareHandler,
    priority: 5,
    global: true
  }]
}
```

### Database Models

Plugins can declare database models with Zod schemas and SQL migrations:

```typescript
{
  models: [{
    name: 'MyModel',
    tableName: 'my_table',
    schema: myZodSchema,
    migrations: [createTableSQL],
    extendsContent: true
  }]
}
```

### Admin Pages and Menu Items

Plugins can add pages to the admin UI and items to the admin menu:

```typescript
{
  adminPages: [{
    path: '/admin/my-feature',
    title: 'My Feature',
    component: 'MyFeatureComponent',
    icon: 'sparkles'
  }],
  menuItems: [{
    label: 'My Feature',
    path: '/admin/my-feature',
    icon: 'sparkles',
    order: 50
  }]
}
```

## Dependency Resolution

The `PluginRegistry` resolves plugin load order based on declared dependencies. If plugin B depends on plugin A, A is always activated first. Circular dependencies are detected and reported as errors during validation.

```typescript
// Plugin B declares it needs core-auth
{
  name: 'my-plugin',
  dependencies: ['core-auth']
}
```

## Next Steps

- See [Core Plugins](/docs/plugins/core-plugins) for the built-in plugins that ship with Flare CMS
- See [Building Plugins](/docs/plugins/building-plugins) for a step-by-step guide to creating your own plugin
