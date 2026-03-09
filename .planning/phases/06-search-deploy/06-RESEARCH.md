# Phase 6: Search & Deploy - Research

**Researched:** 2026-03-08
**Domain:** Client-side full-text search (MiniSearch) + Cloudflare Pages deployment verification
**Confidence:** HIGH

## Summary

Phase 6 has two distinct workstreams: (1) implementing a Cmd/Ctrl+K search modal powered by MiniSearch that indexes all CMS-managed content, and (2) verifying the production deployment with seeded content and functional search.

The search implementation requires a dedicated API endpoint that serves a pre-built search index as JSON. Since the site runs in full SSR mode (`output: "server"` in Astro config), every page request hits the CMS API. The search index should be built server-side on a dedicated Astro endpoint (e.g., `/api/search-index.json`) that fetches all docs, blog, and news content, strips markdown syntax, and returns a serialized MiniSearch index. The client downloads this index once and deserializes it with `MiniSearch.loadJSON()` for instant search.

The deployment side is straightforward -- CI/CD is already configured via GitHub Actions (push to main triggers build-core, deploy-cms, deploy-site). The seed script (`packages/cms/scripts/seed-docs.ts`) already supports production URLs. The main work is adding a `--production` confirmation flag and running post-deploy verification checks.

**Primary recommendation:** Build a server-side search index endpoint at `/api/search-index.json`, load it lazily on first search interaction, and implement the modal as a standalone vanilla JS component that replaces the existing placeholder button in `Layout.astro`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| minisearch | ^7.2.0 | Client-side full-text search | Chosen in prior decisions; lightweight (7KB gzipped), zero deps, fuzzy + prefix search, serialization support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | MiniSearch is self-contained; vanilla JS handles all UI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MiniSearch | Pagefind | Incompatible with SSR (build-time static indexing only) -- ruled out in prior decisions |
| MiniSearch | Fuse.js | No serialization support, worse performance at scale -- ruled out in prior decisions |
| Vanilla JS modal | Alpine.js | Adds dependency for one component; vanilla JS matches existing codebase patterns |

**Installation:**
```bash
cd packages/site && pnpm add minisearch
```

## Architecture Patterns

### Recommended Project Structure
```
packages/site/src/
  pages/
    api/
      search-index.json.ts    # SSR endpoint: builds + serializes MiniSearch index
  components/
    SearchModal.astro          # Search modal HTML structure (rendered server-side)
  scripts/
    search.ts                  # Client-side search logic (vanilla JS, loaded via <script>)
  lib/
    search-config.ts           # Shared: index options, document type, strip-markdown util
```

### Pattern 1: Server-Side Index, Client-Side Search
**What:** An Astro SSR endpoint (`/api/search-index.json`) fetches ALL content from the CMS API, builds a MiniSearch index, serializes it with `JSON.stringify(miniSearch)` (uses `toJSON()` internally), and returns the JSON. The client fetches this endpoint lazily and deserializes with `MiniSearch.loadJSON()`.

**When to use:** SSR sites where content changes dynamically and a build-time index is not possible.

**Why this pattern:**
- The site is full SSR (`output: "server"`), so there is no build step that could generate a static index
- MiniSearch provides `toJSON()` / `loadJSON()` specifically for this use case
- The CMS API already returns all content via existing fetch helpers in `flare.ts`
- Index JSON can be cached by the browser (Cache-Control headers) and by Cloudflare's CDN

**Example:**
```typescript
// pages/api/search-index.json.ts
import type { APIRoute } from 'astro'
import MiniSearch from 'minisearch'
import { getDocsPages, getDocsSections } from '../../lib/flare'
import { MINISEARCH_OPTIONS } from '../../lib/search-config'

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')        // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1')   // bold
    .replace(/\*([^*]+)\*/g, '$1')       // italic
    .replace(/`{3}[\s\S]*?`{3}/g, ' ')   // code blocks
    .replace(/`([^`]+)`/g, '$1')         // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // images
    .replace(/>\s+/gm, '')              // blockquotes
    .replace(/[-*+]\s+/gm, '')          // list markers
    .replace(/\d+\.\s+/gm, '')          // numbered lists
    .replace(/\s+/g, ' ')
    .trim()
}

export const GET: APIRoute = async () => {
  const [sections, docs] = await Promise.all([
    getDocsSections(),
    getDocsPages(),
  ])

  const sectionMap = new Map(
    sections.map((s) => [s.id, { name: s.data.name, slug: s.data.slug }])
  )

  const documents = []

  for (const doc of docs) {
    const section = sectionMap.get(doc.data.section)
    if (!section) continue

    const plainContent = stripMarkdown(doc.data.content || '')

    // Main page document
    documents.push({
      id: doc.id,
      title: doc.data.title,
      content: plainContent,
      section: section.name,
      sectionSlug: section.slug,
      slug: doc.data.slug,
      headingId: '',
      headingText: '',
    })

    // Per-heading sub-documents for deep linking
    const headingRegex = /^(#{2,3})\s+(.+)$/gm
    let match
    while ((match = headingRegex.exec(doc.data.content || '')) !== null) {
      const text = match[2].trim()
      const id = text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '')
      documents.push({
        id: `${doc.id}#${id}`,
        title: doc.data.title,
        content: text,
        section: section.name,
        sectionSlug: section.slug,
        slug: doc.data.slug,
        headingId: id,
        headingText: text,
      })
    }
  }

  const miniSearch = new MiniSearch(MINISEARCH_OPTIONS)
  miniSearch.addAll(documents)

  return new Response(JSON.stringify(miniSearch), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}
```

### Pattern 2: Vanilla JS Modal (Matching Existing Codebase Patterns)
**What:** The search modal is an Astro component that renders HTML server-side, with a `<script>` tag for client-side interactivity. This matches the existing pattern used for the mobile menu (Layout.astro), docs mobile sidebar (DocsLayout.astro), copy buttons, tab groups, scroll-spy, and lightbox -- all implemented as inline scripts.

**When to use:** Always in this codebase -- no client-side framework is used.

**Key consideration:** The existing search placeholder button in Layout.astro (line 62-73) must be replaced/enhanced to trigger the search modal. The button already has the correct visual design with `Cmd+K` badge.

### Pattern 3: Lazy Loading the Index
**What:** Don't fetch the search index on page load. Fetch it when the user first interacts with search (clicks the button or presses Cmd/Ctrl+K). Show a brief loading state on first use.

**When to use:** Always -- the index could be several hundred KB for 39+ docs pages with full content.

**Example flow:**
1. User presses Cmd+K or clicks search button
2. Modal opens immediately with empty input focused
3. If index not loaded, show "Loading search index..." briefly
4. Index loads (typically under 500ms from CDN)
5. User types, results appear in real-time with debounce

### Anti-Patterns to Avoid
- **Building index client-side:** Never send raw content to the browser and build the index there. The serialized MiniSearch index is much smaller than raw content and loads faster.
- **Fetching index on every page load:** Lazy-load on first search interaction. Cache in memory for the session.
- **Using `is:inline` for the search script:** The search script needs to import MiniSearch as a module. Use a regular `<script>` tag (without `is:inline`) so Astro bundles it with the MiniSearch dependency. Alternatively, use a `<script type="module">` with dynamic import.
- **Putting search UI in DocsLayout only:** Search should be in the main `Layout.astro` so it works on every page (homepage, blog, etc.), not just docs pages.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full-text search engine | Custom inverted index | MiniSearch | Fuzzy matching, prefix search, relevance ranking, serialization -- all solved |
| Fuzzy matching | Levenshtein distance calculator | MiniSearch `fuzzy: 0.2` option | Tunable edit-distance ratio built into search |
| Match highlighting | Regex-based content highlighting | MiniSearch result + manual substring highlight | Results include matched terms; highlight in snippet by wrapping matches in `<mark>` |
| Keyboard trap management | Manual focus tracking | `inert` attribute on rest of page | Modern browsers support `inert`; falls back gracefully |
| Debouncing | Custom setTimeout logic | Simple debounce helper (5 lines) | Too simple to need a library, too important to skip |
| Markdown stripping for indexing | Full markdown parser | Simple regex replace | Content is trusted CMS markdown, not adversarial input |

**Key insight:** MiniSearch handles all the search engine complexity. The implementation work is primarily UI (modal, keyboard navigation, result rendering) and plumbing (index endpoint, lazy loading).

## Common Pitfalls

### Pitfall 1: MiniSearch `loadJSON` Requires Matching Options
**What goes wrong:** `MiniSearch.loadJSON()` throws if the options (fields, storeFields) don't exactly match what was used when creating the index.
**Why it happens:** The serialized index doesn't store the full configuration; it must be provided again at load time.
**How to avoid:** Define the MiniSearch options in a shared constant (e.g., `lib/search-config.ts`) and import it in both the index endpoint and the client-side code.
**Warning signs:** "Cannot read properties of undefined" errors when searching after loading index.

### Pitfall 2: Astro Script Bundling with `is:inline` vs Module Scripts
**What goes wrong:** Using `<script is:inline>` for search means MiniSearch can't be imported as a module -- it would need to be loaded from a CDN via `<script>` tag.
**Why it happens:** `is:inline` scripts are not processed by Astro's bundler. The existing codebase uses `is:inline` for all interactive scripts, but those don't import npm modules.
**How to avoid:** Use `<script>` (without `is:inline`) for the search script. Astro will bundle it with the MiniSearch dependency. This is the first script in the codebase that needs npm module bundling.
**Warning signs:** "Cannot use import statement" errors, or MiniSearch not being available.

### Pitfall 3: Cmd+K Browser Conflicts
**What goes wrong:** Cmd+K is used by browsers (Firefox: focus URL bar, Chrome: search from URL bar). The search modal may not open if `e.preventDefault()` isn't called correctly.
**Why it happens:** The keydown event must be intercepted before the browser handles it.
**How to avoid:** Use `e.preventDefault()` in the keydown handler. Also support Ctrl+K for non-Mac users. Detect platform for the kbd badge display (Cmd on Mac, Ctrl on others).
**Warning signs:** Pressing Cmd+K focuses the browser URL bar instead of opening search.

### Pitfall 4: Content Has Raw Markdown, Not HTML
**What goes wrong:** The CMS stores content as raw markdown (`doc.data.content`). If you index the markdown directly, search results will contain markdown syntax (`## Heading`, `**bold**`, backtick-wrapped code).
**Why it happens:** The `renderMarkdown()` pipeline converts markdown to HTML at render time, but the raw content in the API response is markdown.
**How to avoid:** Strip markdown syntax with regex in the search index endpoint before indexing. Don't need full markdown rendering for search text extraction -- simple regex is sufficient for trusted CMS content.
**Warning signs:** Search snippets showing `## ` prefixes, `**` markers, or `[link text](url)` syntax.

### Pitfall 5: Forgetting the Mobile Full-Screen Takeover
**What goes wrong:** Search modal looks fine on desktop but is unusable on mobile -- dropdown from header is too small, keyboard covers results.
**Why it happens:** Desktop-first development. The context specifies "full-screen takeover on mobile."
**How to avoid:** Use responsive classes: dropdown on desktop (`lg:` breakpoint), full-screen fixed overlay on mobile. Match the existing mobile menu pattern in Layout.astro.
**Warning signs:** Search results partially hidden by on-screen keyboard, modal too narrow on small screens.

### Pitfall 6: Seed Script Safety for Production
**What goes wrong:** Running the seed script against production accidentally wipes existing content.
**Why it happens:** The `wipeExisting()` function deletes ALL docs content before re-creating. If run carelessly, it destroys production data.
**How to avoid:** Add a `--confirm-production` flag or require `FLARE_CONFIRM_PRODUCTION=yes` env var when the URL is not localhost. Print a warning with the target URL and require confirmation before proceeding.
**Warning signs:** Running `seed-docs.ts https://flare-cms.jjaimealeman.workers.dev` without safeguards.

## Code Examples

### MiniSearch Configuration (Shared Constants)
```typescript
// lib/search-config.ts
// Shared between server (index builder) and client (index loader)
export const SEARCH_FIELDS = ['title', 'content', 'headingText'] as const
export const SEARCH_STORE_FIELDS = [
  'title', 'section', 'sectionSlug', 'slug', 'headingId', 'headingText'
] as const

export const MINISEARCH_OPTIONS = {
  fields: [...SEARCH_FIELDS],
  storeFields: [...SEARCH_STORE_FIELDS],
  searchOptions: {
    boost: { title: 3, headingText: 2 },
    fuzzy: 0.2,
    prefix: true,
    combineWith: 'OR' as const,
  },
}

export interface SearchDocument {
  id: string
  title: string
  content: string
  section: string
  sectionSlug: string
  slug: string
  headingId: string
  headingText: string
}
```

### Keyboard Navigation Pattern
```typescript
// Arrow key navigation in search results (vanilla JS)
function handleKeydown(e: KeyboardEvent, results: HTMLElement[]) {
  const active = document.querySelector('[data-search-active]') as HTMLElement | null

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    const idx = active ? results.indexOf(active) : -1
    const next = results[Math.min(idx + 1, results.length - 1)]
    active?.removeAttribute('data-search-active')
    next?.setAttribute('data-search-active', '')
    next?.scrollIntoView({ block: 'nearest' })
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    const idx = active ? results.indexOf(active) : results.length
    const prev = results[Math.max(idx - 1, 0)]
    active?.removeAttribute('data-search-active')
    prev?.setAttribute('data-search-active', '')
    prev?.scrollIntoView({ block: 'nearest' })
  }

  if (e.key === 'Enter' && active) {
    e.preventDefault()
    const link = active.querySelector('a') as HTMLAnchorElement
    link?.click()
  }
}
```

### Match Highlighting Pattern
```typescript
// Highlight matched terms in search result text
function highlightMatches(text: string, terms: string[]): string {
  if (!terms.length) return escapeHtml(text)

  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')

  return escapeHtml(text).replace(
    regex,
    '<mark class="bg-flare-500/30 text-flare-300 rounded px-0.5">$1</mark>'
  )
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
```

### Debounce Helper
```typescript
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}

// Usage: debounce search input handler at 150ms
const handleInput = debounce((query: string) => {
  if (!searchIndex || query.length < 2) {
    renderResults([])
    return
  }
  const results = searchIndex.search(query, { limit: 10 })
  renderResults(results)
}, 150)
```

### Result URL Construction
```typescript
// Build the href for a search result, including heading anchor
function buildResultHref(result: { sectionSlug: string, slug: string, headingId: string }): string {
  const base = `/docs/${result.sectionSlug}/${result.slug}`
  return result.headingId ? `${base}#${result.headingId}` : base
}
```

### Cmd/Ctrl+K Listener
```typescript
// Global keyboard shortcut
document.addEventListener('keydown', (e) => {
  // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    openSearchModal()
  }

  // Escape closes modal
  if (e.key === 'Escape') {
    closeSearchModal()
  }
})

// Detect platform for kbd badge
const isMac = navigator.platform?.toUpperCase().includes('MAC')
  || navigator.userAgent?.includes('Mac')
const kbdText = isMac ? 'Cmd+K' : 'Ctrl+K'
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pagefind (static indexing) | MiniSearch (runtime indexing) | N/A (SSR constraint) | Pagefind requires static HTML at build time; SSR sites must use runtime indexing |
| Algolia/external search | Self-hosted client-side search | Trend since 2023 | No external dependency, no API keys, works offline after index loads |
| Build-time index generation | SSR endpoint index generation | SSR adoption | Index must be built at request time since there's no static build step |

**Current state of MiniSearch:**
- Version 7.2.0 (latest as of research date)
- Stable, well-maintained library
- 7KB gzipped, zero dependencies
- `toJSON()` / `loadJSON()` / `loadJSONAsync()` for serialization
- Full TypeScript support

## Open Questions

1. **Index size for 39+ pages with full content**
   - What we know: Each doc page can be several KB of markdown. With approximately 39 pages, raw content could be 100-200KB. The serialized MiniSearch index is typically 30-50% the size of raw content.
   - What's unclear: Exact serialized index size with heading-level sub-documents.
   - Recommendation: Build it and measure. If over 500KB, consider indexing only titles + headings + first paragraph instead of full content. The 300s cache-control will keep CDN serving the cached version.

2. **Blog and news content in search**
   - What we know: Context says "Index ALL CMS-managed content: docs, blog, and any future collections." Currently there are blog and news collections.
   - What's unclear: How many blog/news items exist and their content volume.
   - Recommendation: Include all collections in the index endpoint. Results should show a different badge/section for blog vs docs vs news. Build URLs accordingly (`/blog/[slug]` vs `/docs/[section]/[slug]`).

3. **Content contains raw markdown vs rendered HTML**
   - What we know: `doc.data.content` stores raw markdown. The `renderMarkdown()` function in `lib/markdown.ts` converts to HTML.
   - What's unclear: Whether to render markdown to HTML then strip tags, or strip markdown syntax directly.
   - Recommendation: Strip markdown syntax directly with regex for the search index. Full markdown rendering is expensive (Shiki highlighter) and unnecessary for search text extraction. Simple regex is sufficient for trusted CMS markdown.

## Sources

### Primary (HIGH confidence)
- MiniSearch GitHub README: https://github.com/lucaong/minisearch - version, API, features, serialization
- MiniSearch API reference: https://lucaong.github.io/minisearch/classes/MiniSearch.MiniSearch.html - full API including loadJSON, toJSON, search options, constructor options
- Codebase: `packages/site/astro.config.mjs` - confirmed SSR mode (`output: "server"`)
- Codebase: `packages/site/src/layouts/Layout.astro` - existing search placeholder button (lines 62-73)
- Codebase: `packages/site/src/layouts/DocsLayout.astro` - existing vanilla JS patterns for mobile menu, copy buttons, tab groups, scroll-spy, lightbox
- Codebase: `packages/cms/scripts/seed-docs.ts` - existing seed script with API + direct D1 modes
- Codebase: `.github/workflows/deploy.yml` - CI/CD pipeline configuration
- Codebase: `packages/site/src/lib/flare.ts` - CMS API client with docs fetch helpers
- Codebase: `packages/site/src/lib/docs-nav.ts` - navigation tree builder and types
- Codebase: `packages/site/src/lib/markdown.ts` - markdown rendering pipeline with heading extraction

### Secondary (MEDIUM confidence)
- MiniSearch npm: https://www.npmjs.com/package/minisearch - version 7.2.0 confirmed

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - MiniSearch is a locked decision with verified current docs
- Architecture: HIGH - SSR constraint makes server-side index the only viable approach; codebase patterns well understood
- Pitfalls: HIGH - Identified from direct API docs and codebase analysis (script bundling, loadJSON options matching, keyboard conflicts)
- Deployment: HIGH - CI/CD and seed script already exist and were directly inspected

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable domain, MiniSearch is mature)
