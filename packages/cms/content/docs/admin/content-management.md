---
title: Content Management
slug: content-management
excerpt: Creating, editing, and managing content items across your collections.
section: admin
order: 2
status: published
---

## Overview

Content management is the core of Flare CMS. Every piece of content belongs to a collection and has a title, slug, status, and a `data` object that holds the custom fields defined by the collection schema.

## Browsing Content

Navigate to **Admin > Content** to see your collections listed. Click on a collection name to see all content items in that collection.

The content list shows:

- **Title** -- The content item's title
- **Status** -- Draft, Published, or Archived
- **Created** -- When the item was created
- **Updated** -- When it was last modified
- **Author** -- Who created it

You can filter the list by status and search by title.

## Creating Content

1. Click **New Content** from the content list
2. Select the target collection (if not already selected)
3. Fill in the form fields:
   - **Title** (required) -- The display title
   - **Slug** -- Auto-generated from the title, but you can customize it
   - Custom fields defined by the collection schema
4. Click **Save as Draft** or **Publish**

> [!TIP]
> Slugs are auto-generated from the title by lowercasing, removing special characters, and replacing spaces with hyphens. You can edit the slug before publishing, but once an item is published for the first time, the slug is locked.

## Editor Types

Depending on how your collection fields are configured, you'll see different editor components:

| Field Type | Editor | Use For |
|-----------|--------|---------|
| `string` | Text input | Titles, short text |
| `text` | Textarea | Longer plain text |
| `number` | Number input | Counts, prices |
| `boolean` | Toggle/checkbox | Flags, on/off settings |
| `select` | Dropdown | Predefined choices |
| `quill` | Quill rich text editor | Blog posts, articles |
| `tinymce` | TinyMCE editor | Full WYSIWYG editing |
| `markdown` | EasyMDE editor | Documentation, technical content |
| `image` | Image picker | Featured images, thumbnails |
| `date` | Date picker | Publish dates, events |
| `url` | URL input | Links, external references |
| `email` | Email input | Contact emails |

Rich text editors (Quill, TinyMCE, EasyMDE) are enabled through the plugin system. If a plugin isn't active, the field falls back to a plain textarea.

## Content Status

Every content item has one of three statuses:

| Status | Meaning | API Visibility |
|--------|---------|----------------|
| **Draft** | Work in progress | Only with `?status=draft` |
| **Published** | Live and visible | Default in API responses |
| **Archived** | Hidden but preserved | Only with `?status=archived` |

### Status Transitions

Not all transitions are allowed:

```
draft --> published --> archived
  ^                       |
  |                       |
  +-----------------------+
```

- **Draft to Published** -- Publish your content
- **Published to Archived** -- Hide without deleting
- **Archived to Draft** -- Bring back for editing

> [!NOTE]
> The admin UI currently has a limitation where unpublishing (Published to Draft) doesn't always work through the status dropdown. This is a known inherited issue. You can use the API directly to change status: `PUT /api/content/:id` with `{"status": "draft"}`.

## Editing Content

Click on any content item to open the edit form. Make your changes and click **Save**.

Key behaviors:

- **Auto-save** is not enabled -- you must click Save explicitly
- **Slug lock** -- After first publish, the slug cannot be changed (prevents broken URLs)
- **Version history** -- Status changes are logged in the audit trail
- **Hooks** -- Plugins can intercept saves via before/after hooks and block invalid changes

## Deleting Content

Click the delete button on a content item. The admin UI uses **soft delete** -- the item is marked as deleted but remains in the database. The API `DELETE` endpoint performs a **hard delete**.

> [!WARNING]
> Hard deletes through the API are permanent. Soft-deleted items from the admin UI can potentially be recovered from the database, but there's no UI for this currently.

## Permissions

What you can do depends on your role:

- **Admin** -- Full access to all content in all collections
- **Editor** -- Can create, edit, and delete any content
- **Author** -- Can create content and edit/delete only their own items
- **Viewer** -- Read-only access

Admins can also set per-collection permissions for individual users through the collection settings.

## Keyboard Shortcuts

The content editor supports standard keyboard shortcuts:

- **Ctrl+S / Cmd+S** -- Save content (where supported by the editor plugin)
- **Esc** -- Close modals and panels

## Bulk Operations

Currently, content items are managed one at a time. Bulk operations (bulk publish, bulk delete, bulk status change) are not yet available in the admin UI. For bulk operations, use the API directly.
