---
title: Plugins
slug: plugins
excerpt: Manage plugins to extend Flare CMS with editors, tools, and custom functionality.
section: admin
order: 5
status: published
---

## Overview

Flare CMS has a plugin system that lets you extend the CMS with additional features. Plugins can add rich text editors, development tools, custom collections, and more.

Navigate to **Admin > Plugins** to manage your plugins.

## Plugin List

The plugins page shows all available plugins organized by category:

| Category | Examples |
|----------|----------|
| **Editor** | Quill, TinyMCE, EasyMDE |
| **Content** | FAQ System |
| **System** | Cache, Database Tools |
| **Development** | Seed Data, Demo Login |
| **Demo** | Demo Login Prefill |

Each plugin card shows:

- Plugin name and description
- Version number
- Author
- Current status (Active/Inactive)
- Category badge

## Activating Plugins

To activate a plugin:

1. Find the plugin in the list
2. Click the **Activate** button
3. The plugin initializes and starts running

Some plugins run setup tasks on first activation -- like creating database tables or registering routes.

## Deactivating Plugins

To deactivate a plugin:

1. Find the active plugin
2. Click **Deactivate**
3. The plugin stops running but its data is preserved

> [!NOTE]
> Deactivating a plugin doesn't delete its data. If you reactivate it later, your settings and content are still there.

## Core Plugins

These plugins ship with Flare CMS:

### Cache Plugin

**ID:** `core-cache`

Adds multi-layer caching (in-memory + KV) to API responses. When active, the API includes cache headers (`X-Cache-Status`, `X-Cache-Source`) and dramatically reduces database queries for repeated requests.

### Quill Rich Text Editor

**ID:** `quill-editor`

Integrates the Quill WYSIWYG editor for `quill` type fields. Provides a clean, modern editing experience with customizable toolbars and dark mode support.

### TinyMCE Editor

**ID:** `tinymce-editor`

Integrates TinyMCE for `tinymce` type fields. Full-featured WYSIWYG editor with extensive formatting options.

### EasyMDE (Markdown)

**ID:** `easymde-editor`

Integrates EasyMDE for `markdown` type fields. Split-pane markdown editor with live preview, perfect for documentation and technical content.

## Community Plugins

### FAQ System

**ID:** `third-party-faq`

Adds a FAQ management system with categories, search, and custom styling. Creates a `faqs` collection and provides a public-facing FAQ page.

## Development Plugins

These are useful during development but should be deactivated in production.

### Demo Login Prefill

**ID:** `demo-login-prefill`

Prefills the login form with demo credentials. Useful when showing the CMS to clients or during testing. **Do not leave active in production.**

### Database Tools

**ID:** `database-tools`

Provides database management utilities including table inspection, data validation, and cleanup tools. Admin-only access.

### Seed Data

**ID:** `seed-data`

Generates realistic example users and content for testing. Creates sample blog posts, pages, and other content so you can see how the CMS looks with real data.

## Plugin Settings

Some plugins have configurable settings. Click the **Settings** icon on a plugin card to access its configuration page.

Settings vary by plugin -- the cache plugin lets you configure TTL values, while editor plugins let you customize toolbar options.

## Plugin Hooks

Plugins can hook into the content lifecycle:

| Hook | When | Use |
|------|------|-----|
| `content:before-create` | Before content is created | Validate, transform |
| `content:after-create` | After content is created | Notify, index |
| `content:before-update` | Before content is updated | Validate changes |
| `content:after-update` | After content is updated | Invalidate cache |
| `content:before-publish` | Before publishing | Quality checks |
| `content:after-publish` | After publishing | Webhook delivery |
| `content:before-delete` | Before deletion | Cascade checks |
| `content:after-delete` | After deletion | Cleanup |

"Before" hooks can **block** the operation by returning `cancelled: true`. This is useful for validation plugins that need to enforce business rules.

"After" hooks run asynchronously via `waitUntil` and don't block the response.

## Webhooks

The built-in webhook system fires on content publish/unpublish events. Configure webhook URLs via the `WEBHOOK_URLS` environment variable:

```toml
# wrangler.toml
[vars]
WEBHOOK_URLS = "https://your-site.com/api/webhook,https://other-service.com/hook"
```

Set a shared secret for webhook signature verification:

```bash
wrangler secret put WEBHOOK_SECRET
```

## Tips

- **Activate only what you need** -- each active plugin adds some overhead to request handling
- **Editor plugins are mix-and-match** -- you can have Quill, TinyMCE, and EasyMDE all active at once, each used by different field types
- **Deactivate dev plugins in production** -- Demo Login and Seed Data should never run on live sites
- **Check plugin compatibility** after CMS updates -- plugins may need updates too
