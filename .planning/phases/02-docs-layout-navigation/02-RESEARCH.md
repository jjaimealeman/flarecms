# Phase 2: Docs Layout & Navigation - Research

**Researched:** 2026-03-08
**Domain:** Astro 5 SSR layouts, Tailwind CSS v4 responsive layout, CMS API data fetching, vanilla JS interactivity
**Confidence:** HIGH

## Summary

This phase builds the docs layout shell in the existing Astro 5 SSR site (`packages/site/`). The site already has a `Layout.astro` wrapper with header/footer, Tailwind CSS v4 with `@tailwindcss/typography`, and a `flare.ts` API client. Phase 1 created `docs` and `docs-sections` collections in the CMS with an `order` field for sorting and a `section` reference field linking docs to their section.

The core challenge is: (1) creating a `DocsLayout.astro` that wraps the existing `Layout.astro` and adds the 3-column grid with sidebar + content + TOC placeholder, (2) fetching both `docs` and `docs-sections` from the CMS API and joining them client-side (the API does not expand references), (3) building dynamic routes for `/docs/[section]/[slug]`, and (4) implementing prev/next navigation that crosses section boundaries using the `order` field.

The Stitch v2 mockups (`stitch-mockups-v2/screen.png`, `screen_2.png`) show the target aesthetic: dark sidebar with section groupings, breadcrumbs above content, TOC on the right, prev/next cards at the bottom.

**Primary recommendation:** Create a dedicated `DocsLayout.astro` component that wraps `Layout.astro`, fetches all sections + docs in the frontmatter, computes navigation data (sidebar tree, breadcrumbs, prev/next), and passes it to child components. Use CSS Grid with Tailwind for the 3-column layout. Use vanilla JS `<script>` tags for mobile menu toggle.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Astro | 5.17+ | SSR framework, layouts, dynamic routes | Already the site framework |
| Tailwind CSS | v4.1 | Utility-first styling, responsive breakpoints | Already configured with `@tailwindcss/vite` |
| `@tailwindcss/typography` | 0.5.x | `prose` classes for markdown content area | Already installed |
| `unplugin-icons` | 23.x | Lucide icons as Astro components | Already configured with `@iconify-json/lucide` |

### No New Dependencies Needed

Everything required is already in the project. The layout is pure Astro components + Tailwind CSS + vanilla JS.

## Architecture Patterns

### Recommended Project Structure
```
packages/site/src/
├── layouts/
│   ├── Layout.astro          # existing site-wide shell (header/footer)
│   └── DocsLayout.astro      # NEW - wraps Layout, adds 3-column grid
├── components/
│   └── docs/
│       ├── DocsSidebar.astro  # NEW - left sidebar navigation
│       ├── Breadcrumbs.astro  # NEW - breadcrumb trail
│       ├── PrevNext.astro     # NEW - prev/next navigation cards
│       └── MobileMenu.astro   # NEW - mobile sidebar overlay
├── lib/
│   └── flare.ts              # EXTEND - add docs/sections fetch functions
├── pages/
│   ├── docs.astro             # REPLACE - becomes /docs index (redirect or landing)
│   └── docs/
│       └── [...slug].astro    # NEW - catch-all for /docs/section-slug/page-slug
└── styles/
    └── global.css             # EXTEND - add docs-specific styles if needed
```

### Pattern 1: DocsLayout Wrapping Layout
**What:** `DocsLayout.astro` uses `Layout.astro` as its outer wrapper, then adds the 3-column grid inside the `<main>` slot.
**When to use:** Every docs page.

```astro
---
// DocsLayout.astro
import Layout from './Layout.astro'
import DocsSidebar from '../components/docs/DocsSidebar.astro'
import Breadcrumbs from '../components/docs/Breadcrumbs.astro'
import PrevNext from '../components/docs/PrevNext.astro'

interface Props {
  title: string
  section: { name: string; slug: string }
  breadcrumbs: Array<{ label: string; href: string }>
  prev?: { title: string; section: string; href: string }
  next?: { title: string; section: string; href: string }
  sections: Array<{ name: string; slug: string; icon?: string; pages: Array<{ title: string; slug: string; href: string }> }>
  currentPath: string
}

const { title, section, breadcrumbs, prev, next, sections, currentPath } = Astro.props
---

<Layout title={title}>
  <div class="grid grid-cols-[260px_1fr_220px] max-w-[1400px] mx-auto min-h-[calc(100vh-65px)]">
    <!-- Sidebar -->
    <DocsSidebar sections={sections} currentPath={currentPath} />

    <!-- Content area -->
    <article class="border-x border-slate-800 px-10 py-8">
      <Breadcrumbs items={breadcrumbs} />
      <div class="prose prose-invert max-w-[65ch] mx-auto">
        <slot />
      </div>
      <PrevNext prev={prev} next={next} />
    </article>

    <!-- TOC placeholder (Phase 3 fills this) -->
    <aside class="sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto py-8 px-4">
      <slot name="toc" />
    </aside>
  </div>
</Layout>
```

### Pattern 2: Data Fetching in Page Frontmatter
**What:** The `[...slug].astro` page fetches all docs + sections, builds the navigation tree, finds the current page, and passes everything to `DocsLayout`.
**When to use:** In the catch-all docs route.

**Critical detail:** The CMS API does NOT expand reference fields. The `docs` collection's `section` field stores a content ID (e.g., `content-docs-sections-abc123`), not the section object. You MUST fetch both collections and join them by matching `doc.data.section` to `section.id`.

```astro
---
// pages/docs/[...slug].astro
import DocsLayout from '../../layouts/DocsLayout.astro'
import { getContent } from '../../lib/flare'

// Fetch both collections
const [sectionsRes, docsRes] = await Promise.all([
  getContent('docs-sections'),
  getContent('docs'),
])

// Filter published, sort by order
const sections = sectionsRes.data
  .filter(s => s.status === 'published')
  .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0))

const docs = docsRes.data
  .filter(d => d.status === 'published')
  .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0))

// Build navigation tree
const navSections = sections.map(section => ({
  name: section.data.name,
  slug: section.data.slug || section.slug,
  icon: section.data.icon,
  pages: docs
    .filter(doc => doc.data.section === section.id)
    .map(doc => ({
      title: doc.data.title,
      slug: doc.data.slug || doc.slug,
      href: `/docs/${section.data.slug || section.slug}/${doc.data.slug || doc.slug}`,
    })),
}))

// Flatten for prev/next
const allPages = navSections.flatMap(s =>
  s.pages.map(p => ({ ...p, sectionName: s.name }))
)

// Find current page from URL
const slugParts = Astro.params.slug?.split('/') || []
const currentPath = Astro.url.pathname
const currentIndex = allPages.findIndex(p => p.href === currentPath)
---
```

### Pattern 3: Responsive Grid with Tailwind CSS v4
**What:** CSS Grid that collapses columns at breakpoints.
**When to use:** The docs layout shell.

```html
<!-- Desktop: 3 columns -->
<!-- Tablet (md): 2 columns, TOC hidden -->
<!-- Mobile (sm): 1 column, sidebar hidden -->
<div class="
  grid
  grid-cols-1
  md:grid-cols-[260px_1fr]
  xl:grid-cols-[260px_1fr_220px]
  max-w-[1400px] mx-auto
">
  <!-- Sidebar: hidden on mobile, shown md+ -->
  <nav class="hidden md:block border-r border-slate-800">...</nav>

  <!-- Content: always visible -->
  <article class="px-6 md:px-10 py-8">...</article>

  <!-- TOC: hidden until xl -->
  <aside class="hidden xl:block border-l border-slate-800 sticky top-[65px] h-[calc(100vh-65px)]">...</aside>
</div>
```

### Pattern 4: Vanilla JS Mobile Menu Toggle
**What:** A `<script>` tag that toggles a slide-in sidebar overlay on mobile.
**When to use:** Phone-sized screens only.

```html
<!-- Floating button (shown on mobile only) -->
<button
  id="docs-menu-btn"
  class="fixed bottom-6 right-6 z-40 md:hidden bg-flare-500 text-slate-950 p-3 rounded-full shadow-lg"
  aria-label="Open navigation"
>
  <svg><!-- menu icon --></svg>
</button>

<!-- Mobile overlay -->
<div id="docs-mobile-nav" class="fixed inset-0 z-50 hidden">
  <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" id="docs-overlay-bg"></div>
  <nav class="absolute left-0 top-0 bottom-0 w-80 bg-slate-900 border-r border-slate-800 overflow-y-auto p-6">
    <!-- Same sidebar content as desktop -->
  </nav>
</div>

<script is:inline>
  const btn = document.getElementById('docs-menu-btn')
  const nav = document.getElementById('docs-mobile-nav')
  const bg = document.getElementById('docs-overlay-bg')

  btn?.addEventListener('click', () => nav?.classList.toggle('hidden'))
  bg?.addEventListener('click', () => nav?.classList.add('hidden'))
</script>
```

### Pattern 5: unplugin-icons Usage in Astro
**What:** Import Lucide icons as Astro components.
**When to use:** Sidebar section icons, breadcrumb separators, prev/next arrows.

```astro
---
// Import specific Lucide icons
import IconChevronRight from '~icons/lucide/chevron-right'
import IconBook from '~icons/lucide/book-open'
import IconArrowLeft from '~icons/lucide/arrow-left'
import IconArrowRight from '~icons/lucide/arrow-right'
import IconMenu from '~icons/lucide/menu'
import IconX from '~icons/lucide/x'
---

<IconChevronRight class="w-4 h-4 text-slate-500" />
```

The `compiler: 'astro'` is already set in `astro.config.mjs` and `@iconify-json/lucide` is installed.

### Anti-Patterns to Avoid
- **Fetching data in each component separately:** Fetch once in the page frontmatter and pass data as props. Astro components run server-side, but parallel fetches in multiple components create unnecessary API calls.
- **Using `getStaticPaths()` for docs routes:** This site uses `output: 'server'` (SSR). Do NOT use `getStaticPaths`. Use `Astro.params` directly in the frontmatter.
- **Storing prev/next as CMS fields:** Per Phase 1 design decision, prev/next is auto-calculated from section order at render time. Never store these as content fields.
- **Using client-side JS framework for sidebar:** Per user decision, use vanilla JS only. No React, Vue, or Svelte.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icons | SVG strings in templates | `unplugin-icons` with `~icons/lucide/*` imports | Already configured, tree-shaken, type-safe |
| Responsive grid | Custom media queries | Tailwind `grid-cols-1 md:grid-cols-[...] xl:grid-cols-[...]` | Already using Tailwind, consistent breakpoints |
| Prose styling | Custom typography CSS | `@tailwindcss/typography` `prose prose-invert` classes | Already installed, handles all edge cases |
| Scroll position tracking (TOC) | Custom scroll observer | Defer to Phase 3 | TOC is a placeholder in this phase |

## Common Pitfalls

### Pitfall 1: Reference Field Returns ID, Not Object
**What goes wrong:** Expecting `doc.data.section` to be `{ name: 'Getting Started', slug: 'getting-started' }` when it's actually `"content-docs-sections-1709123456789-abc123"`.
**Why it happens:** Flare CMS REST API returns raw JSON data without expanding references. The content table stores reference fields as string IDs.
**How to avoid:** Always fetch both `docs` and `docs-sections` collections. Join them by matching `doc.data.section === section.id`.
**Warning signs:** Sidebar shows IDs instead of section names.

### Pitfall 2: API Filters Are Broken (Known Bug)
**What goes wrong:** Using `?filter[status][equals]=published` in the API URL doesn't actually filter.
**Why it happens:** Inherited SonicJS bug documented in CLAUDE.md: "API filters BROKEN -- must filter client-side."
**How to avoid:** Fetch all content, then filter with `.filter(item => item.status === 'published')` in JavaScript. The existing `flare.ts` functions already do this pattern.
**Warning signs:** Draft content appearing on the live site.

### Pitfall 3: Sort Order Not Guaranteed by API
**What goes wrong:** Docs appear in random order in the sidebar.
**Why it happens:** The `?sort=` parameter may not work reliably (related to filter bug). The `docs-sections` collection defaults to `createdAt asc` sort, not `order` field sort.
**How to avoid:** Always sort client-side after fetching: `.sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0))`.
**Warning signs:** Navigation order doesn't match the `order` field values in the CMS.

### Pitfall 4: SSR Route Conflicts with Existing docs.astro
**What goes wrong:** Creating `pages/docs/[...slug].astro` while `pages/docs.astro` exists causes route conflicts.
**Why it happens:** Astro resolves `docs.astro` for `/docs` and `docs/[...slug].astro` for `/docs/*`. The existing `docs.astro` is a placeholder page.
**How to avoid:** Convert `docs.astro` to `docs/index.astro` for the `/docs` landing page. The catch-all `[...slug].astro` handles everything under `/docs/*`.
**Warning signs:** 404 errors on `/docs` or wrong page rendering.

### Pitfall 5: Sticky TOC Height Calculation
**What goes wrong:** TOC column extends beyond viewport or doesn't stick properly.
**Why it happens:** The nav bar is sticky at `top-0` with a height of ~65px. The TOC's `sticky top-0` overlaps behind the nav.
**How to avoid:** Use `sticky top-[65px]` and `h-[calc(100vh-65px)]` for the TOC column. Measure the actual nav height and use that value.
**Warning signs:** TOC content hidden behind the nav bar.

### Pitfall 6: Data Field Access Inconsistency
**What goes wrong:** Accessing `doc.title` vs `doc.data.title` gives different or undefined values.
**Why it happens:** The CMS API returns content with both top-level `title` (from the content table column) and nested `data.title` (from the JSON data field). The top-level `title` comes from the form's first string field, while `data` contains all schema fields. For docs, `data.slug` is the URL slug from the schema, while top-level `slug` is auto-generated.
**How to avoid:** Use `doc.data.slug` for URL slugs (schema-defined) and `doc.data.title` for display titles. Be consistent. Check existing `flare.ts` patterns -- some use `post.data.slug`, others use `post.slug`.
**Warning signs:** Wrong slugs in URLs, missing titles.

## Code Examples

### Docs API Functions for flare.ts

```typescript
// Add to packages/site/src/lib/flare.ts

interface DocsSection {
  id: string
  title: string
  slug: string
  status: string
  data: {
    name: string
    slug: string
    description?: string
    icon?: string
    color?: string
    order?: number
  }
  created_at: number
  updated_at: number
}

interface DocsPage {
  id: string
  title: string
  slug: string
  status: string
  data: {
    title: string
    slug: string
    excerpt?: string
    content: string
    section: string // Reference ID to docs-sections
    order?: number
    status?: string
    lastUpdated?: string
  }
  created_at: number
  updated_at: number
}

export async function getDocsSections(): Promise<DocsSection[]> {
  const response = await fetch(`${API_URL}/api/collections/docs-sections/content`)
  if (!response.ok) throw new Error(`Failed to fetch docs sections: ${response.statusText}`)
  const result: FlareResponse<DocsSection[]> = await response.json()
  return result.data
    .filter(s => s.status === 'published')
    .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0))
}

export async function getDocsPages(): Promise<DocsPage[]> {
  const response = await fetch(`${API_URL}/api/collections/docs/content`)
  if (!response.ok) throw new Error(`Failed to fetch docs: ${response.statusText}`)
  const result: FlareResponse<DocsPage[]> = await response.json()
  return result.data
    .filter(d => d.status === 'published')
    .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0))
}
```

### Navigation Tree Builder

```typescript
// Utility to build sidebar navigation from flat API data

interface NavSection {
  name: string
  slug: string
  icon?: string
  pages: NavPage[]
}

interface NavPage {
  title: string
  slug: string
  href: string
  sectionSlug: string
  sectionName: string
}

function buildNavTree(sections: DocsSection[], docs: DocsPage[]): NavSection[] {
  return sections.map(section => ({
    name: section.data.name,
    slug: section.data.slug || section.slug,
    icon: section.data.icon,
    pages: docs
      .filter(doc => doc.data.section === section.id)
      .map(doc => ({
        title: doc.data.title,
        slug: doc.data.slug || doc.slug,
        href: `/docs/${section.data.slug || section.slug}/${doc.data.slug || doc.slug}`,
        sectionSlug: section.data.slug || section.slug,
        sectionName: section.data.name,
      })),
  }))
}

function flattenForPrevNext(navSections: NavSection[]): NavPage[] {
  return navSections.flatMap(s => s.pages)
}
```

### Sidebar Active State (Astro docs style)

```astro
---
// DocsSidebar.astro
interface Props {
  sections: NavSection[]
  currentPath: string
}
const { sections, currentPath } = Astro.props
---

<nav class="py-6 px-4 overflow-y-auto">
  {sections.map(section => (
    <div class="mb-6">
      <h3 class="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {section.name}
      </h3>
      <ul class="space-y-0.5">
        {section.pages.map(page => (
          <li>
            <a
              href={page.href}
              class:list={[
                'block px-3 py-1.5 rounded-md text-sm transition-colors',
                currentPath === page.href
                  ? 'bg-slate-800 text-flare-400 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              ]}
            >
              {page.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  ))}
</nav>
```

### Breadcrumbs Component

```astro
---
// Breadcrumbs.astro
import IconChevronRight from '~icons/lucide/chevron-right'

interface Props {
  items: Array<{ label: string; href: string }>
}
const { items } = Astro.props
---

<nav aria-label="Breadcrumb" class="mb-6">
  <ol class="flex items-center gap-1.5 text-sm">
    {items.map((item, i) => (
      <>
        {i > 0 && <IconChevronRight class="w-3.5 h-3.5 text-slate-600" />}
        <li>
          {i === items.length - 1 ? (
            <span class="text-slate-300">{item.label}</span>
          ) : (
            <a href={item.href} class="text-slate-500 hover:text-slate-300 transition-colors">
              {item.label}
            </a>
          )}
        </li>
      </>
    ))}
  </ol>
</nav>
```

### Prev/Next Navigation Cards

```astro
---
// PrevNext.astro
import IconArrowLeft from '~icons/lucide/arrow-left'
import IconArrowRight from '~icons/lucide/arrow-right'

interface Props {
  prev?: { title: string; section: string; href: string }
  next?: { title: string; section: string; href: string }
}
const { prev, next } = Astro.props
---

<nav class="mt-16 pt-8 border-t border-slate-800 grid grid-cols-2 gap-4">
  {prev ? (
    <a href={prev.href} class="group flex flex-col p-4 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800/30 transition-all">
      <span class="text-xs text-slate-500 flex items-center gap-1">
        <IconArrowLeft class="w-3 h-3" /> Previous
      </span>
      <span class="mt-1 text-sm font-medium text-slate-200 group-hover:text-flare-400 transition-colors">{prev.title}</span>
      <span class="text-xs text-slate-500">{prev.section}</span>
    </a>
  ) : <div />}
  {next ? (
    <a href={next.href} class="group flex flex-col items-end text-right p-4 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800/30 transition-all">
      <span class="text-xs text-slate-500 flex items-center gap-1">
        Next <IconArrowRight class="w-3 h-3" />
      </span>
      <span class="mt-1 text-sm font-medium text-slate-200 group-hover:text-flare-400 transition-colors">{next.title}</span>
      <span class="text-xs text-slate-500">{next.section}</span>
    </a>
  ) : <div />}
</nav>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 `@apply` + config file | Tailwind v4 `@theme` + CSS-first config | 2025 | Use `@theme` block in global.css for custom values, not `tailwind.config.js` |
| Astro `getStaticPaths()` for SSR | Direct `Astro.params` access in SSR mode | Astro 2+ | No `getStaticPaths` needed when `output: 'server'` |
| `class={condition ? 'a' : 'b'}` | `class:list={[...]}` | Astro 2+ | Use `class:list` for conditional classes |
| Client-side routing (SPA) | Server-rendered pages (MPA) | Astro philosophy | Each docs page is a full server render, no client router |

## Design Decisions (from CONTEXT.md)

### Confirmed by User
- **Column dividers:** Subtle 1px `border-slate-800` between columns (matching mockups)
- **Content max-width:** ~65ch for comfortable prose reading
- **Sticky behavior:** Only TOC column is sticky; sidebar scrolls normally
- **Sidebar style:** Astro docs aesthetic -- all sections expanded, no accordion
- **Active page:** Soft rounded pill highlight (like `bg-slate-800 rounded-md`)
- **Responsive:** Desktop 3-col, Tablet 2-col (TOC collapses), Phone 1-col + floating button
- **Breadcrumbs:** Docs > Section Name > Page Title, all clickable
- **Prev/next:** Full-width cards, crosses section boundaries, hover effects

### Claude's Discretion
- **Column widths:** Recommend sidebar 260px, content fluid, TOC 220px (similar to Astro docs)
- **Mobile sidebar:** Recommend slide-in overlay from left with backdrop blur, triggered by floating bottom-right button
- **Icon strategy:** Recommend hardcoded Lucide icon map for sections (simpler than parsing SVG from CMS `icon` textarea field -- the CMS field can be used as override later)
- **Spacing:** 6px sidebar padding, 10px content padding, consistent with existing site spacing

## Open Questions

1. **Section icon rendering strategy**
   - What we know: The CMS `docs-sections.icon` field is a textarea storing raw SVG markup. The site also has `unplugin-icons` with Lucide icons installed.
   - What's unclear: Whether to render raw SVG from CMS or use a Lucide icon name mapping.
   - Recommendation: Use a hardcoded `sectionIcons` map of slug-to-Lucide-icon-component for reliability. The CMS SVG field can be wired in later as an enhancement. Rendering arbitrary SVG from CMS data has XSS implications.

2. **Docs index page behavior (`/docs`)**
   - What we know: Currently `docs.astro` is a placeholder with GitHub links.
   - What's unclear: Should `/docs` show a landing page or redirect to the first doc page?
   - Recommendation: Show a docs landing page that lists all sections with descriptions (like the current card grid but driven by CMS data). This also serves as the breadcrumb target for "Docs".

3. **Data caching strategy**
   - What we know: Every docs page request will fetch all sections + all docs from the CMS API.
   - What's unclear: Whether this is acceptable performance for SSR on Cloudflare Pages.
   - Recommendation: Accept the double-fetch for now. The CMS has KV caching (cache hits are fast). If needed later, add Astro's `Astro.locals` or a simple in-memory cache. This is an optimization concern, not a blocking issue.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `packages/site/src/` -- all existing layouts, pages, components, styles, config
- Codebase inspection: `packages/cms/src/collections/` -- docs and docs-sections collection schemas
- Codebase inspection: `packages/core/src/routes/api-content-crud.ts` -- API response format
- Codebase inspection: `packages/site/src/lib/flare.ts` -- existing API client patterns
- Stitch v2 mockups: `stitch-mockups-v2/screen.png`, `screen_2.png` -- target visual design

### Secondary (MEDIUM confidence)
- Astro 5 SSR patterns -- based on existing codebase patterns (SSR mode already working)
- Tailwind CSS v4 responsive patterns -- based on existing global.css `@theme` configuration

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and configured in the project
- Architecture: HIGH -- patterns derived from existing codebase conventions and Astro SSR fundamentals
- Pitfalls: HIGH -- identified from codebase inspection (known bugs documented in CLAUDE.md, API response format verified)
- Data model: HIGH -- collection schemas and API behavior verified by reading source code

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- no external dependencies to change)
