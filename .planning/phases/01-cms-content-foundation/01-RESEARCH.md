# Phase 1: CMS Content Foundation - Research

**Researched:** 2026-03-08
**Domain:** Flare CMS collection configuration, EasyMDE markdown editor integration
**Confidence:** HIGH

## Summary

This phase creates two new collections (`docs-sections` and `docs`) and configures EasyMDE as the markdown editor for documentation content. The codebase already has extensive infrastructure for all of this:

- **Collections** are plain TypeScript objects using `satisfies CollectionConfig`, registered in `packages/cms/src/index.ts` via `registerCollections()`. The existing `blog-posts.collection.ts` serves as a complete reference. Collections auto-sync to the D1 database on startup.
- **EasyMDE** already exists as an available plugin at `packages/core/src/plugins/available/easy-mdx/`. It has CDN loading, dark mode styling, toolbar configuration, HTMX re-initialization, and textarea syncing. It targets fields with `type: 'mdxeditor'` in the schema, which render as `.richtext-container textarea` elements. The init script attaches EasyMDE to these textareas automatically.
- **Image upload** to R2 is already implemented at `/api/v1/media/upload`. EasyMDE supports a custom `imageUploadFunction` callback that can POST to this endpoint and return the R2 URL.

The primary work is creating two collection config files, wiring them into `registerCollections()`, customizing EasyMDE toolbar for docs use (adding a code block button), and configuring image upload to use the existing R2 media endpoint.

**Primary recommendation:** Use the existing `mdxeditor` field type and easy-mdx plugin infrastructure. Customize the EasyMDE toolbar and add R2 image upload integration. No new field types or plugin architecture changes needed.

## Standard Stack

### Core (already in codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| EasyMDE | CDN (unpkg) | Markdown editor in admin UI | Already integrated as available plugin, loaded via CDN |
| Drizzle ORM | (bundled in core) | Database schema & queries | CMS uses D1 via Drizzle throughout |
| Hono | (bundled in core) | Web framework for admin routes | CMS backend framework |

### Supporting (already available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| highlight.js | (via EasyMDE) | Code syntax highlighting in preview | EasyMDE's `renderingConfig.codeSyntaxHighlighting: true` enables this |
| marked | (via EasyMDE) | Markdown parsing for preview | EasyMDE uses marked internally for preview rendering |

### No New Dependencies Needed
The existing codebase has everything required. No `npm install` commands needed for this phase.

## Architecture Patterns

### Collection File Pattern
```
packages/cms/src/collections/
  blog-posts.collection.ts    # existing reference
  docs-sections.collection.ts # NEW
  docs.collection.ts          # NEW
```

### Pattern 1: Collection Config File
**What:** Each collection is a single TypeScript file exporting a default object with `satisfies CollectionConfig`
**When to use:** Always -- this is the only way to define collections

**Example (from existing blog-posts.collection.ts):**
```typescript
import type { CollectionConfig } from '@flare-cms/core'

export default {
  name: 'docs-sections',
  displayName: 'Docs Sections',
  description: 'Documentation sections for organizing docs pages',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Name', required: true },
      slug: { type: 'slug', title: 'URL Slug', required: true },
      // ... more fields
    },
    required: ['name', 'slug']
  },
  listFields: ['name', 'order'],
  searchFields: ['name', 'description'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'asc'
} satisfies CollectionConfig
```

### Pattern 2: Collection Registration
**What:** Collections must be imported and registered in `packages/cms/src/index.ts`
**When to use:** After creating a new collection file

```typescript
import docsSectionsCollection from './collections/docs-sections.collection'
import docsCollection from './collections/docs.collection'

registerCollections([
  blogPostsCollection,
  docsSectionsCollection,
  docsCollection,
])
```

### Pattern 3: EasyMDE Field Type
**What:** Use `type: 'mdxeditor'` in schema to get EasyMDE editor
**When to use:** For any markdown content field

The rendering chain is:
1. Schema field `type: 'mdxeditor'` -> `dynamic-field.template.ts` renders `<div class="richtext-container"><textarea>`
2. Admin content form checks `mdxeditorEnabled` flag (from plugin status in DB)
3. If enabled, `getMDXEditorScripts()` injects CDN + styles, `getMDXEditorInitScript()` injects init code
4. Init script finds all `.richtext-container textarea` elements and attaches EasyMDE
5. EasyMDE `codemirror.on("change")` syncs value back to textarea
6. Form submission reads textarea value normally

### Pattern 4: Reference Fields
**What:** Use `type: 'reference'` with `collection` option to link between collections
**When to use:** Linking docs to docs-sections

```typescript
section: {
  type: 'reference',
  title: 'Section',
  required: true,
  collection: 'docs-sections',
  helpText: 'Which documentation section this page belongs to'
}
```

The reference field renders a picker UI that queries the referenced collection's content list.

### Pattern 5: EasyMDE Image Upload via R2
**What:** Configure EasyMDE's `imageUploadFunction` to POST to the existing `/api/v1/media/upload` endpoint
**When to use:** For drag-and-drop / paste image support in the markdown editor

The existing media upload endpoint at `packages/core/src/routes/api-media.ts`:
- Accepts `POST /api/v1/media/upload` with FormData (field name: `file`)
- Uploads to R2 bucket `MEDIA_BUCKET`
- Returns JSON with `url` field containing the R2 public URL
- Requires auth (session cookie forwarded automatically from admin UI)

EasyMDE config:
```javascript
const easyMDE = new EasyMDE({
  element: textarea,
  imageUploadFunction: (file, onSuccess, onError) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'docs')
    fetch('/api/v1/media/upload', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin'
    })
    .then(res => res.json())
    .then(data => onSuccess(data.url))
    .catch(err => onError(err.message))
  }
})
```

### Anti-Patterns to Avoid
- **Adding `'quill'` type to FieldType union for EasyMDE:** `quill` is already handled as a special case at runtime. `mdxeditor` is the correct type for EasyMDE fields. Don't conflate them.
- **Creating a new plugin for EasyMDE:** The `easy-mdx` plugin already exists at `packages/core/src/plugins/available/easy-mdx/`. Modify it, don't create a new one.
- **Storing prev/next fields:** CONTEXT.md explicitly says prev/next is auto-calculated at render time. Don't add prev/next fields to the docs schema.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown editor | Custom textarea with preview | EasyMDE via existing `easy-mdx` plugin | Already integrated with dark mode, toolbar, HTMX support |
| Image upload | Custom upload handler | Existing `/api/v1/media/upload` endpoint | Already handles R2, metadata, content type detection |
| Slug generation | Custom slug logic | Existing `type: 'slug'` field type | Already has auto-generation, duplicate detection, kebab-case |
| Reference picker | Custom dropdown | Existing `type: 'reference'` field type | Already has modal picker UI, search, collection querying |
| Collection sync | Manual DB operations | `registerCollections()` + auto-sync | CMS handles all DB table/field creation automatically |
| Dark mode editor styles | Custom CSS | Existing styles in `easy-mdx/index.ts` | Already has comprehensive dark mode for EasyMDE |

**Key insight:** The CMS already has field types for every data type needed. The work is configuration, not implementation.

## Common Pitfalls

### Pitfall 1: Plugin Not Activated in DB
**What goes wrong:** EasyMDE plugin (`easy-mdx`) must be activated in the D1 database for the editor to render. If inactive, fields fall back to plain textarea.
**Why it happens:** The plugin exists in code but needs to be activated via the admin UI or DB seed.
**How to avoid:** After creating collections, verify the `easy-mdx` plugin is active by checking `/admin/plugins` or querying `SELECT * FROM plugins WHERE name = 'easy-mdx'`. If not active, activate it through the admin UI or insert a record.
**Warning signs:** Editor renders as plain textarea instead of EasyMDE.

### Pitfall 2: FieldType Union Missing `mdxeditor`
**What goes wrong:** TypeScript may complain because `'mdxeditor'` is not in the `FieldType` union in `collection-config.ts`. The union includes `'richtext'` and `'markdown'` but not `'quill'` or `'mdxeditor'`.
**Why it happens:** The field type system uses string matching at runtime, but the TypeScript type is stricter.
**How to avoid:** Either add `'mdxeditor'` to the `FieldType` union, or cast the type. Adding it to the union is cleaner.
**Warning signs:** TypeScript compilation errors on collection config files.

### Pitfall 3: EasyMDE Value Not Syncing on Save
**What goes wrong:** Form submission sends empty or stale content because EasyMDE's internal CodeMirror state didn't sync to the underlying textarea.
**Why it happens:** The existing init script already handles this via `easyMDE.codemirror.on("change")`, but if initialization fails silently, the textarea stays empty.
**How to avoid:** The existing sync handler in `getMDXEditorInitScript()` already dispatches `input` and `change` events. Verify the form submission handler reads from the textarea, not from a hidden input (unlike Quill which uses hidden inputs).
**Warning signs:** Content saves as empty string despite being visible in editor.

### Pitfall 4: Code Block Escaping in Round-Trip
**What goes wrong:** Markdown content with fenced code blocks (triple backticks) may get HTML-escaped when stored or retrieved, breaking the code block formatting.
**Why it happens:** The `escapeHtml()` function in `dynamic-field.template.ts` escapes `<`, `>`, `&`, `"` when rendering the textarea's initial value.
**How to avoid:** This is expected behavior -- the HTML escaping in the template is for safe rendering in the `<textarea>` element. EasyMDE reads the textarea value and unescapes it. The stored value in D1 should be raw markdown. Verify by creating content, saving, reloading, and checking the raw API response.
**Warning signs:** Code blocks display with `&lt;` instead of `<` in the editor after reload.

### Pitfall 5: Icon Field Storing Emoji Instead of SVG
**What goes wrong:** The `icon` field on docs-sections accepts any string. Users might paste emoji instead of SVG markup.
**Why it happens:** No validation on the field content.
**How to avoid:** Use `helpText` to clearly instruct the user. Consider using a `textarea` type for the icon field so SVG markup is easier to paste. Validation can be added later.
**Warning signs:** Emoji appearing in section navigation instead of SVG icons.

## Code Examples

### docs-sections Collection Config
```typescript
// Source: Based on existing blog-posts.collection.ts pattern
import type { CollectionConfig } from '@flare-cms/core'

export default {
  name: 'docs-sections',
  displayName: 'Docs Sections',
  description: 'Documentation sections for organizing docs pages',

  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Section Name',
        required: true,
        maxLength: 100,
        placeholder: 'Getting Started'
      },
      slug: {
        type: 'slug',
        title: 'URL Slug',
        required: true,
        maxLength: 100
      },
      description: {
        type: 'textarea',
        title: 'Description',
        maxLength: 300,
        helpText: 'Brief description of this section'
      },
      icon: {
        type: 'textarea',
        title: 'Icon (SVG)',
        helpText: 'Paste SVG markup here. No emojis — SVG icons only.',
        maxLength: 2000
      },
      color: {
        type: 'color',
        title: 'Accent Color',
        helpText: 'Subtle accent color for this section (hex code)'
      },
      order: {
        type: 'number',
        title: 'Sort Order',
        default: 0,
        helpText: 'Lower numbers appear first'
      }
    },
    required: ['name', 'slug']
  },

  listFields: ['name', 'order'],
  searchFields: ['name', 'description'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'asc'
} satisfies CollectionConfig
```

### docs Collection Config
```typescript
// Source: Based on existing blog-posts.collection.ts pattern
import type { CollectionConfig } from '@flare-cms/core'

export default {
  name: 'docs',
  displayName: 'Documentation',
  description: 'Documentation pages with markdown content',

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
        title: 'Excerpt / Meta Description',
        maxLength: 300,
        helpText: 'Brief summary for SEO and page previews'
      },
      content: {
        type: 'mdxeditor',
        title: 'Content',
        required: true,
        helpText: 'Write documentation in Markdown. Use fenced code blocks with language labels.'
      },
      section: {
        type: 'reference',
        title: 'Section',
        required: true,
        collection: 'docs-sections',
        helpText: 'Which documentation section this page belongs to'
      },
      order: {
        type: 'number',
        title: 'Sort Order',
        default: 0,
        helpText: 'Position within the section. Lower numbers appear first.'
      },
      status: {
        type: 'select',
        title: 'Status',
        enum: ['draft', 'published'],
        enumLabels: ['Draft', 'Published'],
        default: 'draft'
      },
      lastUpdated: {
        type: 'datetime',
        title: 'Last Updated',
        helpText: 'When this page was last modified'
      }
    },
    required: ['title', 'slug', 'content', 'section']
  },

  listFields: ['title', 'section', 'status', 'order'],
  searchFields: ['title', 'excerpt'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'desc'
} satisfies CollectionConfig
```

### EasyMDE Toolbar Customization for Docs
```javascript
// Enhanced toolbar with code block button for docs content
const toolbarButtons = [
  'bold', 'italic', 'heading', '|',
  'quote', 'unordered-list', 'ordered-list', '|',
  'code', // inline code
  {
    name: 'code-block',
    action: (editor) => {
      const cm = editor.codemirror
      const selection = cm.getSelection()
      const cursor = cm.getCursor()
      if (selection) {
        cm.replaceSelection('```ts\n' + selection + '\n```')
      } else {
        cm.replaceRange('```ts\n\n```', cursor)
        cm.setCursor({ line: cursor.line + 1, ch: 0 })
      }
    },
    className: 'fa fa-file-code',
    title: 'Code Block'
  },
  '|',
  'link', 'image', 'table', '|',
  'preview', 'side-by-side', 'fullscreen', '|',
  'guide'
]
```

### Callout/Admonition Syntax (Recommendation)
```markdown
> **Note:** This is a note callout.

> **Warning:** This is a warning callout.

> **Tip:** This is a tip callout.

> **Important:** This is an important callout.
```

**Rationale:** Blockquote + bold prefix pattern. This is:
1. Valid standard markdown (renders reasonably without custom processing)
2. Easy to parse in unified/rehype pipeline (match `blockquote > p > strong` with known prefixes)
3. Easy to author in EasyMDE (select text, click quote button, type bold prefix)
4. Compatible with GitHub-style rendering as a fallback
5. No custom syntax to learn -- just markdown blockquotes with a convention

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Quill for all rich text | EasyMDE for markdown content | This phase | Code-heavy content now supported properly |
| `type: 'quill'` in schema | `type: 'mdxeditor'` in schema | Already available | EasyMDE targets `mdxeditor` field type |
| Quill stores HTML | EasyMDE stores raw markdown | This phase | API returns markdown, frontend renders to HTML |

**Key difference from blog posts:** Blog posts use `type: 'quill'` which stores HTML. Docs use `type: 'mdxeditor'` which stores raw markdown. The rendering pipeline (unified/rehype) runs on the frontend or at fetch time, not in the CMS.

## Open Questions

1. **Color field rendering**
   - What we know: `color` is in the `FieldType` union but has no explicit `case 'color'` in `dynamic-field.template.ts`. It falls through to the `default` case, rendering as a plain text input.
   - What's unclear: Whether this is acceptable (users type hex codes) or if we need a color picker.
   - Recommendation: Accept this for Phase 1. Users can type hex codes like `#e2e8f0`. A color picker enhancement can come later. Alternatively, use `type: 'string'` with a `placeholder: '#e2e8f0'` to be explicit.

2. **EasyMDE plugin activation**
   - What we know: The `easy-mdx` plugin must be active in the DB for EasyMDE to render. The plugin exists in `packages/core/src/plugins/available/easy-mdx/`.
   - What's unclear: Whether the plugin auto-activates on first startup or needs manual activation. The quill-editor plugin is in `core-plugins/` (auto-loaded), while easy-mdx is in `available/` (manual activation).
   - Recommendation: Either move easy-mdx to `core-plugins/` for auto-activation, or document the manual activation step. Investigate the plugin bootstrap service to determine if `available/` plugins need manual activation.

3. **FieldType union completeness**
   - What we know: `'mdxeditor'` is not in the `FieldType` union but works at runtime because field types are strings in the DB and templates use string matching.
   - What's unclear: Whether TypeScript strict mode will reject `type: 'mdxeditor'` in collection configs.
   - Recommendation: Add `'mdxeditor'` to the `FieldType` union in `packages/core/src/types/collection-config.ts`. Also add `'quill'` while at it since it's used in the existing blog-posts collection (currently typed as `type: 'quill'` which should fail strict checking).

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `packages/cms/src/collections/blog-posts.collection.ts` - existing collection pattern
- Codebase analysis: `packages/core/src/types/collection-config.ts` - CollectionConfig type definition
- Codebase analysis: `packages/core/src/templates/components/dynamic-field.template.ts` - field rendering (quill, mdxeditor, reference, slug, media)
- Codebase analysis: `packages/core/src/plugins/available/easy-mdx/index.ts` - EasyMDE integration (CDN, init, dark mode, HTMX)
- Codebase analysis: `packages/core/src/plugins/core-plugins/quill-editor/index.ts` - Quill pattern reference
- Codebase analysis: `packages/core/src/routes/admin-content.ts` - plugin status checking, field rendering pipeline
- Codebase analysis: `packages/core/src/routes/api-media.ts` - R2 upload endpoint
- Codebase analysis: `packages/core/src/services/collection-loader.ts` - registerCollections() pattern
- Codebase analysis: `packages/core/src/services/collection-sync.ts` - auto-sync to D1

### Secondary (MEDIUM confidence)
- [EasyMDE GitHub README](https://github.com/Ionaru/easy-markdown-editor) - imageUploadFunction, toolbar customization, renderingConfig
- [EasyMDE npm](https://www.npmjs.com/package/easymde) - version info, configuration options

### Tertiary (LOW confidence)
- WebSearch results for EasyMDE image upload patterns - implementation approach verified against codebase's existing upload endpoint

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - entirely based on existing codebase analysis
- Architecture: HIGH - follows established collection config pattern exactly
- Pitfalls: HIGH - identified from actual code paths in dynamic-field rendering and plugin activation
- EasyMDE customization: MEDIUM - imageUploadFunction API verified via official docs, toolbar customization verified via GitHub README

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- codebase patterns are well-established)
