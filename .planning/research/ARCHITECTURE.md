# Architecture: CMS-Driven Documentation Site

**Domain:** Documentation pages for FlareCMS, powered by CMS collections
**Researched:** 2026-03-08
**Confidence:** HIGH (based on existing codebase patterns + Astro 5 SSR conventions)

---

## Recommended Architecture

A 3-column documentation layout served by Astro 5 SSR, fetching content from the FlareCMS REST API at request time. Two new CMS collections (`docs` and `docs-sections`) provide all content and navigation structure. The site renders rich HTML content with styled prose, table of contents extraction, and sequential navigation -- all computed server-side in Astro frontmatter.

```
CMS Admin (author writes docs)
       |
       v
  FlareCMS REST API
  /api/collections/docs/content
  /api/collections/docs-sections/content
       |
       v
  Astro SSR (packages/site)
  +----------------------------------------------+
  |  flare.ts (API client)                       |
  |    getDocs(), getDocBySlug(), getDocSections()|
  |       |                                      |
  |       v                                      |
  |  docs/[...slug].astro (page route)           |
  |    - Fetches doc + all sections              |
  |    - Computes sidebar nav tree               |
  |    - Extracts TOC from HTML headings         |
  |    - Resolves prev/next links                |
  |       |                                      |
  |       v                                      |
  |  DocsLayout.astro                            |
  |    +---------+----------+----------+         |
  |    | Sidebar | Content  |   TOC    |         |
  |    |  Nav    |  Area    |  Panel   |         |
  |    +---------+----------+----------+         |
  +----------------------------------------------+
```

---

## CMS Collection Schemas

### `docs-sections` Collection

Groups docs into navigable sections. Each section is a category in the sidebar (e.g., "Getting Started", "API Reference", "Deployment").

```typescript
// packages/cms/src/collections/docs-sections.collection.ts
import type { CollectionConfig } from '@flare-cms/core'

export default {
  name: 'docs-sections',
  displayName: 'Doc Sections',
  description: 'Navigation groups for documentation',
  icon: '📂',

  schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Section Title',
        required: true,
        maxLength: 100,
        helpText: 'e.g., "Getting Started", "API Reference"'
      },
      slug: {
        type: 'slug',
        title: 'URL Slug',
        required: true,
        maxLength: 100,
        helpText: 'Used in URL path: /docs/{section-slug}/{doc-slug}'
      },
      description: {
        type: 'textarea',
        title: 'Description',
        maxLength: 300,
        helpText: 'Brief description shown in section headers'
      },
      sortOrder: {
        type: 'string',
        title: 'Sort Order',
        helpText: 'Numeric string for ordering (e.g., "10", "20", "30")'
      },
      icon: {
        type: 'string',
        title: 'Icon',
        helpText: 'Lucide icon name for sidebar display'
      }
    },
    required: ['title', 'slug']
  },

  listFields: ['title', 'slug', 'sortOrder', 'status'],
  searchFields: ['title'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'asc'
} satisfies CollectionConfig
```

### `docs` Collection

Individual documentation pages. Each doc belongs to a section via `sectionSlug`.

```typescript
// packages/cms/src/collections/docs.collection.ts
import type { CollectionConfig } from '@flare-cms/core'

export default {
  name: 'docs',
  displayName: 'Documentation',
  description: 'Documentation pages',
  icon: '📖',

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
        maxLength: 200,
        helpText: 'Used in URL: /docs/{section-slug}/{this-slug}'
      },
      sectionSlug: {
        type: 'string',
        title: 'Section Slug',
        required: true,
        helpText: 'Must match a docs-sections slug exactly'
      },
      content: {
        type: 'quill',
        title: 'Content',
        required: true
      },
      excerpt: {
        type: 'textarea',
        title: 'Excerpt',
        maxLength: 300,
        helpText: 'Short summary for meta description and search'
      },
      sortOrder: {
        type: 'string',
        title: 'Sort Order',
        helpText: 'Numeric string for ordering within section'
      }
    },
    required: ['title', 'slug', 'sectionSlug', 'content']
  },

  listFields: ['title', 'sectionSlug', 'sortOrder', 'status'],
  searchFields: ['title', 'excerpt'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'asc'
} satisfies CollectionConfig
```

**Why `sectionSlug` as a string, not a relational FK:**
FlareCMS (inherited from SonicJS) uses a flat content model -- every collection item has `id`, `title`, `slug`, `status`, `data`, `created_at`, `updated_at`. There is no built-in relational/reference field type. Using `sectionSlug` as a string that matches a `docs-sections` slug is the pragmatic approach. The relationship is resolved at query time in the Astro frontend by grouping docs by their `sectionSlug` value.

**Why `sortOrder` is a string, not number:**
FlareCMS schema types don't include a native `number` type for content fields. Use string with numeric values ("10", "20", "30") and parse to int when sorting. Using gaps (10, 20, 30) allows inserting pages between existing ones without renumbering.

---

## Component Boundaries

### Layer 1: API Client (`src/lib/flare.ts`)

Extend the existing API client with docs-specific functions. Follow the same pattern used by `getBlogPosts()`, `getNewsArticles()`, and `getPages()`.

| Function | Purpose | Returns |
|----------|---------|---------|
| `getDocSections()` | Fetch all published doc sections, sorted by sortOrder | `DocSection[]` |
| `getDocs()` | Fetch all published docs, sorted by sortOrder | `Doc[]` |
| `getDocBySlug(sectionSlug, docSlug)` | Find a single doc by section + slug combo | `Doc \| null` |

```typescript
// Types to add to flare.ts

interface DocSection {
  id: string
  title: string
  slug: string
  status: string
  data: {
    title: string
    slug: string
    description?: string
    sortOrder?: string
    icon?: string
  }
  created_at: number
  updated_at: number
}

interface Doc {
  id: string
  title: string
  slug: string
  status: string
  data: {
    title: string
    slug: string
    sectionSlug: string
    content: string
    excerpt?: string
    sortOrder?: string
  }
  created_at: number
  updated_at: number
}
```

**Critical pattern from existing code:** The API filters are broken (see CLAUDE.md "Known Bugs"). All existing fetch functions get ALL items and filter client-side with `.filter((item) => item.status === 'published')`. The docs functions must follow the same pattern: fetch all, filter to published, sort by `sortOrder`.

### Layer 2: Data Processing Utilities (`src/lib/docs-utils.ts`)

Pure functions that transform raw API data into structures the UI needs. Separating these from the API client keeps concerns clean and makes them testable.

| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| `buildNavTree(sections, docs)` | Raw API arrays | `NavSection[]` (sections with nested doc links) | Sidebar navigation structure |
| `extractTOC(htmlContent)` | HTML string | `TOCItem[]` (heading text + id + level) | Right column table of contents |
| `resolveAdjacentDocs(navTree, currentDoc)` | Nav tree + current doc | `{ prev, next }` | Previous/next navigation |
| `addHeadingIds(htmlContent)` | HTML string | HTML string with id attributes on headings | Anchor links for TOC |

```typescript
// src/lib/docs-utils.ts

interface NavSection {
  title: string
  slug: string
  icon?: string
  items: NavItem[]
}

interface NavItem {
  title: string
  slug: string        // doc slug
  sectionSlug: string // parent section slug
  href: string        // computed: /docs/{sectionSlug}/{slug}
}

interface TOCItem {
  id: string     // heading element id (e.g., "installation")
  text: string   // heading text content
  level: number  // 2 or 3 (h2 or h3)
}

interface AdjacentDocs {
  prev: NavItem | null
  next: NavItem | null
}
```

**`extractTOC` implementation approach:** Parse the HTML string with regex to find `<h2>` and `<h3>` tags. This runs server-side in Astro frontmatter, so no DOM API is available. A regex approach is sufficient for CMS-generated HTML (which is well-structured Quill output). Extract heading text and generate slug-based IDs.

**`addHeadingIds` implementation approach:** Transform `<h2>Foo Bar</h2>` into `<h2 id="foo-bar">Foo Bar</h2>`. Run this before rendering content so TOC anchor links work. This pairs with `extractTOC` -- both use the same ID generation logic (slugify the heading text).

### Layer 3: Layouts

| Layout | Purpose | Used By |
|--------|---------|---------|
| `Layout.astro` (existing) | Site-wide shell (nav, footer) | All pages including docs |
| `DocsLayout.astro` (new) | 3-column docs grid inside Layout | All doc pages |

**`DocsLayout.astro` responsibilities:**
- Receives `navTree`, `currentDoc`, `tocItems`, `adjacentDocs` as props
- Renders the 3-column CSS grid (sidebar, content, TOC)
- Wraps content area in `<Layout>` for consistent site nav/footer
- Highlights current page in sidebar
- Handles responsive collapse (sidebar becomes toggle on mobile, TOC hides on tablet)

```
DocsLayout props:
  navTree: NavSection[]        -- sidebar data
  currentSection: string       -- active section slug (for highlighting)
  currentSlug: string          -- active doc slug (for highlighting)
  tocItems: TOCItem[]          -- right column TOC
  adjacentDocs: AdjacentDocs   -- prev/next links
  title: string                -- page title for <head>
  description?: string         -- meta description
```

### Layer 4: Page Route (`src/pages/docs/[...slug].astro`)

The catch-all route handles `/docs`, `/docs/{section}`, and `/docs/{section}/{page}`.

```
URL pattern:
  /docs                           -> redirect to first doc page
  /docs/{sectionSlug}             -> redirect to first doc in that section
  /docs/{sectionSlug}/{docSlug}   -> render the doc page
```

**Using `[...slug].astro` (rest parameter)** because docs URLs are 2 segments deep under `/docs/`. A rest parameter captures both segments as an array.

**Frontmatter data flow (the complete pipeline for each request):**
```
1. Parse Astro.params.slug -> [sectionSlug, docSlug] (or undefined for index)
2. Fetch sections = await getDocSections()
3. Fetch docs = await getDocs()
4. Build navTree = buildNavTree(sections, docs)
5. Handle redirects:
   - No slug segments -> redirect to first doc in first section
   - One slug segment -> redirect to first doc in that section
6. Find currentDoc = docs matching sectionSlug + docSlug
7. If no currentDoc -> return 404
8. Process content = addHeadingIds(currentDoc.data.content)
9. Extract tocItems = extractTOC(content)
10. Resolve adjacentDocs = resolveAdjacentDocs(navTree, currentDoc)
11. Render DocsLayout with all computed data
```

**Note on the existing `docs.astro`:** The current `/docs` page is a placeholder with links to GitHub. It will be replaced by `docs/[...slug].astro` which catches the `/docs` path via the rest parameter (empty slug array). The old `docs.astro` file should be deleted.

### Layer 5: UI Components

| Component | Type | Purpose |
|-----------|------|---------|
| `DocsSidebar.astro` | Astro | Left column nav tree with section groups and doc links |
| `DocsTOC.astro` | Astro | Right column table of contents from page headings |
| `DocsContent.astro` | Astro | Center column content wrapper with prose styling |
| `DocsPrevNext.astro` | Astro | Previous/next navigation cards at bottom of content |
| `DocsBreadcrumb.astro` | Astro | Breadcrumb trail: Docs > Section > Page |
| `DocsCallout.astro` | Astro | Info/warning/tip callout boxes (phase 2+) |
| `DocsMobileNav.astro` | Astro | Mobile sidebar toggle |

**All components are `.astro` files -- no client-side framework needed.** The docs pages are read-only rendered content. The only interactive elements are:
- Mobile sidebar toggle (CSS-only `<details>` element or minimal vanilla JS)
- TOC active heading tracking (optional `IntersectionObserver` via inline `<script>` tag)
- Code copy button (vanilla JS `<script>` tag)

These use Astro's `<script>` tags for progressive enhancement, not a UI framework.

---

## Data Flow: CMS to Rendered Page

```
Author writes doc in CMS Admin UI (Quill rich text editor)
  |
  v
Saved to D1 database via CMS Worker API
  |
  v
Visitor requests /docs/getting-started/installation
  |
  v
Astro SSR handles request on Cloudflare Pages
  |
  v
[...slug].astro frontmatter runs:
  +-- fetch /api/collections/docs-sections/content -> all sections
  +-- fetch /api/collections/docs/content -> all docs
  +-- filter both to status === 'published'
  +-- sort both by data.sortOrder (parsed as int)
  +-- buildNavTree(sections, docs) -> sidebar structure
  +-- find matching doc by sectionSlug + slug
  +-- addHeadingIds(doc.data.content) -> content with anchor IDs
  +-- extractTOC(processedContent) -> heading list for right column
  +-- resolveAdjacentDocs(navTree, currentDoc) -> prev/next links
  |
  v
DocsLayout.astro renders 3-column grid:
  +-- DocsSidebar.astro (left) -- nav tree, current page highlighted
  +-- DocsContent.astro (center) -- prose-styled HTML via set:html
  |     +-- DocsBreadcrumb.astro -- Docs > Section > Title
  |     +-- <div class="prose ..."> content </div>
  |     +-- DocsPrevNext.astro -- prev/next cards at bottom
  +-- DocsTOC.astro (right) -- heading links
  |
  v
HTML response sent to browser
```

### Performance: Fetching All Docs Per Request

The existing pattern (fetch all, filter client-side) means every docs page request fetches ALL docs from the API. For a documentation site with 20-50 pages, this is acceptable:

- **Payload size:** ~50 docs at ~2KB each = ~100KB JSON, compressed to ~20KB on the wire
- **CMS caching:** KV cache on the CMS Worker means repeat API calls are fast (~5ms)
- **Benefit:** A single fetch gives us everything needed for sidebar nav, TOC, and prev/next -- no N+1 queries

This is consistent with how blog, news, and pages already work in the codebase. No optimization needed until doc count exceeds ~100.

---

## Navigation Architecture

### Sidebar (Left Column)

Built from `navTree` -- an array of sections, each containing ordered doc links.

```
Getting Started           <-- section (from docs-sections collection)
  Introduction            <-- doc link (from docs, sorted by sortOrder)
  Installation            <-- highlighted if current page
  Quick Start

Core Concepts
  Collections
  Content API
  Authentication

Deployment
  Cloudflare Workers
  Environment Variables
```

The sidebar is fully server-rendered. Current page highlighting uses simple string comparison:
```typescript
const isActive = item.slug === currentSlug && item.sectionSlug === currentSection
```

Active state styling uses Tailwind classes: `text-flare-400 bg-slate-800/50` for active item vs `text-slate-400 hover:text-slate-50` for inactive (matching existing nav patterns in Layout.astro).

### Table of Contents (Right Column)

Extracted from the current page's HTML content. Shows `h2` and `h3` headings as a nested list.

```
On this page
  Overview                <-- h2
  Prerequisites           <-- h2
    Node.js               <-- h3 (indented)
    Wrangler CLI          <-- h3 (indented)
  Installation            <-- h2
  Configuration           <-- h2
```

Links use `#heading-id` anchors that match the IDs injected by `addHeadingIds()`. The right column uses `position: sticky` to stay visible while scrolling content.

Optional enhancement: client-side `IntersectionObserver` to highlight the currently visible heading as the user scrolls.

### Breadcrumbs (Top of Content Area)

```
Docs  >  Getting Started  >  Installation
```

Computed from `currentSection` and `currentDoc` in the page frontmatter -- no separate data fetch needed. Each segment is a link: "Docs" links to `/docs`, section name links to the first doc in that section.

### Previous/Next (Bottom of Content Area)

```
<- Previous                              Next ->
  Introduction                    Quick Start
  Getting Started              Getting Started
```

Resolved by `resolveAdjacentDocs()`: flatten the nav tree into an ordered list, find the current doc's index, return `items[index - 1]` and `items[index + 1]`. Navigation wraps across section boundaries (last page of section A links to first page of section B).

---

## 3-Column Layout Structure

```
+----------------------------------------------------------+
|  Site Nav (existing Layout.astro)                        |
+----------+-------------------------------+---------------+
|          |                               |               |
| Sidebar  |  Content Area                 |  TOC          |
| 256px    |  flex-1 (max-w-3xl)           |  200px        |
| fixed    |                               |  sticky       |
|          |  +- Breadcrumb --------+      |               |
| Section  |  | Docs > Section > T  |      |  On this page |
|  Link    |  +---------------------+      |   Heading 1   |
|  Link    |                               |   Heading 2   |
|  Link*   |  <h1>Page Title</h1>          |     Sub 1     |
|          |                               |     Sub 2     |
| Section  |  Content with prose styling   |   Heading 3   |
|  Link    |  ...                          |               |
|  Link    |                               |               |
|          |  +- Prev/Next ---------+      |               |
|          |  | <- Prev    Next ->  |      |               |
|          |  +---------------------+      |               |
+----------+-------------------------------+---------------+
|  Footer (existing Layout.astro)                          |
+----------------------------------------------------------+
```

**Responsive breakpoints:**
- **Desktop** (1280px+): 3 columns as shown
- **Tablet** (768px-1279px): 2 columns (sidebar + content, TOC hidden)
- **Mobile** (<768px): 1 column (sidebar behind toggle, content only)

**Tailwind CSS v4 implementation:**

The grid container uses Tailwind utilities. The `@theme` tokens are already defined in `global.css`.

```html
<!-- DocsLayout.astro grid -->
<div class="mx-auto max-w-[1400px] grid grid-cols-1 md:grid-cols-[256px_1fr] xl:grid-cols-[256px_1fr_200px]">
  <!-- Sidebar: hidden on mobile, shown on md+ -->
  <aside class="hidden md:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r border-slate-800">
    <DocsSidebar ... />
  </aside>

  <!-- Content area -->
  <main class="px-8 py-10 max-w-3xl">
    <DocsBreadcrumb ... />
    <DocsContent ... />
    <DocsPrevNext ... />
  </main>

  <!-- TOC: hidden below xl -->
  <aside class="hidden xl:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-10 pr-4">
    <DocsTOC ... />
  </aside>
</div>
```

**Key detail:** The sidebar and TOC use `sticky top-16` (matching the 64px/4rem nav height from Layout.astro) and `h-[calc(100vh-4rem)]` to fill the viewport below the nav. Both get independent scroll via `overflow-y-auto`.

---

## Content Rendering Pipeline

The CMS stores content as HTML (Quill editor output). The rendering pipeline transforms this HTML for documentation display.

```
Raw Quill HTML from CMS
  |
  v
addHeadingIds()           -- add id attrs to h2/h3 for TOC anchors
  |
  v
[future] processCallouts() -- convert blockquote patterns to styled callouts
  |
  v
[future] processCodeBlocks() -- add copy buttons, language labels
  |
  v
set:html={processedContent}  -- Astro renders as raw HTML
  |
  v
Tailwind @tailwindcss/typography prose classes style the output
```

### Prose Styling (Reuse from Blog)

The blog `[slug].astro` already defines a comprehensive set of prose overrides for the dark theme. These exact classes should be extracted into `DocsContent.astro` for reuse:

```
prose prose-lg prose-invert max-w-none
prose-headings:font-heading prose-headings:tracking-tight prose-headings:text-slate-50
prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
prose-p:text-slate-300 prose-p:leading-relaxed
prose-a:text-flare-400 prose-a:no-underline hover:prose-a:underline
prose-strong:text-slate-100
prose-ul:text-slate-300 prose-ol:text-slate-300
prose-li:marker:text-flare-500
prose-code:text-flare-300 prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5
  prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-xl
  prose-pre:text-sm prose-pre:leading-7
prose-hr:border-slate-800
prose-blockquote:border-flare-500 prose-blockquote:text-slate-400
```

This class list is already proven to work with the site's dark theme and font stack. No new CSS design work needed for content styling.

### Content Enhancement Patterns

**Callout boxes (phase 2+):** The Quill editor produces `<blockquote>` elements. Authors can use a convention like starting a blockquote with `**Note:**`, `**Warning:**`, or `**Tip:**`. A `processCallouts()` function transforms these into styled divs with colored left borders and icons. This is a progressive enhancement -- works as plain blockquotes even without processing.

**Code blocks:** Quill generates `<pre><code>` blocks. The existing prose styles already make these look good (dark background, border, rounded corners, JetBrains Mono font). Syntax highlighting is a phase 2+ enhancement -- add Shiki server-side processing in frontmatter using `codeToHtml()`.

**Recommendation:** Start without syntax highlighting or callout processing. The base prose styling is already solid. Add enhancements incrementally.

---

## File Structure

```
packages/site/src/
  layouts/
    Layout.astro               (existing - site shell with nav + footer)
    DocsLayout.astro            (new - 3-column docs grid)

  pages/
    docs.astro                  (existing - DELETE, replaced by catch-all)
    docs/
      [...slug].astro           (new - catch-all docs route)

  components/
    docs/                       (new directory for docs components)
      DocsSidebar.astro
      DocsTOC.astro
      DocsContent.astro
      DocsPrevNext.astro
      DocsBreadcrumb.astro
      DocsMobileNav.astro
      DocsCallout.astro          (phase 2+)

  lib/
    flare.ts                    (existing - extend with docs API functions)
    docs-utils.ts               (new - buildNavTree, extractTOC, etc.)

packages/cms/src/collections/
  blog-posts.collection.ts      (existing)
  docs.collection.ts            (new)
  docs-sections.collection.ts   (new)
```

---

## Build Order (Dependency Chain)

Components have clear dependencies. Build in this order:

```
Phase 1: CMS Foundation (no frontend dependencies)
  1. docs-sections.collection.ts     -- collection config, no deps
  2. docs.collection.ts              -- collection config, no deps
  3. Seed 3-5 doc pages + 2 sections -- content to test against

  WHY FIRST: Cannot test any frontend code without CMS content to fetch.

Phase 2: API + Utilities (no UI dependencies)
  4. Doc types + API functions in flare.ts  -- depends on collections existing
  5. docs-utils.ts                           -- depends on API types from step 4
     - buildNavTree()
     - extractTOC()
     - addHeadingIds()
     - resolveAdjacentDocs()

  WHY SECOND: All UI components consume these. Get the data layer right first.

Phase 3: Layout Shell (depends on Phase 2 types)
  6. DocsLayout.astro (3-column grid)     -- the structural container
  7. DocsSidebar.astro                     -- needs NavSection type
  8. DocsTOC.astro                         -- needs TOCItem type
  9. DocsBreadcrumb.astro                  -- trivial, no complex deps

  WHY THIRD: Layout must exist before the route can render into it.

Phase 4: Route + Content (depends on ALL above)
  10. docs/[...slug].astro                 -- orchestrates everything
  11. DocsContent.astro (prose wrapper)    -- extracts prose classes from blog
  12. DocsPrevNext.astro                   -- needs AdjacentDocs type

  WHY FOURTH: This is the integration point. All other pieces must exist first.

Phase 5: Polish (progressive enhancement)
  13. DocsMobileNav.astro                  -- responsive sidebar toggle
  14. Delete old docs.astro                -- superseded by catch-all route
  15. Active TOC scroll tracking           -- IntersectionObserver script
  16. Code copy buttons                    -- vanilla JS script
  17. DocsCallout.astro                    -- content post-processing
```

**Key insight:** The CMS collections must exist and have seed data BEFORE any frontend work can be tested. Create the collections and seed content first.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Routing for Docs
**What:** Using React Router, Vue Router, or any SPA framework for docs navigation.
**Why bad:** Breaks SSR benefits, hurts SEO, adds JS bundle weight for zero benefit on a content site.
**Instead:** Use Astro's file-based routing with full page loads. Docs pages are static content -- SSR is the correct approach.

### Anti-Pattern 2: Separate Layout That Doesn't Reuse Site Shell
**What:** Creating a completely independent HTML document structure for docs.
**Why bad:** Inconsistent navigation between docs and rest of site, duplicated footer/nav code, maintenance burden.
**Instead:** DocsLayout wraps inside the existing Layout.astro via `<Layout title={title}>`. The site nav and footer remain consistent across all pages.

### Anti-Pattern 3: Hard-Coding Navigation in TypeScript
**What:** Maintaining a `docs-nav.ts` file with the sidebar structure.
**Why bad:** Every new doc page requires a code change and redeploy. Content authors can't reorder pages.
**Instead:** Derive navigation entirely from CMS data (sections + docs with sortOrder). Authors can add/reorder pages from the admin UI without code changes.

### Anti-Pattern 4: Over-Engineering Content Processing
**What:** Building a full Markdown/MDX pipeline with custom remark/rehype plugins to process CMS content.
**Why bad:** The CMS already outputs HTML from the Quill editor. Converting HTML to AST and back to HTML is wasteful and introduces bugs.
**Instead:** Work with the HTML the CMS gives you. Use simple string transforms (regex for heading IDs, pattern matching for callouts) rather than full AST parsing. The content is well-structured Quill output, not arbitrary user HTML.

### Anti-Pattern 5: Fetching Only the Current Doc
**What:** Making a single API call for just the current doc page, then separate calls for sidebar data.
**Why bad:** The sidebar needs ALL docs to build the nav tree. You'd need multiple API requests anyway, and the API filters are broken.
**Instead:** Fetch all docs + all sections in parallel (2 API calls), build everything from that. The KV cache on the CMS Worker makes this fast, and the total payload is small.

### Anti-Pattern 6: Using a UI Framework for Interactivity
**What:** Adding React/Vue/Svelte islands for the sidebar toggle or TOC scroll tracking.
**Why bad:** Adds framework runtime JS (~30-50KB) for interactions that need ~20 lines of vanilla JS.
**Instead:** Use Astro's inline `<script>` tags for the 2-3 interactive behaviors (mobile nav toggle, TOC scroll tracking, code copy buttons). These are progressive enhancements, not core functionality.

---

## Scalability Considerations

| Concern | 10 docs | 50 docs | 200+ docs |
|---------|---------|---------|-----------|
| API payload size | ~5KB | ~25KB | ~100KB, consider pagination |
| Nav tree computation | Trivial | Trivial | Still fast (simple sort/group) |
| TOC extraction | Instant | Instant | Instant (per-page only) |
| Sidebar scrolling | No scroll needed | Some scrolling | Needs collapsible sections |
| Content discoverability | Browse sidebar | Browse sidebar | Search becomes important |

The architecture handles 50+ docs without any changes. At 200+ docs, add:
- Collapsible sidebar sections (CSS-only with `<details>` elements)
- Client-side search (Fuse.js indexing doc titles + excerpts, loaded as a small JS module)
- Paginated API calls if JSON payload becomes an issue (but this requires fixing the API filter bug first)

---

## Sources

- **Existing codebase: `packages/site/src/lib/flare.ts`** -- API client patterns, FlareResponse type, client-side filtering approach (HIGH confidence)
- **Existing codebase: `packages/cms/src/collections/blog-posts.collection.ts`** -- CollectionConfig schema format, field types available (HIGH confidence)
- **Existing codebase: `packages/site/src/pages/blog/[slug].astro`** -- Content rendering with `set:html`, prose class list, CMS-first with fallback pattern (HIGH confidence)
- **Existing codebase: `packages/site/src/layouts/Layout.astro`** -- Site shell structure, nav height (4rem), footer, slot pattern (HIGH confidence)
- **Existing codebase: `packages/site/src/styles/global.css`** -- Tailwind v4 theme tokens, font stack, color palette (HIGH confidence)
- **Existing codebase: `packages/site/astro.config.mjs`** -- SSR output mode, Cloudflare adapter, Tailwind vite plugin (HIGH confidence)
- **CLAUDE.md project instructions** -- Known API filter bug requiring client-side filtering, collection naming conventions, schema field types (HIGH confidence)

---
*Architecture research for: CMS-driven documentation site on Astro 5 SSR*
*Researched: 2026-03-08*
