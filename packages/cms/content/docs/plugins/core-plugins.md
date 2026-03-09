---
title: Core Plugins
slug: core-plugins
excerpt: All built-in plugins that ship with Flare CMS -- from auth and media to workflow, analytics, and editor integrations.
section: plugins
order: 2
status: published
---

## Overview

Flare CMS ships with a set of core plugins that provide essential CMS functionality. These plugins are built using the same `PluginBuilder` SDK available to third-party developers. Core plugins are registered automatically during application bootstrap.

## Plugin Categories

### Essential Plugins

These plugins provide foundational CMS capabilities:

| Plugin ID | Name | Description |
|-----------|------|-------------|
| `core-auth` | Authentication | JWT-based authentication, authorization, and session management |
| `core-media` | Media Management | R2-backed file uploads, image processing, and media library |
| `core-analytics` | Analytics | Request tracking, content view counts, and admin dashboard stats |

### Content Workflow

| Plugin ID | Name | Description |
|-----------|------|-------------|
| `workflow-plugin` | Workflow | Content approval chains, scheduled publishing, automation rules, webhook notifications |
| `seed-data` | Seed Data | Populates the database with sample content for development and testing |

### Editor Plugins

These plugins replace the default rich text editor in the admin UI:

| Plugin ID | Name | Description |
|-----------|------|-------------|
| `quill-editor` | Quill Editor | Quill-based WYSIWYG editor for rich text content fields |

**Available (not core, installed separately):**

| Plugin ID | Name | Description |
|-----------|------|-------------|
| `easy-mdx` | EasyMDE Markdown Editor | Lightweight markdown editor with live preview, configurable themes and toolbars |
| `tinymce-plugin` | TinyMCE Editor | Full-featured WYSIWYG editor with media embedding and customizable toolbars |

### Security Plugins

| Plugin ID | Name | Description |
|-----------|------|-------------|
| `turnstile` | Cloudflare Turnstile | CAPTCHA-free bot protection for forms using Cloudflare Turnstile |
| `otp-login` | OTP Login | One-time password authentication via email |

**Available (not core, installed separately):**

| Plugin ID | Name | Description |
|-----------|------|-------------|
| `magic-link-auth` | Magic Link Auth | Passwordless authentication via email magic links. Depends on the `email` plugin. |

### Communication

| Plugin ID | Name | Description |
|-----------|------|-------------|
| `email` | Email | Transactional email sending with template support |

### Search

| Plugin ID | Name | Description |
|-----------|------|-------------|
| `ai-search` | AI Search | Semantic and keyword search using Cloudflare AI, with autocomplete, filtering, and search analytics |

### Developer Tools

| Plugin ID | Name | Description |
|-----------|------|-------------|
| `database-tools` | Database Tools | Admin interface for database inspection and management |
| `hello-world` | Hello World | Example plugin demonstrating the plugin API |
| `demo-login` | Demo Login | One-click demo authentication for development environments |

### Content Types

| Plugin ID | Name | Description |
|-----------|------|-------------|
| `testimonials-plugin` | Testimonials | Testimonial content type with collection schema and admin CRUD |
| `code-examples-plugin` | Code Examples | Code snippet content type for documentation and tutorials |

## Plugin Dependencies

Some plugins declare dependencies on others. The plugin registry resolves load order automatically:

```
core-auth          (no dependencies)
core-media         -> core-auth
core-analytics     -> core-auth
workflow-plugin    (no dependencies)
email              (no dependencies)
otp-login          -> email
magic-link-auth    -> email
ai-search          (no dependencies)
```

## Core Plugin Details

### core-auth

The auth plugin extends the base authentication system with:

- API routes for user management under `/api/auth/`
- Hooks on `auth:login`, `auth:logout`, and `auth:register` events
- Admin pages for user administration
- Built with `PluginBuilder.create({ name: 'core-auth', version: '1.0.0-beta.1' })`

### core-media

The media plugin provides:

- Upload and management API routes
- Hooks on `media:upload`, `media:delete`, and `media:transform` events
- Media library admin interface
- R2 bucket integration for file storage
- Depends on `core-auth` for upload permissions

### workflow-plugin

The most feature-rich core plugin, providing:

- **Content workflows** with configurable approval chains
- **Scheduled publishing** via cron triggers (runs every minute)
- **Automation engine** for rule-based content actions
- **Notification service** for workflow state changes
- **Webhook service** for external integrations
- Admin dashboard with workflow overview, content detail, and scheduled content views

### ai-search

Advanced search capabilities:

- Semantic (AI-powered) and traditional keyword search modes
- Full-text indexing across all content collections
- Faceted filtering by collection, date, status, and tags
- Autocomplete suggestions
- Search analytics tracking
- Dynamic collection discovery and automatic re-indexing

### turnstile

Cloudflare Turnstile integration for bot protection:

```typescript
import { verifyTurnstile } from '@flare-cms/core/plugins'

// Protect any form endpoint
app.post('/api/contact', verifyTurnstile, async (c) => {
  // Request has passed Turnstile verification
})
```

Settings (site key, secret key) are managed through the admin plugin settings UI.

## Available Plugins (Not Bundled)

These plugins live in `packages/core/src/plugins/available/` and can be installed into your project:

### EasyMDE Markdown Editor

A lightweight markdown editor with live preview. Configurable settings:

- **Default height** (pixels, default: 400)
- **Theme** (light or dark)
- **Toolbar** (full, simple, or minimal)
- **Placeholder text**

### TinyMCE Rich Text Editor

Full-featured WYSIWYG editor. Configurable settings:

- **API Key** (optional, for TinyMCE Cloud features)
- **Default height** (pixels, default: 300)
- **Toolbar** (full, simple, or minimal)
- **Skin** (oxide or oxide-dark)

### Magic Link Authentication

Passwordless sign-in via email magic links. Configurable settings:

- **Link expiry** (5-60 minutes, default: 15)
- **Rate limit** (1-20 per hour, default: 5)
- **Allow new user registration** (default: false)

Requires the `email` plugin to be active.

## Next Steps

- See [Building Plugins](/docs/plugins/building-plugins) to create your own plugin using the PluginBuilder SDK
- See [Plugin System](/docs/plugins/plugin-system) for hook types and architecture details
