# 2026-02-04 - Add News Routes, Pages, Blog Images, and Full Content Rewrite

**Keywords:** [FEATURE] [FRONTEND] [ROUTING] [UI] [COMPONENTS]
**Session:** Late night, Duration (~2 hours)
**Commit:** pending

## What Changed

- File: `src/lib/sonicjs.ts`
  - Added `NewsArticle` interface and `getNewsArticles()` / `getNewsArticleBySlug()` functions
  - Added `Page` interface and `getPages()` / `getPageBySlug()` functions
  - All fetch functions include client-side `status === 'published'` filtering (server-side filters broken in SonicJS v2.8.0)

- File: `src/pages/news/index.astro` (new)
  - News listing page with stacked card layout
  - Category badges (technology=blue, business=amber, general=gray)
  - Author attribution, publish dates

- File: `src/pages/news/[slug].astro` (new)
  - News article detail page with prose typography
  - Category badge, author, date, back navigation

- File: `src/pages/[slug].astro` (new)
  - Dynamic page route for About, Contact, Uses
  - Hero image support with slug-to-image mapping
  - Prose content rendering from SonicJS CMS

- File: `src/pages/index.astro`
  - Added "Latest news" section below "Recent posts"
  - Compact stacked list with category badges and dates
  - Imports both `getBlogPosts` and `getNewsArticles`

- File: `src/pages/blog/[slug].astro`
  - Moved featured image above `<h1>` title (was below header)
  - Reduced max height from 500px to 400px for better proportion

- File: `src/layouts/Layout.astro`
  - Added nav links: News, Uses, About, Contact (with active state highlighting)
  - Nav now has 6 items: Home, Blog, News, Uses, About, Contact

- Directory: `public/images/blog/` (new)
  - 4 OpenAI-generated abstract art images (800x600, mid quality)
  - edge-computing.jpg — Teal network nodes on curved horizon
  - cloudflare-workers.jpg — Orange-violet floating cubes and cloud
  - headless-cms.jpg — Purple/magenta radiant burst
  - desert-tech.jpg — Southwest mesa meets circuit board
  - unsplash-attribution.json — Attribution for initial Unsplash downloads (replaced by AI art)

- Directory: `public/images/pages/` (new)
  - 3 OpenAI-generated abstract art images (800x600, mid quality)
  - about.jpg — Warm coral silhouette with concentric rings
  - contact.jpg — Green/cyan converging light waves
  - uses.jpg — Steel blue dev workspace abstraction

## Why

This commit delivers the full Astro frontend for all SonicJS collections:
- **Blog** — Already had listing/detail pages; now with rewritten content, abstract hero images, and image-above-title layout
- **News** — New collection routes with category-aware UI
- **Pages** — Dynamic route supporting About, Contact, Uses with hero images
- **Navigation** — Complete site nav covering all content types

Blog posts were rewritten with 4 new articles (Edge Computing, Cloudflare Workers vs Lambda, Headless CMS in 2026, Desert Code: El Paso Tech). Post #4 kept as draft.

## Issues Encountered

- **OpenAI API key expired** on first attempt — pivoted to Unsplash stock photos, then regenerated with fresh key
- **R2 media upload failed** — `wrangler.toml` binds `BUCKET` but SonicJS expects `MEDIA_BUCKET`. Images saved as static assets in `public/` instead. Fix: rename binding and restart dev server.
- **SonicJS password hashing** uses `SHA-256(password + "salt-change-in-production")` via Web Crypto. Had to read source code and compute hash with Node.js to set a known password for API auth testing.

## Dependencies

No dependencies added.

## Testing Notes

- All pages verified via curl: /about, /contact, /uses return 200
- Blog images render on homepage cards, blog listing, and detail pages
- Draft post (#4) correctly hidden from frontend
- Nav active states highlight correctly per route
- News listing and detail pages render with category badges

## Next Steps

- [ ] Fix R2 binding: rename `BUCKET` → `MEDIA_BUCKET` in wrangler.toml
- [ ] Deploy SonicJS backend to Cloudflare Workers
- [ ] Deploy Astro frontend to Cloudflare Pages
- [ ] Set `SONICJS_API_URL` env var for production
- [ ] Add responsive mobile nav (hamburger menu)

---

**Branch:** feature/sonicjs-astro-routes
**Issue:** None
**Impact:** HIGH - Complete frontend for all CMS collections with AI-generated imagery
