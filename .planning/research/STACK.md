# Technology Stack: Documentation Site

**Project:** FlareCMS Documentation Website
**Milestone:** Add CMS-driven docs to existing Astro 5 frontend
**Researched:** 2026-03-08

## Context

This is an additive milestone. The core stack already exists and is deployed:
- Astro 5.17+ SSR on Cloudflare Pages (`packages/site/`)
- Tailwind CSS v4 with `@tailwindcss/typography`
- `@astrojs/cloudflare` adapter v12.6+
- FlareCMS backend on Cloudflare Workers (Hono + D1 + R2 + KV)
- Quill rich-text editor in CMS admin (outputs HTML)
- `unplugin-icons` with Lucide icon set
- JetBrains Mono + Inter + Space Grotesk fonts already loaded

This document covers **only the new libraries needed** for the documentation site features.

---

## Critical Architecture Decision: NOT Using Starlight

**Starlight is wrong for this project.** Starlight is Astro's documentation framework, but it is designed for markdown files in the repository, not CMS-driven content. While Starlight has experimental support for custom content sources via Astro's Content Layer API, that API runs at **build time only** -- it populates a store during `astro build`. Since FlareCMS content is managed through an admin UI and fetched via REST API at runtime (SSR), Starlight's architecture is fundamentally incompatible.

**Confidence: HIGH** -- verified via official Astro Content Loader Reference docs.

**What to do instead:** Build the docs layout as standard Astro pages/components within the existing site. The 3-column layout (sidebar, content, TOC) is straightforward to build with Tailwind CSS and does not require a framework.

---

## Critical Architecture Decision: NOT Using Astro Content Collections

Same reasoning as Starlight. Content Collections and the Content Layer API are build-time constructs. The `loader` function runs during `astro build` and populates a store. For SSR with dynamic CMS content, use direct `fetch()` calls in Astro page frontmatter -- the existing `flare.ts` pattern already does this correctly.

**Confidence: HIGH** -- verified via official Astro Content Loader Reference.

---

## Recommended Stack

### Syntax Highlighting: Shiki (built into Astro)

| Attribute | Value |
|-----------|-------|
| **Package** | `shiki` (bundled with Astro) |
| **Version** | Ships with Astro 5.17+ (Shiki 3.x+ internally) |
| **Install** | None needed -- already available |
| **Confidence** | HIGH |

**Why Shiki:** Astro ships with Shiki built-in and exposes a `<Code />` component that accepts dynamic `code` and `lang` props. For CMS-driven content where code blocks are extracted from HTML at render time, Shiki's programmatic `codeToHtml()` API is the right tool. No additional dependency required.

**Why NOT Expressive Code:** `astro-expressive-code` (v0.41.5) is excellent for markdown-based sites, but its primary value -- frame decorations, file tabs, diff markers -- is not needed for v1 docs. Shiki's programmatic API is simpler for our use case of extracting `<pre><code>` blocks from Quill HTML and highlighting them server-side. Expressive Code can be added later if desired.

**Why NOT Prism:** Shiki has better theme support, more languages, and is already bundled with Astro. Prism requires a separate install (`@astrojs/prism`).

**How it works in this architecture:**
1. CMS stores doc content as Quill HTML (with code in `<pre>` tags)
2. At SSR render time, the rehype pipeline extracts code blocks
3. Code runs through `shiki.codeToHtml()` with the chosen theme
4. Highlighted output replaces original `<pre>` blocks
5. Processed HTML is rendered into the page

```typescript
import { codeToHtml } from 'shiki'

async function highlightCodeBlocks(html: string): Promise<string> {
  const highlighted = await codeToHtml(code, {
    lang: 'typescript',
    theme: 'github-dark',
  })
  return highlighted
}
```

### HTML Processing: unified + rehype

| Package | Version | Purpose | Install? |
|---------|---------|---------|----------|
| `unified` | ^11.0 | Processing pipeline orchestrator | Yes |
| `rehype-parse` | ^9.0 | Parse HTML string to AST | Yes |
| `rehype-stringify` | ^10.0 | Serialize AST back to HTML | Yes |
| `rehype-sanitize` | ^6.0 | XSS protection for CMS HTML | Yes |
| `rehype-slug` | ^6.0 | Add `id` attributes to headings | Yes |
| `rehype-autolink-headings` | ^7.0 | Add anchor links to headings | Yes |
| `rehype-external-links` | ^3.0 | Add `target="_blank"` + `rel="noopener"` to external links | Yes |
| **Confidence** | HIGH | | |

**Why unified/rehype:** The CMS outputs Quill HTML. We need to:
1. **Sanitize** it -- Quill 2.0.3 has a known XSS vulnerability (CVE-2025-15056) in HTML export
2. **Add IDs** to headings for deep linking and TOC generation
3. **Extract headings** for the right-column table of contents
4. **Highlight code blocks** with Shiki
5. **Add anchor links** to headings for easy sharing
6. **Mark external links** with proper security attributes

The unified/rehype ecosystem handles all of this in a single pipeline pass. It is the standard approach for HTML-to-HTML transformation in the Node.js ecosystem. All packages are pure JavaScript -- no Node.js native APIs -- so they run perfectly on Cloudflare Workers.

**Why NOT just `set:html` with raw Quill output:** Security. Quill HTML must be sanitized server-side before rendering. `rehype-sanitize` with a custom schema allows safe HTML while stripping dangerous attributes. Never render unsanitized CMS content.

```typescript
import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeStringify from 'rehype-stringify'

const processor = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeSanitize, customSchema)       // XSS protection
  .use(rehypeSlug)                          // id="heading-text"
  .use(rehypeAutolinkHeadings)              // <a href="#heading-text">
  .use(rehypeExternalLinks, {               // external link safety
    target: '_blank',
    rel: ['noopener', 'noreferrer']
  })
  .use(rehypeShikiPlugin)                   // custom: highlight code blocks
  .use(rehypeStringify)
```

### AST Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| `unist-util-visit` | ^5.0 | Walk AST nodes (for TOC extraction, code block finding) |
| `hast-util-to-string` | ^3.0 | Extract text content from HAST nodes |
| **Confidence** | HIGH | |

These are part of the unified ecosystem and are used to build the TOC extractor and the Shiki code-highlighting rehype plugin.

### TOC Generation: Custom extraction from rehype AST

| Attribute | Value |
|-----------|-------|
| **Package** | None additional -- extract from rehype pipeline |
| **Confidence** | HIGH |

**Why no library:** The right-column table of contents is simply a list of `h2` and `h3` elements with their IDs and text. After `rehype-slug` runs, we walk the AST to collect headings. This is ~20 lines of code and does not warrant a dependency like `rehype-toc` or `@microflash/rehype-toc`.

```typescript
import { visit } from 'unist-util-visit'
import { toString } from 'hast-util-to-string'

interface TOCItem {
  depth: number
  id: string
  text: string
}

function extractTOC(tree: Node): TOCItem[] {
  const headings: TOCItem[] = []
  visit(tree, 'element', (node) => {
    if (node.tagName === 'h2' || node.tagName === 'h3') {
      headings.push({
        depth: parseInt(node.tagName[1]),
        id: node.properties.id,
        text: toString(node),
      })
    }
  })
  return headings
}
```

### Client-Side Search: MiniSearch

| Attribute | Value |
|-----------|-------|
| **Package** | `minisearch` |
| **Version** | ^7.1 |
| **Bundle size** | ~7KB minified+gzipped |
| **Zero dependencies** | Yes |
| **Confidence** | MEDIUM |

**Why MiniSearch over alternatives:**

| Criterion | MiniSearch | Fuse.js | FlexSearch | Pagefind |
|-----------|-----------|---------|------------|----------|
| **Full-text search** | Yes | Fuzzy only | Yes | Yes |
| **Bundle size** | ~7KB | ~5KB | ~6KB | ~2KB + WASM |
| **Fuzzy matching** | Yes | Yes (primary) | Partial | Yes |
| **Prefix search** | Yes | No | Yes | Yes |
| **Ranking quality** | Excellent | Poor on docs | Good | Excellent |
| **SSR compatible** | Yes (client) | Yes (client) | Yes (client) | No (build-time) |
| **Zero dependencies** | Yes | Yes | Yes | No |
| **Dynamic content** | Yes | Yes | Yes | No |

**Why NOT Pagefind:** Pagefind generates its search index at build time by crawling static HTML files. Our content is SSR -- pages are rendered on request from the CMS API. There are no static HTML files to crawl at build time. Pagefind is architecturally incompatible with SSR + CMS content.

**Why NOT Fuse.js:** Fuse.js is a fuzzy-match library, not a full-text search engine. It does not tokenize, stem, or rank by relevance. On documentation content, search quality is poor -- a query for "collections" might rank a page mentioning it once higher than the actual collections reference page.

**Why NOT FlexSearch:** FlexSearch has had maintenance gaps and its API is more complex. MiniSearch offers a better balance of performance, API simplicity, and search quality for documentation.

**How it works:**
1. Build a search index endpoint on the CMS (or a server-side Astro endpoint) that returns doc titles, slugs, sections, and excerpts
2. On first search interaction, fetch the index and initialize MiniSearch client-side
3. Search is instant after initial load
4. Cache index in localStorage for repeat visits

```typescript
import MiniSearch from 'minisearch'

const miniSearch = new MiniSearch({
  fields: ['title', 'content', 'section'],
  storeFields: ['title', 'slug', 'section'],
  searchOptions: {
    boost: { title: 3, section: 2 },
    fuzzy: 0.2,
    prefix: true,
  },
})

// Populate from search index endpoint
miniSearch.addAll(docsIndex)
```

### SEO: @astrojs/sitemap

| Attribute | Value |
|-----------|-------|
| **Package** | `@astrojs/sitemap` |
| **Version** | ^3.3 |
| **Confidence** | HIGH |

**Why:** Standard Astro integration for generating `sitemap.xml`. Essential for documentation SEO. Lightweight, official, well-maintained.

**SSR note:** For SSR sites, `@astrojs/sitemap` requires a `customPages` array or `site` set in `astro.config.mjs`. Since doc pages are dynamic (fetched from CMS), we need to provide the URL list. Approach: fetch the docs navigation structure at build time for the sitemap, while still rendering pages via SSR at request time.

### Navigation (sidebar, breadcrumbs, prev/next): No library needed

| Attribute | Value |
|-----------|-------|
| **Package** | None -- custom Astro components |
| **Confidence** | HIGH |

**Why no library:** Documentation navigation is CMS-driven. The sidebar tree, breadcrumb path, and prev/next links are all derived from a navigation structure stored in the CMS. This is a data-fetching + component rendering problem, not something that requires a library.

**Architecture:**
1. CMS stores a navigation structure (ordered tree of sections and pages)
2. Astro fetches the nav tree on each request (cached via CMS KV layer)
3. Sidebar component renders the tree with current-page highlighting
4. Breadcrumbs computed from the current page's path in the tree
5. Prev/next computed from the flattened ordered list
6. All pure Astro components + Tailwind -- no client-side JS needed for nav rendering

---

## Full Dependency List

### New packages to install

| Package | Version | Category |
|---------|---------|----------|
| `unified` | ^11.0 | HTML processing |
| `rehype-parse` | ^9.0 | HTML processing |
| `rehype-stringify` | ^10.0 | HTML processing |
| `rehype-sanitize` | ^6.0 | HTML processing |
| `rehype-slug` | ^6.0 | HTML processing |
| `rehype-autolink-headings` | ^7.0 | HTML processing |
| `rehype-external-links` | ^3.0 | HTML processing |
| `unist-util-visit` | ^5.0 | AST utility |
| `hast-util-to-string` | ^3.0 | AST utility |
| `minisearch` | ^7.1 | Client-side search |
| `@astrojs/sitemap` | ^3.3 | SEO |

### Already available (no install)

| Package | Source | Purpose |
|---------|--------|---------|
| `shiki` | Bundled with Astro | Syntax highlighting |
| `tailwindcss` v4 | Already installed | Styling |
| `@tailwindcss/typography` | Already installed | Prose content styling |
| `unplugin-icons` + `@iconify-json/lucide` | Already installed | Icons |
| JetBrains Mono / Inter / Space Grotesk | Already installed | Fonts |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Docs framework | Custom Astro pages | Starlight | Content comes from CMS API at runtime, not markdown files at build time |
| Content loading | Direct fetch (`flare.ts`) | Astro Content Layer | Content Layer is build-time only; we need runtime SSR |
| Syntax highlighting | Shiki (built-in) | Expressive Code v0.41.5 | Extra dependency; frame/tab features not needed for v1 |
| Syntax highlighting | Shiki (built-in) | Prism | Shiki has better theme support, more languages, already bundled |
| HTML processing | unified/rehype | cheerio | rehype is purpose-built for HTML transformation; cheerio is for scraping |
| HTML processing | unified/rehype | DOMParser | Not available in Cloudflare Workers runtime |
| TOC generation | Custom AST walk | `rehype-toc` / `@microflash/rehype-toc` | 20 lines of code; no dependency warranted |
| Search | MiniSearch | Pagefind | Pagefind requires build-time HTML crawling; incompatible with SSR |
| Search | MiniSearch | Algolia | External service; overkill for project docs; vendor dependency |
| Search | MiniSearch | Fuse.js | Fuzzy-only; poor ranking on documentation content |
| Navigation | Custom components | Any nav library | Navigation is CMS-driven data, not a component concern |

---

## Installation

```bash
# From packages/site/
cd /home/jaime/www/_github/flarecms/packages/site

# HTML processing pipeline
pnpm add unified rehype-parse rehype-stringify rehype-sanitize rehype-slug rehype-autolink-headings rehype-external-links

# AST utilities
pnpm add unist-util-visit hast-util-to-string

# Client-side search
pnpm add minisearch

# SEO
pnpm add @astrojs/sitemap
```

---

## Cloudflare Workers Runtime Compatibility

All server-side packages are compatible with the Cloudflare Workers runtime:

| Package | Runs Where | Compatible? | Notes |
|---------|-----------|-------------|-------|
| unified / rehype-* | Workers (SSR) | Yes | Pure JS, no Node.js native APIs |
| shiki | Workers (SSR) | Yes | Bundled with Astro, WASM-based |
| unist-util-visit | Workers (SSR) | Yes | Pure JS |
| hast-util-to-string | Workers (SSR) | Yes | Pure JS |
| minisearch | Browser only | N/A | Client-side search, never runs on Workers |
| @astrojs/sitemap | Build-time only | N/A | Runs during `astro build`, not at runtime |

**Known incompatibility to avoid:** `DOMParser`, `jsdom`, and `linkedom` are NOT available in Cloudflare Workers. Always use `rehype-parse` (which builds its own AST without DOM APIs) for HTML parsing.

---

## Theme Strategy

**Shiki theme:** Use `github-dark` (already the Astro default) to match the dark-themed docs site. Consider `github-dark-dimmed` for softer contrast if the full-black background is too harsh on code blocks. Both ship with Shiki out of the box.

**Tailwind prose:** Use `@tailwindcss/typography` prose classes for body text styling. Apply `prose-invert` for dark mode. Wrap rendered Quill HTML in a `prose` container for automatic typographic styling of headings, paragraphs, lists, blockquotes, and tables.

```html
<article class="prose prose-invert prose-lg max-w-none">
  <Fragment set:html={processedHtml} />
</article>
```

---

## Sources

- [Astro Syntax Highlighting Docs](https://docs.astro.build/en/guides/syntax-highlighting/) -- verified Shiki built-in, `<Code />` component (HIGH confidence)
- [Astro Content Loader Reference](https://docs.astro.build/en/reference/content-loader-reference/) -- verified build-time only behavior (HIGH confidence)
- [Expressive Code - Code Component](https://expressive-code.com/key-features/code-component/) -- dynamic `<Code>` props confirmed (HIGH confidence)
- [Shiki Official Site](https://shiki.style/) -- programmatic API, theme support (HIGH confidence)
- [rehype-sanitize GitHub](https://github.com/rehypejs/rehype-sanitize) -- HTML sanitization (HIGH confidence)
- [rehype-slug GitHub](https://github.com/rehypejs/rehype-slug) -- heading IDs (HIGH confidence)
- [Quill 2.0.3 XSS Vulnerability (CVE-2025-15056)](https://fluidattacks.com/advisories/diomedes/) -- confirms need for sanitization (HIGH confidence)
- [MiniSearch GitHub](https://github.com/lucaong/minisearch) -- zero-dep search library (MEDIUM confidence, version from search)
- [Pagefind](https://pagefind.app/) -- static-site search; confirmed incompatible with SSR (HIGH confidence)
- [Starlight CMS Discussion #1790](https://github.com/withastro/starlight/discussions/1790) -- community confirms CMS content source limitations (MEDIUM confidence)
- [npm-compare: fuse.js vs flexsearch vs minisearch](https://npm-compare.com/elasticlunr,flexsearch,fuse.js,minisearch) -- feature comparison (MEDIUM confidence)
