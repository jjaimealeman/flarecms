---
title: Dashboard
slug: dashboard
excerpt: Your admin home base with quick stats, recent activity, and system health at a glance.
section: admin
order: 1
status: published
---

## Overview

The dashboard is the first thing you see after logging in at `/admin`. It gives you a bird's-eye view of your CMS -- how much content you have, storage usage, and what happened recently.

## Getting There

Navigate to your CMS URL and add `/admin`:

```
http://localhost:8787/admin
```

If you're not logged in, you'll be redirected to the login page first.

## Quick Stats

The top of the dashboard shows four stat cards that load via HTMX after the page renders:

- **Collections** -- How many active collections you have
- **Content Items** -- Total content across all collections
- **Media Files** -- Number of uploaded files in R2 storage
- **Users** -- Total registered users

These numbers update every time you load the dashboard.

## Storage Usage

Below the stats, you'll see storage information for your R2 media bucket. This shows how much disk space your uploaded files are consuming and breaks it down by file type (images, documents, videos, audio).

## Recent Activity

The activity feed shows the latest content changes across all collections:

- Content created
- Content updated
- Content published
- Status changes

Each entry shows the content title, collection, timestamp, and who made the change.

## Navigation

The admin sidebar (visible on all admin pages) gives you quick access to:

- **Dashboard** -- Where you are now
- **Content** -- Browse and manage content by collection
- **Collections** -- Create and configure collection schemas
- **Media** -- Upload and manage files
- **Users** -- Manage user accounts (admin only)
- **Plugins** -- Enable and configure plugins
- **API Tokens** -- Manage read-only API keys
- **Settings** -- CMS configuration
- **API Docs** -- Interactive API reference (Scalar UI)

## Version Info

The dashboard footer shows the current Flare CMS version. This is useful when reporting issues or checking if you're running the latest release.
