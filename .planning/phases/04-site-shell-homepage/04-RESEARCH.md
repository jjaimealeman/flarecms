# Phase 4: Site Shell & Homepage - Research

**Researched:** 2026-03-08
**Domain:** Astro site shell (header, footer, homepage, SEO, sitemap)
**Confidence:** HIGH

## Summary

This phase redesigns the existing homepage (Hero, Stats, Features, CodeShowcase, BlogPreview, OpenSourceCTA components), enhances the site shell (header/footer in Layout.astro), adds SEO meta tags with Open Graph support, implements a dynamic SSR sitemap endpoint, adds "Edit in CMS" links to docs pages, and creates three legal pages (ToS, Privacy, CoC).

The codebase already has a functional Layout.astro with a sticky nav, footer, and homepage components. This phase is primarily a **redesign and enhancement** of existing code, not greenfield work. The Stitch v2 mockups show the target design direction: dark navy theme with cyan/orange accents, version badge hero, feature cards grid, comparison table, and bottom CTA -- which closely matches the existing component structure.

**Primary recommendation:** Refactor existing Layout.astro header/footer and homepage components in-place. Use a custom SSR sitemap endpoint (not @astrojs/sitemap) since the site runs in `output: "server"` mode. Build SEO as a reusable `<SEO>` Astro component.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| astro | ^5.17.1 | Framework | Already in use |
| tailwindcss | ^4.1.18 | Styling | Already in use |
| @tailwindcss/typography | ^0.5.19 | Prose styling | Already in use |
| unplugin-icons | ^23.0.1 | Lucide icons | Already in use |
| @iconify-json/lucide | ^1.2.95 | Icon set | Already in use |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | - | - | No new dependencies needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom SEO component | astro-seo npm package | Custom is simpler -- just a few meta tags in a component, no dependency needed |
| Custom sitemap endpoint | @astrojs/sitemap | @astrojs/sitemap cannot discover dynamic SSR routes -- custom endpoint is required |
| astro-meta-tags | Manual meta tags | Extra dependency for what amounts to 20 lines of template code |

**Installation:**
```bash
# No new packages needed -- everything is already installed
```

## Architecture Patterns

### Current Project Structure (Relevant Files)
```
packages/site/src/
├── components/
│   ├── Hero.astro           # REDESIGN - hero section
│   ├── Features.astro       # REDESIGN - feature cards
│   ├── Stats.astro          # KEEP or REPLACE with comparison table
│   ├── CodeShowcase.astro   # KEEP - schema + API demo
│   ├── BlogPreview.astro    # KEEP - blog posts preview
│   ├── OpenSourceCTA.astro  # REDESIGN - bottom CTA
│   ├── SEO.astro            # NEW - reusable SEO meta component
│   ├── ComparisonTable.astro # NEW - Flare vs Traditional CMS
│   └── docs/
│       ├── EditInCms.astro  # NEW - edit link component
│       └── ...existing...
├── data/
│   └── homepage.ts          # UPDATE - nav links, features, comparison data
├── layouts/
│   ├── Layout.astro         # REDESIGN - header + footer
│   └── DocsLayout.astro     # UPDATE - add EditInCms component
├── pages/
│   ├── index.astro          # UPDATE - component composition
│   ├── sitemap.xml.ts       # NEW - dynamic SSR sitemap endpoint
│   ├── terms.astro          # NEW - Terms of Service
│   ├── privacy.astro        # NEW - Privacy Policy
│   └── code-of-conduct.astro # NEW - Code of Conduct
└── styles/
    └── global.css           # Minor additions if needed
```

### Pattern 1: Reusable SEO Component
**What:** A single Astro component that accepts props for title, description, OG image, URL, etc. and renders all meta tags.
**When to use:** Every page includes this in `<head>`.
**Example:**
```astro
---
// src/components/SEO.astro
interface Props {
  title: string
  description?: string
  ogImage?: string
  ogType?: string
  canonicalUrl?: string
  noindex?: boolean
}

const {
  title,
  description = 'Edge-native headless CMS for Cloudflare Workers.',
  ogImage = '/images/og-default.png',
  ogType = 'website',
  canonicalUrl,
  noindex = false,
} = Astro.props

const siteUrl = Astro.site?.toString().replace(/\/$/, '') || 'https://flare-site.pages.dev'
const pageUrl = canonicalUrl || `${siteUrl}${Astro.url.pathname}`
const fullTitle = `${title} | Flare CMS`
const ogImageUrl = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`
---

<title>{fullTitle}</title>
<meta name="description" content={description} />
<link rel="canonical" href={pageUrl} />
{noindex && <meta name="robots" content="noindex, nofollow" />}

<!-- Open Graph -->
<meta property="og:title" content={fullTitle} />
<meta property="og:description" content={description} />
<meta property="og:type" content={ogType} />
<meta property="og:url" content={pageUrl} />
<meta property="og:image" content={ogImageUrl} />
<meta property="og:site_name" content="Flare CMS" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={fullTitle} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={ogImageUrl} />
```

### Pattern 2: Dynamic SSR Sitemap Endpoint
**What:** A server-rendered endpoint at `/sitemap.xml` that fetches all published content from the CMS API and generates XML on request.
**When to use:** Required because the site uses `output: "server"` and @astrojs/sitemap cannot discover dynamic routes.
**Example:**
```typescript
// src/pages/sitemap.xml.ts
import type { APIRoute } from 'astro'
import { getDocsSections, getDocsPages, getBlogPosts } from '../lib/flare'

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site?.toString().replace(/\/$/, '') || 'https://flare-site.pages.dev'

  const [sections, docs, posts] = await Promise.all([
    getDocsSections(),
    getDocsPages(),
    getBlogPosts(),
  ])

  // Static pages
  const staticPages = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/docs', priority: '0.9', changefreq: 'weekly' },
    { loc: '/blog', priority: '0.8', changefreq: 'weekly' },
    { loc: '/terms', priority: '0.2', changefreq: 'yearly' },
    { loc: '/privacy', priority: '0.2', changefreq: 'yearly' },
    { loc: '/code-of-conduct', priority: '0.2', changefreq: 'yearly' },
  ]

  // Dynamic docs pages
  const docsUrls = docs.map((doc) => {
    const section = sections.find((s) => s.id === doc.data.section)
    const sectionSlug = section?.data.slug || section?.slug || ''
    const pageSlug = doc.data.slug || doc.slug
    return {
      loc: `/docs/${sectionSlug}/${pageSlug}`,
      priority: '0.7',
      changefreq: 'monthly',
    }
  })

  const allUrls = [...staticPages, ...docsUrls]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map((u) => `  <url>
    <loc>${siteUrl}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
```

### Pattern 3: Edit in CMS Link
**What:** A small component that builds the admin edit URL from the content item ID and the `PUBLIC_FLARE_API_URL` env var.
**When to use:** On every docs page, placed near the breadcrumbs or at the bottom of content.
**Example:**
```astro
---
// src/components/docs/EditInCms.astro
interface Props {
  contentId: string
  collectionName?: string
}

const { contentId } = Astro.props

// Build admin URL from the same env var used by the API client
const apiUrl = import.meta.env.PUBLIC_FLARE_API_URL || 'http://localhost:8787'
const editUrl = `${apiUrl}/admin/content/${contentId}/edit`
---

<a
  href={editUrl}
  target="_blank"
  rel="noopener noreferrer"
  class="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-flare-400 transition-colors"
>
  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
  Edit in CMS
</a>
```

### Pattern 4: Sticky Header with Mobile Hamburger
**What:** The existing sticky header pattern in Layout.astro needs mobile responsive nav (hamburger menu).
**When to use:** All pages share this layout.
**Key details:**
- Header is already sticky: `sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl`
- Mobile nav should use the same overlay pattern as DocsLayout.astro (slide-in panel with backdrop)
- Search bar is a placeholder only (Phase 6 implements search)
- Current nav links are in `data/homepage.ts` as `navLinks` array

### Anti-Patterns to Avoid
- **Installing @astrojs/sitemap for SSR sites:** It cannot discover dynamic routes in server mode. Use a custom endpoint.
- **Separate Header/Footer components without Layout integration:** Keep header and footer inside Layout.astro to avoid prop-drilling the current path for active nav highlighting.
- **Using `import.meta.env.SITE` for sitemap URL:** This requires `site` in astro.config.mjs. Set it there, but also have a fallback in the sitemap endpoint.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icon rendering | SVG strings in templates | unplugin-icons with `~icons/lucide/*` | Already set up, tree-shakes unused icons |
| Responsive grid | Custom media queries | Tailwind responsive prefixes (`md:`, `lg:`, `xl:`) | Already the project pattern |
| Dark theme | CSS custom properties toggle | Single dark theme (already established) | Site is dark-only, no toggle needed |
| Scroll behavior | Custom JS scroll listeners | CSS `scroll-behavior: smooth` | Already in global.css |
| Font loading | Manual @font-face | @fontsource-variable packages | Already installed and configured |

**Key insight:** The site already has a complete design system (colors, fonts, spacing patterns) in global.css. All new components should use the existing design tokens (`flare-500`, `cyan-400`, `slate-*` scale, `font-heading`, `font-mono`).

## Common Pitfalls

### Pitfall 1: @astrojs/sitemap with SSR Mode
**What goes wrong:** Installing @astrojs/sitemap and finding it generates an empty or incomplete sitemap because it cannot crawl dynamic routes in `output: "server"` mode.
**Why it happens:** The integration works by analyzing the build output for static pages. In SSR mode, pages are generated on-demand so there is nothing to crawl at build time.
**How to avoid:** Use a custom `src/pages/sitemap.xml.ts` API endpoint that fetches published content from the CMS API and generates XML on the fly.
**Warning signs:** Empty sitemap-0.xml or missing dynamic pages in generated sitemap.

### Pitfall 2: Edit in CMS URL Environment Mismatch
**What goes wrong:** Edit links point to localhost in production or to the production URL in local dev.
**Why it happens:** The `PUBLIC_FLARE_API_URL` env var is set differently in `.env` (localhost) vs `wrangler.jsonc` (production). If not properly configured, links break.
**How to avoid:** Use the same `import.meta.env.PUBLIC_FLARE_API_URL` pattern already established in `src/lib/flare.ts`. The URL is already correctly configured: `http://localhost:8787` locally (from .env), `https://flare-cms.jjaimealeman.workers.dev` in production (from wrangler.jsonc vars).
**Warning signs:** Edit links 404 or open wrong admin instance.

### Pitfall 3: Mobile Nav Breaking Docs Mobile Nav
**What goes wrong:** Adding a hamburger menu to Layout.astro conflicts with the existing mobile menu in DocsLayout.astro (which has its own floating button + slide-in panel).
**Why it happens:** Both use fixed-position overlays with z-index layering. ID collisions or z-index conflicts cause one to be hidden behind the other.
**How to avoid:** The Layout.astro hamburger should collapse to show the main site nav links only. The DocsLayout.astro mobile menu handles the docs sidebar. Use distinct IDs and ensure z-index ordering is correct (Layout nav overlay > DocsLayout overlay, or hide Layout hamburger on docs pages).
**Warning signs:** Two hamburger buttons visible on docs pages, or clicking one opens the other.

### Pitfall 4: Missing `site` in astro.config.mjs
**What goes wrong:** `Astro.site` returns undefined, breaking canonical URLs and sitemap generation.
**Why it happens:** The `site` property is not set in astro.config.mjs (currently absent).
**How to avoid:** Add `site: 'https://flare-site.pages.dev'` to astro.config.mjs. Always provide a fallback in code.
**Warning signs:** Canonical URLs and OG URLs show "undefined" in rendered HTML.

### Pitfall 5: Comparison Table Responsiveness
**What goes wrong:** The comparison table (Flare vs Traditional CMS) is too wide on mobile, causing horizontal scroll or content overflow.
**Why it happens:** Tables with multiple columns don't naturally stack on mobile.
**How to avoid:** Use a mobile-first design: stack comparison items vertically on small screens, switch to table layout on `md:` and above. Or use a card-based comparison on mobile.
**Warning signs:** Horizontal scrollbar on mobile viewport.

## Code Examples

### Existing Admin Edit URL Pattern (from CMS core)
```
/admin/content/${contentId}/edit
```
Source: `packages/core/src/templates/pages/admin-content-list.template.ts` line 109.

The content ID is available as `doc.id` in the docs page template (`[...slug].astro` line 69-74). The `doc` variable is already resolved and contains the content item with its `id` field.

### Existing Nav Links Data Structure
```typescript
// src/data/homepage.ts
export const navLinks = [
  { label: 'Docs', href: '/docs' },
  { label: 'Blog', href: '/blog' },
  // ... update these for Phase 4
]
```

### Header Active Link Pattern (Already Implemented)
```astro
<a
  href={link.href}
  class:list={[
    'text-sm font-medium transition-colors',
    currentPath.startsWith(link.href)
      ? 'text-flare-500'
      : 'text-slate-400 hover:text-slate-50'
  ]}
>
  {link.label}
</a>
```

### Content ID Access in Docs Template
```astro
// In [...slug].astro, the doc object is already fetched:
const doc = docs.find(
  (d) => (d.data.slug || d.slug) === pageSlug && d.data.section === sectionRecord?.id,
)
// doc.id is the content ID needed for the edit URL
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @astrojs/sitemap for all sites | Custom sitemap endpoint for SSR | Astro 3+ SSR mode | Must use custom endpoint for dynamic routes |
| astro-seo package | Manual meta tags in component | Always viable | No dependency needed for simple meta tags |
| SEO component libraries | Built-in Astro head management | Astro 5 | Astro's head deduplication handles meta tags natively |

**No deprecated/outdated approaches in current codebase.**

## Open Questions

1. **OG Image Asset**
   - What we know: An OG image should exist at `/images/og-default.png` or similar
   - What's unclear: No OG image currently exists in `public/images/`
   - Recommendation: Create a simple branded OG image (1200x630px) as part of this phase, or use the existing `logo.svg`

2. **`site` Configuration in astro.config.mjs**
   - What we know: `site` is not currently set in the Astro config
   - What's unclear: Whether the production URL should be `https://flare-site.pages.dev` or a custom domain
   - Recommendation: Set `site: 'https://flare-site.pages.dev'` for now, can be changed later

3. **Header Nav Links**
   - What we know: Current navLinks include Blog, News, Changelog, About -- some of which may not be relevant to the docs site focus
   - What's unclear: Which links the user wants to keep vs remove
   - Recommendation: Claude's discretion per CONTEXT.md -- adjust based on what pages actually exist and serve the docs site mission

## Sources

### Primary (HIGH confidence)
- Codebase analysis: Layout.astro, DocsLayout.astro, homepage components, flare.ts API client
- Codebase analysis: CMS admin edit URL pattern from `admin-content-list.template.ts`
- Codebase analysis: wrangler.jsonc env vars configuration

### Secondary (MEDIUM confidence)
- [Astro sitemap integration docs](https://docs.astro.build/en/guides/integrations-guide/sitemap/) - confirmed SSR limitation
- [Colin McNamara - Fixing Astro Sitemap SSR Mode](https://colinmcnamara.com/blog/fixing-astro-sitemap-ssr-mode) - custom endpoint pattern
- [Astro SEO best practices](https://eastondev.com/blog/en/posts/dev/20251202-astro-seo-complete-guide/) - meta tag patterns

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, everything already installed
- Architecture: HIGH - refactoring existing components, patterns verified in codebase
- Pitfalls: HIGH - SSR sitemap limitation confirmed via official docs and GitHub issues
- Edit in CMS: HIGH - admin URL pattern verified directly in CMS source code
- SEO: HIGH - standard meta tag patterns, well-documented

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- no fast-moving dependencies)
