# Phase 3: Content Rendering & Route - Research

**Researched:** 2026-03-08
**Domain:** Markdown-to-HTML rendering pipeline (Shiki, unified/rehype, vanilla JS interactivity)
**Confidence:** HIGH

## Summary

Phase 3 transforms raw CMS markdown into polished documentation pages. The current rendering is a single `marked.parse()` call that produces plain HTML with no syntax highlighting, callouts, or interactive features. The target state is a unified/rehype pipeline that processes markdown server-side (at SSR time) into richly annotated HTML, with lightweight vanilla JS on the client for copy buttons, tabs, scroll-spy, and lightbox.

The core technical challenge is running Shiki on Cloudflare Pages (Workers runtime). Shiki's default Oniguruma engine requires WASM, which has import constraints on Workers. However, Shiki provides a **JavaScript RegExp engine** (`shiki/engine/javascript`) that eliminates WASM entirely -- it transpiles Oniguruma patterns to native JS regex at runtime. This is the recommended approach for Cloudflare deployments and all built-in languages are supported as of Shiki 3.9.1.

The rendering pipeline replaces `marked` with `unified` + `remark-parse` + `remark-rehype` + `rehype-pretty-code` (for Shiki highlighting with meta string support) + `rehype-callouts` (for GitHub-style alerts) + `rehype-slug` + `rehype-autolink-headings` + `rehype-stringify`. This pipeline processes the CMS markdown string into final HTML at SSR request time. All processing is server-side; no highlighting JS ships to the client.

**Primary recommendation:** Replace `marked.parse()` with a unified/rehype pipeline using `rehype-pretty-code` (Shiki with JS engine) for code blocks and `rehype-callouts` for GitHub-style alerts, plus vanilla JS client scripts for copy buttons, tabs, scroll-spy, and lightbox.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `unified` | ^11 | Pipeline orchestrator | De facto standard for markdown/HTML processing |
| `remark-parse` | ^11 | Markdown parser | Official unified markdown parser |
| `remark-rehype` | ^11 | Markdown-to-HTML bridge | Standard bridge between remark and rehype |
| `rehype-pretty-code` | ^0.14 | Syntax highlighting via Shiki | Best meta string support (title, line highlight, word highlight); unstyled/data-attribute approach |
| `shiki` | ^3.x | Syntax highlighting engine | Required peer dep of rehype-pretty-code; provides themes and JS engine |
| `rehype-callouts` | ^1.x | GitHub-style blockquote alerts | Supports custom titles, multiple themes (github, obsidian), CSS custom properties |
| `rehype-slug` | ^6 | Add IDs to headings | Standard approach for heading anchors |
| `rehype-autolink-headings` | ^7 | Add anchor links to headings | Pairs with rehype-slug for deep linking |
| `rehype-stringify` | ^10 | HTML serializer | Final step: HAST to HTML string |
| `rehype-raw` | ^7 | Parse raw HTML in markdown | Needed when `remark-rehype` has `allowDangerousHtml: true` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `rehype-external-links` | ^3 | Add target=_blank + icon to external links | Context decision: external links open in new tab |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `rehype-pretty-code` | `@shikijs/rehype` | rehype-pretty-code has better meta string parsing (title, line highlight, word highlight) out of the box; @shikijs/rehype needs custom transformers for the same features |
| `rehype-callouts` | `rehype-github-alerts` | rehype-github-alerts does NOT support custom titles; rehype-callouts supports `> [!NOTE] Custom Title` syntax |
| `rehype-callouts` | `remark-github-markdown-alerts` | remark-level plugin; rehype-callouts works at rehype level which is simpler in our pipeline |
| unified pipeline | Keep `marked` + marked extensions | marked lacks the rehype plugin ecosystem; would need custom extensions for each feature |

**Installation:**
```bash
pnpm add unified remark-parse remark-rehype rehype-pretty-code shiki rehype-callouts rehype-slug rehype-autolink-headings rehype-stringify rehype-raw rehype-external-links
```

**Remove:**
```bash
pnpm remove marked
```

## Architecture Patterns

### Recommended Project Structure

```
packages/site/src/
├── lib/
│   ├── flare.ts              # Existing CMS API client (unchanged)
│   ├── docs-nav.ts           # Existing nav tree builder (unchanged)
│   └── markdown.ts           # NEW: unified pipeline + render function
├── pages/docs/
│   └── [...slug].astro       # UPDATE: use renderMarkdown() instead of marked.parse()
├── components/docs/
│   ├── TableOfContents.astro  # NEW: right-sidebar TOC component
│   └── ... (existing components)
├── scripts/
│   ├── copy-button.ts        # NEW: vanilla JS for code copy buttons
│   ├── tabs.ts               # NEW: vanilla JS for tabbed code examples
│   ├── scroll-spy.ts         # NEW: vanilla JS for TOC active heading
│   └── lightbox.ts           # NEW: vanilla JS for image click-to-expand
└── styles/
    ├── code-blocks.css        # NEW: Shiki dual theme + code block styling
    ├── callouts.css           # NEW: callout box styling (or use rehype-callouts theme)
    └── prose.css              # NEW: typography + content enhancements
```

### Pattern 1: Server-Side Markdown Rendering Pipeline

**What:** A single async function that takes raw markdown and returns HTML + extracted headings (for TOC).
**When to use:** In the `[...slug].astro` page, replacing `marked.parse()`.

```typescript
// src/lib/markdown.ts
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeCallouts from 'rehype-callouts'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeRaw from 'rehype-raw'
import rehypeStringify from 'rehype-stringify'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

const jsEngine = createJavaScriptRegexEngine()

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeCallouts, { theme: 'github' })
  .use(rehypePrettyCode, {
    theme: {
      dark: 'catppuccin-mocha',
      light: 'catppuccin-latte',
    },
    defaultLang: 'plaintext',
    getHighlighter: (options) =>
      import('shiki').then(({ createHighlighter }) =>
        createHighlighter({ ...options, engine: jsEngine })
      ),
  })
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, {
    behavior: 'append',
    properties: { className: ['heading-anchor'], ariaLabel: 'Link to this heading' },
  })
  .use(rehypeExternalLinks, {
    target: '_blank',
    rel: ['noopener', 'noreferrer'],
  })
  .use(rehypeStringify)

export async function renderMarkdown(markdown: string): Promise<string> {
  const result = await processor.process(markdown)
  return String(result)
}
```

### Pattern 2: TOC Extraction from Headings

**What:** Extract h2/h3 headings from the rendered HTML for the right-sidebar TOC.
**When to use:** Alongside rendering, to populate the TOC slot in DocsLayout.

```typescript
// Option: Extract headings from HTML string post-render using regex
// (simpler than a custom rehype plugin for this use case)
export function extractHeadings(html: string): Array<{ id: string, text: string, level: number }> {
  const headings: Array<{ id: string, text: string, level: number }> = []
  const regex = /<h([23])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h[23]>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    // Strip HTML tags from heading text
    const text = match[3].replace(/<[^>]+>/g, '').trim()
    headings.push({ id: match[2], text, level: parseInt(match[1]) })
  }
  return headings
}
```

### Pattern 3: Dual Shiki Theme with CSS prefers-color-scheme

**What:** rehype-pretty-code with dual themes outputs CSS variables. A media query switches themes.
**When to use:** Global CSS loaded on all docs pages.

```css
/* Dual theme: light default, dark via prefers-color-scheme */
@media (prefers-color-scheme: dark) {
  .shiki,
  .shiki span {
    color: var(--shiki-dark) !important;
    background-color: var(--shiki-dark-bg) !important;
  }
}
```

Note: `rehype-pretty-code` wraps code blocks in `<figure data-rehype-pretty-code-figure>`. Style the `<pre>` and `<code>` elements within.

### Pattern 4: Tab Authoring Syntax (Claude's Discretion)

**Recommendation:** Use consecutive fenced code blocks with a special meta string marker. This is the simplest approach that works within standard markdown and the rehype pipeline without needing a custom remark plugin.

**Authoring syntax:**
````markdown
```ts tab="TypeScript"
const greeting: string = 'hello'
```

```js tab="JavaScript"
const greeting = 'hello'
```
````

**Implementation:** A custom rehype plugin (or post-processing step) detects consecutive `<figure>` elements where the code block meta contained `tab="Label"`. It wraps them in a `<div class="tab-group" data-tabs>` container with tab buttons generated from the labels.

**Alternative considered:** A wrapper syntax like `:::tabs` requires a remark plugin to parse non-standard markdown. The meta string approach keeps everything in standard fenced code blocks and is processed at the rehype (HTML) level, which is simpler.

### Pattern 5: Scroll-Spy with IntersectionObserver

**What:** Vanilla JS that observes heading elements and highlights the corresponding TOC link.
**When to use:** On docs pages with the right-sidebar TOC visible.

```javascript
// Vanilla JS scroll-spy using IntersectionObserver
const headings = document.querySelectorAll('h2[id], h3[id]')
const tocLinks = document.querySelectorAll('[data-toc-link]')

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        tocLinks.forEach((link) => link.classList.remove('active'))
        const activeLink = document.querySelector(
          `[data-toc-link="${entry.target.id}"]`
        )
        if (activeLink) activeLink.classList.add('active')
      }
    })
  },
  { rootMargin: '-80px 0px -80% 0px' }
)

headings.forEach((heading) => observer.observe(heading))
```

### Anti-Patterns to Avoid

- **Don't process markdown client-side:** All highlighting happens server-side at SSR time. No Shiki bundle ships to the browser.
- **Don't use Shiki's Oniguruma WASM engine on Cloudflare Pages:** Use the JavaScript RegExp engine (`shiki/engine/javascript`) to avoid WASM import issues.
- **Don't configure Shiki in astro.config.mjs:** The site fetches markdown from the CMS API at runtime, not from .md files. Astro's built-in markdown config only applies to .md/.mdx file imports. The unified pipeline runs in page component code.
- **Don't create the unified processor per-request:** Create it once at module level and reuse. The `unified()` chain is stateless and reentrant; the Shiki highlighter singleton is shared.
- **Don't add a JS framework for tabs/copy/scroll-spy:** These are simple DOM operations. Vanilla JS with `<script is:inline>` or separate script files keeps the bundle minimal.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Syntax highlighting | Custom regex-based highlighter | Shiki via rehype-pretty-code | 200+ languages, accurate tokenization, VS Code-grade themes |
| Code block meta parsing (title, lines) | Custom marked extension | rehype-pretty-code meta string parser | Handles title, line ranges, word highlighting, captions |
| GitHub-style callout parsing | Custom blockquote regex | rehype-callouts | Handles `> [!TYPE] Title` syntax, multiple themes, CSS custom properties |
| Heading ID generation | Custom slug function | rehype-slug | Handles duplicates, special characters, unicode |
| Heading anchor links | Custom link injection | rehype-autolink-headings | Configurable behavior (prepend, append, wrap), accessible |
| External link detection | Custom URL parser | rehype-external-links | Handles relative vs absolute, target, rel attributes |
| Dual theme CSS variables | Custom theme switching | Shiki's built-in CSS variable output | Automatic `--shiki-dark` / `--shiki-dark-bg` variables |

**Key insight:** The unified/rehype ecosystem has battle-tested plugins for every rendering feature in this phase. The pipeline is the composition of these plugins -- the custom code is only the glue (pipeline setup) and the client-side interactivity (copy button, tabs, scroll-spy, lightbox).

## Common Pitfalls

### Pitfall 1: Shiki WASM Fails on Cloudflare Workers/Pages

**What goes wrong:** Default Shiki uses Oniguruma WASM engine. On Cloudflare Workers, WASM cannot be initialized from binary data the normal way. Build fails or runtime error.
**Why it happens:** Cloudflare Workers has restrictions on WebAssembly instantiation.
**How to avoid:** Use `createJavaScriptRegexEngine()` from `shiki/engine/javascript`. Pass it to the highlighter via rehype-pretty-code's `getHighlighter` option. All built-in languages are supported.
**Warning signs:** Build errors mentioning `.wasm` files, or runtime errors about WebAssembly.

### Pitfall 2: Unified Pipeline Created Per-Request Causes Slow SSR

**What goes wrong:** Each page request creates a new `unified()` pipeline and initializes a new Shiki highlighter. Shiki initialization loads all theme/language data and takes 100-500ms.
**Why it happens:** Highlighter creation is expensive. If the pipeline is inside the Astro page frontmatter (re-executed each request), it re-initializes every time.
**How to avoid:** Define the `processor` at module level in `markdown.ts`. The unified processor and Shiki's `getSingletonHighlighter` will be reused across requests within the same Worker isolate.
**Warning signs:** TTFB over 500ms on docs pages, slow after cold starts.

### Pitfall 3: rehype-pretty-code Needs rehype-raw Before It

**What goes wrong:** If markdown contains raw HTML (like `<div>` or `<br>`), and `remarkRehype` is used with `allowDangerousHtml: true`, the raw HTML nodes need to be parsed into HAST before rehype-pretty-code processes the tree.
**Why it happens:** Without `rehype-raw`, raw HTML stays as text nodes. rehype-pretty-code may not find code blocks correctly.
**How to avoid:** Add `rehype-raw` after `remark-rehype` and before `rehype-pretty-code` in the plugin chain.
**Warning signs:** Raw HTML in markdown appears as escaped text in output.

### Pitfall 4: Plugin Order Matters in Unified Pipeline

**What goes wrong:** Heading anchors don't get generated, or callouts aren't processed, because plugins run in wrong order.
**Why it happens:** Each plugin transforms the HAST tree. If `rehype-slug` runs before `rehype-pretty-code`, the code block processing may interfere with heading IDs. If callouts run after stringify, they have no effect.
**How to avoid:** Correct order: remarkParse -> remarkRehype -> rehypeRaw -> rehypeCallouts -> rehypePrettyCode -> rehypeSlug -> rehypeAutolinkHeadings -> rehypeExternalLinks -> rehypeStringify.
**Warning signs:** Some features work but others silently don't.

### Pitfall 5: Tab Preference Persistence Conflicts Between Tab Groups

**What goes wrong:** User selects "pnpm" in a package manager tab group, and it incorrectly affects a TypeScript/JavaScript tab group.
**Why it happens:** Naive localStorage key like `tabPreference` stores a single value. Different tab groups have different valid options.
**How to avoid:** Use tab group categories. Store preferences as `{ "package-manager": "pnpm", "language": "typescript" }`. Match tab labels to categories. Fall back to first tab if stored preference doesn't match any tab in the group.
**Warning signs:** Tabs appear broken or show wrong content after navigating between pages with different tab groups.

### Pitfall 6: Copy Button Copies HTML Instead of Plain Text

**What goes wrong:** Copy button grabs `innerHTML` of the code block, including Shiki's `<span>` tags, rather than plain code text.
**Why it happens:** Using `element.innerHTML` instead of `element.textContent`.
**How to avoid:** Use `element.textContent` or `element.innerText` to extract plain code from the `<code>` element inside `<pre>`.
**Warning signs:** Pasted code contains HTML tags.

## Code Examples

### Complete Markdown Rendering Module

```typescript
// Source: Shiki docs (shiki.matsu.io), rehype-pretty-code docs (rehype-pretty.pages.dev)
// packages/site/src/lib/markdown.ts

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeCallouts from 'rehype-callouts'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeRaw from 'rehype-raw'
import rehypeStringify from 'rehype-stringify'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

const jsEngine = createJavaScriptRegexEngine()

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeCallouts, { theme: 'github' })
  .use(rehypePrettyCode, {
    theme: {
      dark: 'catppuccin-mocha',
      light: 'catppuccin-latte',
    },
    defaultLang: { block: 'plaintext', inline: 'plaintext' },
    keepBackground: false,
    getHighlighter: async (options) => {
      const { createHighlighter } = await import('shiki')
      return createHighlighter({ ...options, engine: jsEngine })
    },
  })
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, {
    behavior: 'append',
    properties: {
      className: ['heading-anchor'],
      ariaHidden: true,
      tabIndex: -1,
    },
    content: {
      type: 'element',
      tagName: 'span',
      properties: { className: ['anchor-icon'] },
      children: [{ type: 'text', value: '#' }],
    },
  })
  .use(rehypeExternalLinks, {
    target: '_blank',
    rel: ['noopener', 'noreferrer'],
  })
  .use(rehypeStringify)

export interface RenderResult {
  html: string
  headings: Array<{ id: string; text: string; level: number }>
}

export async function renderMarkdown(markdown: string): Promise<RenderResult> {
  const result = await processor.process(markdown)
  const html = String(result)
  const headings = extractHeadings(html)
  return { html, headings }
}

function extractHeadings(html: string): Array<{ id: string; text: string; level: number }> {
  const headings: Array<{ id: string; text: string; level: number }> = []
  const regex = /<h([23])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h[23]>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    const text = match[3].replace(/<[^>]+>/g, '').trim()
    headings.push({ id: match[2], text, level: parseInt(match[1]) })
  }
  return headings
}
```

### Copy Button (Vanilla JS)

```javascript
// Source: common pattern, no library needed
// packages/site/src/scripts/copy-button.ts

document.querySelectorAll('[data-rehype-pretty-code-figure]').forEach((figure) => {
  const pre = figure.querySelector('pre')
  const code = figure.querySelector('code')
  if (!pre || !code) return

  const button = document.createElement('button')
  button.className = 'copy-btn'
  button.setAttribute('aria-label', 'Copy code')
  button.textContent = 'Copy'

  button.addEventListener('click', async () => {
    const text = code.textContent || ''
    await navigator.clipboard.writeText(text)
    button.textContent = 'Copied!'
    button.classList.add('copied')
    setTimeout(() => {
      button.textContent = 'Copy'
      button.classList.remove('copied')
    }, 2000)
  })

  // Position relative to pre
  pre.style.position = 'relative'
  pre.appendChild(button)
})
```

### Tab System (Vanilla JS)

```javascript
// packages/site/src/scripts/tabs.ts

// Initialize all tab groups
document.querySelectorAll('[data-tab-group]').forEach((group) => {
  const tabs = group.querySelectorAll('[data-tab]')
  const panels = group.querySelectorAll('[data-tab-panel]')
  const category = group.getAttribute('data-tab-group')

  // Restore preference
  const prefs = JSON.parse(localStorage.getItem('tabPreferences') || '{}')
  const preferred = prefs[category]

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const value = tab.getAttribute('data-tab')

      // Update this group
      tabs.forEach((t) => t.classList.remove('active'))
      panels.forEach((p) => p.classList.add('hidden'))
      tab.classList.add('active')
      group.querySelector(`[data-tab-panel="${value}"]`)?.classList.remove('hidden')

      // Persist preference
      prefs[category] = value
      localStorage.setItem('tabPreferences', JSON.stringify(prefs))

      // Sync other groups with same category on the page
      document.querySelectorAll(`[data-tab-group="${category}"]`).forEach((otherGroup) => {
        if (otherGroup === group) return
        const otherTab = otherGroup.querySelector(`[data-tab="${value}"]`)
        if (otherTab) otherTab.click()
      })
    })
  })

  // Activate preferred or first tab
  const activeTab = preferred
    ? group.querySelector(`[data-tab="${preferred}"]`) || tabs[0]
    : tabs[0]
  if (activeTab) activeTab.click()
})
```

### Dual Theme CSS for Code Blocks

```css
/* packages/site/src/styles/code-blocks.css */

/* rehype-pretty-code figure wrapper */
[data-rehype-pretty-code-figure] {
  position: relative;
  margin: 1.5rem 0;
}

/* Code block title (from meta string title="filename.ts") */
[data-rehype-pretty-code-title] {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-family: var(--font-mono);
  border-bottom: 1px solid rgb(51 65 85 / 0.5);
  color: rgb(148 163 184);
}

/* Pre element */
[data-rehype-pretty-code-figure] pre {
  overflow-x: auto;
  padding: 1rem 0;
  border-radius: 0.5rem;
  border: 1px solid rgb(51 65 85 / 0.5);
}

/* Line padding */
[data-rehype-pretty-code-figure] [data-line] {
  padding: 0 1rem;
}

/* Line highlighting */
[data-highlighted-line] {
  background-color: rgb(99 102 241 / 0.1);
  border-left: 2px solid rgb(99 102 241);
}

/* Language label */
[data-rehype-pretty-code-figure] [data-language]::before {
  content: attr(data-language);
  position: absolute;
  top: 0.25rem;
  right: 0.75rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: rgb(148 163 184 / 0.6);
}

/* Dual theme switching via prefers-color-scheme */
@media (prefers-color-scheme: dark) {
  .shiki,
  .shiki span {
    color: var(--shiki-dark) !important;
    background-color: var(--shiki-dark-bg) !important;
  }
}

/* Copy button */
.copy-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  border-radius: 0.25rem;
  background: rgb(51 65 85 / 0.5);
  color: rgb(148 163 184);
  border: 1px solid rgb(71 85 105 / 0.5);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

[data-rehype-pretty-code-figure]:hover .copy-btn,
.copy-btn:focus {
  opacity: 1;
}

.copy-btn.copied {
  color: rgb(34 197 94);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `marked.parse()` for all markdown | unified/rehype pipeline with plugins | Phase 3 (now) | Enables syntax highlighting, callouts, heading anchors |
| highlight.js / Prism (runtime) | Shiki (server-side, VS Code-grade) | Shiki v1.0 (2024) | Zero client JS for highlighting, accurate tokenization |
| Shiki Oniguruma WASM engine | Shiki JavaScript RegExp engine | Shiki v1.x+ | No WASM dependency, works on Cloudflare Workers |
| Custom callout regex parsing | rehype-callouts plugin (github theme) | rehype-callouts v1 (2024) | Standard GitHub syntax, CSS custom properties, custom titles |
| rehype-highlight (highlight.js) | rehype-pretty-code (Shiki) | 2024 | Meta string support (title, line highlight), dual themes |

**Deprecated/outdated:**
- `marked` for this use case: adequate for simple rendering but lacks the plugin ecosystem for code blocks, callouts, heading anchors
- `highlight.js` / `Prism`: client-side highlighting ships JS + theme CSS to browser; Shiki does it server-side
- Shiki's WASM engine on edge runtimes: Use the JS engine instead

## Open Questions

1. **rehype-pretty-code `getHighlighter` option with JS engine**
   - What we know: rehype-pretty-code accepts a `getHighlighter` function. Shiki's `createHighlighter` accepts an `engine` option.
   - What's unclear: Whether rehype-pretty-code's internal use of the highlighter is fully compatible with the JS engine (no known issues, but not explicitly documented).
   - Recommendation: Implement it and test. If issues arise, fall back to using `@shikijs/rehype` with Shiki transformers for meta string support.

2. **Tab authoring syntax details**
   - What we know: Using code block meta string `tab="Label"` is the simplest approach. Needs a custom rehype plugin to detect consecutive figures and wrap them.
   - What's unclear: Exact implementation of the custom rehype plugin for tab grouping.
   - Recommendation: Build a small custom rehype plugin (`rehype-tabs`) that walks the HAST tree looking for consecutive `[data-rehype-pretty-code-figure]` elements with tab metadata, then wraps them in a tab group container.

3. **Lightbox implementation**
   - What we know: Context says click-to-expand modal for images. No framework allowed (vanilla JS).
   - What's unclear: Best lightweight vanilla JS approach.
   - Recommendation: A simple vanilla JS lightbox: click image, create overlay + enlarged image, click overlay to close. Under 30 lines of JS.

4. **rehype-callouts CSS import in Astro**
   - What we know: rehype-callouts provides theme CSS at `rehype-callouts/theme/github`. Astro supports CSS imports.
   - What's unclear: Whether the pre-built CSS needs modification to match the site's dark theme.
   - Recommendation: Import the github theme CSS, then override colors with CSS custom properties to match the site palette.

## Sources

### Primary (HIGH confidence)
- [Shiki Dual Themes](https://shiki.matsu.io/guide/dual-themes) - CSS variables approach, prefers-color-scheme
- [Shiki JavaScript RegExp Engine](https://shiki.matsu.io/guide/regex-engines) - WASM-free engine, all languages supported
- [Shiki Cloudflare Workers](https://shiki.matsu.io/guide/install#cloudflare-workers) - WASM constraints, JS engine recommendation
- [@shikijs/rehype](https://shiki.matsu.io/packages/rehype) - Rehype integration API
- [rehype-pretty-code](https://rehype-pretty.pages.dev/) - Full API: meta strings, dual themes, titles, line highlighting
- [rehype-callouts](https://github.com/lin-stephanie/rehype-callouts) - GitHub theme, custom title support, CSS custom properties
- [rehype-slug](https://www.npmjs.com/package/rehype-slug) - v6, heading ID generation
- [rehype-autolink-headings](https://www.npmjs.com/package/rehype-autolink-headings) - v7, anchor link generation

### Secondary (MEDIUM confidence)
- [Unified pipeline patterns](https://ondrejsevcik.com/blog/building-perfect-markdown-processor-for-my-blog) - Plugin ordering, string processing
- [IntersectionObserver scroll-spy](https://css-tricks.com/table-of-contents-with-intersectionobserver/) - Standard pattern for TOC highlighting

### Tertiary (LOW confidence)
- Tab authoring via meta strings: No established library for this specific pattern; custom rehype plugin needed. Design based on rehype-pretty-code's data attribute output.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official docs; Shiki JS engine confirmed for Cloudflare
- Architecture (pipeline): HIGH - unified pipeline pattern is well-established; string processing confirmed working
- Architecture (tabs): MEDIUM - Custom rehype plugin needed; pattern is sound but untested
- Pitfalls: HIGH - WASM constraint verified from Shiki docs; plugin order from multiple sources
- Client-side JS: HIGH - IntersectionObserver, clipboard API, localStorage are standard web APIs

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (unified ecosystem is stable; Shiki JS engine is established)
