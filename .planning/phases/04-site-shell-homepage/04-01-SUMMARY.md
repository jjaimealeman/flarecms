---
phase: 04-site-shell-homepage
plan: 01
subsystem: site-frontend
tags: [seo, sitemap, meta-tags, edit-link, astro]

dependency-graph:
  requires: [03-content-rendering-route]
  provides: [seo-component, edit-in-cms-link, sitemap-endpoint, site-config]
  affects: [04-02, 04-03]

tech-stack:
  added: []
  patterns:
    - Reusable SEO head component with OG/Twitter meta tags
    - Dynamic SSR sitemap endpoint (not @astrojs/sitemap)
    - Edit-in-CMS link using PUBLIC_FLARE_API_URL env var

file-tracking:
  key-files:
    created:
      - packages/site/src/components/SEO.astro
      - packages/site/src/components/docs/EditInCms.astro
      - packages/site/src/pages/sitemap.xml.ts
    modified:
      - packages/site/astro.config.mjs
      - packages/site/src/pages/docs/[...slug].astro

decisions:
  - id: 04-01-seo-component
    description: "Custom SEO component instead of astro-seo package"
    rationale: "Simple meta tag rendering needs no dependency"
  - id: 04-01-ssr-sitemap
    description: "Custom SSR sitemap endpoint instead of @astrojs/sitemap"
    rationale: "@astrojs/sitemap cannot discover dynamic routes in server mode"
  - id: 04-01-og-default
    description: "Default OG image set to /logo.svg"
    rationale: "No custom OG image exists yet; logo.svg is available in public/"

metrics:
  duration: 3min
  completed: 2026-03-08
---

# Phase 4 Plan 1: SEO, Edit-in-CMS, and Sitemap Foundation Summary

SEO component with OG/Twitter meta tags, EditInCms link on docs pages, and dynamic SSR sitemap endpoint with CMS API integration.

## What Was Done

### Task 1: Create SEO component and add site config
- Added `site: 'https://flare-site.pages.dev'` to astro.config.mjs
- Created `SEO.astro` with title, description, OG, and Twitter Card meta tags
- Supports noindex, custom canonical URL, and configurable OG image
- Uses `Astro.site` with fallback for all URL generation

### Task 2: Create EditInCms component and wire into docs pages
- Created `EditInCms.astro` with pencil SVG icon and "Edit in CMS" text
- Builds admin URL from `PUBLIC_FLARE_API_URL` env var (works in dev and prod)
- Wired into `[...slug].astro` after h1 heading with `not-prose` wrapper

### Task 3: Create dynamic SSR sitemap endpoint
- Created `sitemap.xml.ts` API route exporting GET handler
- Includes 6 static pages with priority and changefreq values
- Fetches docs sections and pages from CMS API for dynamic URLs
- Graceful try/catch fallback: returns static-only sitemap if API unavailable
- Returns XML with `Content-Type: application/xml` and 1hr cache

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SEO approach | Custom Astro component | No dependency needed for simple meta tags |
| Sitemap approach | Custom SSR endpoint | @astrojs/sitemap cannot discover dynamic SSR routes |
| Default OG image | /logo.svg | No custom OG image exists; logo.svg available |
| Canonical URL source | Astro.site + pathname | Clean URLs with trailing slash cleanup |

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 876331e | feat | Create SEO component and add site config |
| 3f18775 | feat | Create EditInCms component and wire into docs pages |
| dc59f20 | feat | Create dynamic SSR sitemap endpoint |

## Next Phase Readiness

**Unblocked for 04-02 (Layout redesign):** SEO component ready for Layout.astro head integration.
**Unblocked for 04-03 (Homepage redesign):** SEO component ready for page-level meta tags.
**No blockers or concerns.**
