---
phase: quick
plan: 001
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - packages/site/src/content.config.ts
  - packages/site/src/pages/blog/index.astro
  - packages/site/src/pages/blog/[slug].astro
  - packages/site/src/pages/news/index.astro
  - packages/site/src/pages/news/[slug].astro
  - packages/site/src/pages/docs/index.astro
  - packages/site/src/pages/docs/[...slug].astro
  - packages/site/src/pages/[slug].astro
  - packages/site/src/pages/sitemap.xml.ts
  - packages/site/src/pages/api/search-index.json.ts
  - packages/site/src/lib/flare.ts

must_haves:
  truths:
    - "Blog listing and detail pages render from Content Layer (getCollection/getEntry)"
    - "News listing and detail pages render from Content Layer"
    - "Docs index and detail pages render from Content Layer"
    - "[slug].astro dynamic pages collection added to content layer and page renders"
    - "Sitemap and search-index use Content Layer instead of direct fetch"
    - "Preview page still works via getDraftContent direct API call"
    - "Static fallback data files (blog-posts.ts, news-articles.ts) are deleted"
    - "lib/flare.ts contains only getDraftContent and its types"
  artifacts:
    - path: "packages/site/src/content.config.ts"
      provides: "pages collection added alongside existing blogPosts, news, docs, docsSections"
      contains: "pages"
    - path: "packages/site/src/lib/flare.ts"
      provides: "Only getDraftContent export (plus DraftContent type)"
  key_links:
    - from: "packages/site/src/pages/blog/index.astro"
      to: "astro:content"
      via: "getCollection('blogPosts')"
      pattern: "getCollection.*blogPosts"
    - from: "packages/site/src/pages/docs/[...slug].astro"
      to: "astro:content"
      via: "getCollection('docs') and getCollection('docsSections')"
      pattern: "getCollection.*docs"
    - from: "packages/site/src/pages/[slug].astro"
      to: "astro:content"
      via: "getCollection('pages')"
      pattern: "getCollection.*pages"
---

<objective>
Migrate all site page files from direct lib/flare.ts fetch calls to Astro Content Layer API (getCollection/getEntry from astro:content). Add a `pages` collection to content.config.ts. After migration, strip lib/flare.ts down to only getDraftContent (preview needs direct API). Delete static data files blog-posts.ts and news-articles.ts.

Purpose: Eliminate redundant runtime API calls. Content is already fetched at build time by flareLoader and stored in Astro's content store. Pages should consume it via getCollection/getEntry for type safety and performance.

Output: All 10 page files using astro:content, clean lib/flare.ts, no static data files.
</objective>

<execution_context>
@/home/jaime/.claude/get-shit-done/workflows/execute-plan.md
@/home/jaime/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/site/src/content.config.ts
@packages/site/src/lib/flare.ts
@packages/astro/src/loader.ts
@packages/site/src/pages/blog/index.astro
@packages/site/src/pages/blog/[slug].astro
@packages/site/src/pages/news/index.astro
@packages/site/src/pages/news/[slug].astro
@packages/site/src/pages/docs/index.astro
@packages/site/src/pages/docs/[...slug].astro
@packages/site/src/pages/[slug].astro
@packages/site/src/pages/preview/[collection]/[slug].astro
@packages/site/src/pages/sitemap.xml.ts
@packages/site/src/pages/api/search-index.json.ts
@packages/site/src/data/blog-posts.ts
@packages/site/src/data/news-articles.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add pages collection to content.config.ts and migrate all page files to Content Layer</name>
  <files>
    packages/site/src/content.config.ts
    packages/site/src/pages/blog/index.astro
    packages/site/src/pages/blog/[slug].astro
    packages/site/src/pages/news/index.astro
    packages/site/src/pages/news/[slug].astro
    packages/site/src/pages/docs/index.astro
    packages/site/src/pages/docs/[...slug].astro
    packages/site/src/pages/[slug].astro
    packages/site/src/pages/sitemap.xml.ts
    packages/site/src/pages/api/search-index.json.ts
  </files>
  <action>
    **Step 1: Add `pages` collection to content.config.ts**

    Add a new `pages` collection using flareLoader with collection: 'pages', same pattern as existing ones. Add it to the exports object.

    ```ts
    const pages = defineCollection({
      loader: flareLoader({
        apiUrl: API_URL,
        collection: 'pages',
        apiToken: API_TOKEN,
        filter: { status: 'published' },
      }),
    })

    export const collections = { blogPosts, news, docs, docsSections, pages }
    ```

    **Step 2: Migrate blog pages (index + [slug])**

    `blog/index.astro`:
    - Replace `import { getBlogPosts } from '../../lib/flare'` and `import { getAllStaticBlogPosts } from '../../data/blog-posts'` with `import { getCollection } from 'astro:content'`
    - Replace the try/catch CMS + static fallback logic with: `const allPosts = await getCollection('blogPosts')`
    - Map posts to the same normalized shape. The flareLoader flattens data so fields are at `entry.data.title`, `entry.data.slug`, `entry.data.excerpt`, `entry.data.content`, `entry.data.featuredImage`, `entry.data.publishedAt`, `entry.data._createdAt`. The entry also has `entry.id`.
    - Remove ALL static data fallback logic. No more `getAllStaticBlogPosts()`.
    - Sort by `_createdAt` descending (the loader doesn't guarantee order).

    `blog/[slug].astro`:
    - Replace imports with `import { getCollection } from 'astro:content'`
    - Get slug from `Astro.params`, then: `const allPosts = await getCollection('blogPosts')` and `const entry = allPosts.find(p => p.data.slug === slug)`
    - (Cannot use `getEntry('blogPosts', slug)` because the entry ID is the CMS content ID, not the slug.)
    - If no entry found, return 404.
    - Map `entry.data.*` fields to the template variables. No more `post.data.data.title` nesting -- flareLoader already flattened.
    - Remove ALL static data fallback. No more `getStaticBlogPost()`.

    **Step 3: Migrate news pages (index + [slug])**

    Same pattern as blog. Replace flare.ts + static data imports with `getCollection('news')`.

    `news/index.astro`:
    - `const allArticles = await getCollection('news')`
    - Map to normalized shape using `entry.data.title`, `entry.data.category`, `entry.data.author`, `entry.data.publish_date`, `entry.data._createdAt`
    - Remove static fallback.

    `news/[slug].astro`:
    - Find by slug in collection, same pattern as blog/[slug].
    - Remove static fallback.

    **Step 4: Migrate docs pages (index + [...slug])**

    `docs/index.astro`:
    - Replace `import { getDocsSections, getDocsPages } from '../../lib/flare'` with `import { getCollection } from 'astro:content'`
    - `const sections = await getCollection('docsSections')`
    - `const docs = await getCollection('docs')`
    - Sort sections by `entry.data.order` (ascending). Sort docs by `entry.data.order`.
    - The existing `buildNavTree` helper expects objects shaped like `{ id, title, slug, status, data: { name, slug, ... } }`. Content Layer entries have shape `{ id, data: { name, slug, ... } }`. You need to adapt the call OR adapt the data shape passed to buildNavTree. The simplest approach: map Content Layer entries to match the expected shape:
      ```ts
      const sectionsForNav = sections.map(s => ({
        id: s.id,
        title: s.data.name || '',
        slug: s.data.slug,
        status: s.data._status || 'published',
        data: s.data,
      }))
      ```
      Same for docs entries. This preserves compatibility with buildNavTree without modifying that utility.

    `docs/[...slug].astro`:
    - Same approach: replace flare.ts imports with getCollection calls.
    - Map entries to match the shape expected by buildNavTree and the rest of the template logic.
    - The template accesses `doc.data.content`, `doc.id`, `section.data.slug`, `section.id` -- these all exist on Content Layer entries since flareLoader flattens into `entry.data.*`.

    **Step 5: Migrate [slug].astro (dynamic pages)**

    - Replace `import { getPageBySlug } from '../lib/flare'` with `import { getCollection } from 'astro:content'`
    - `const allPages = await getCollection('pages')`
    - `const page = allPages.find(p => p.data.slug === slug)`
    - If not found, return 404.
    - Template accesses `page.data.title`, `page.data.meta_description`, `page.data.content` -- these map directly to Content Layer entry.data fields.

    **Step 6: Migrate sitemap.xml.ts**

    - Replace `import { getDocsSections, getDocsPages } from '../lib/flare'` with `import { getCollection } from 'astro:content'`
    - `const sections = await getCollection('docsSections')`
    - `const docs = await getCollection('docs')`
    - Adapt the section/doc mapping: Content Layer entries have `entry.data.slug` (flattened), `entry.id`, `entry.data.section`.
    - Remove the try/catch around fetching (getCollection doesn't throw on empty -- returns []).

    **Step 7: Migrate api/search-index.json.ts**

    - Replace all flare.ts imports with `import { getCollection } from 'astro:content'`
    - `const sections = await getCollection('docsSections')`
    - `const docs = await getCollection('docs')`
    - `const blogPosts = await getCollection('blogPosts')`
    - `const newsArticles = await getCollection('news')`
    - Adapt field access: Content Layer entries have `entry.data.*` (flattened). For example `doc.data.section` (string ID), `doc.data.content`, `doc.data.title`, `doc.data.slug`.
    - The sectionMap construction: `sections.map(s => [s.id, { name: s.data.name, slug: s.data.slug }])` -- this maps directly since flareLoader puts name/slug in data.
    - Blog posts: `post.data.content`, `post.data.title`, `post.data.slug`, `post.id`.
    - News: `article.data.content`, `article.data.title`, `article.title` becomes `article.data.title`, `article.slug` becomes `article.data.slug`.

    **DO NOT touch** `packages/site/src/pages/preview/[collection]/[slug].astro` -- it must keep using `getDraftContent` from lib/flare.ts (preview requires direct API call with token).

    **DO NOT touch** `packages/site/src/pages/integrations/astro.astro` -- it has no flare.ts imports (static marketing page).
  </action>
  <verify>
    Run `cd /home/jaime/www/_github/flarecms && pnpm build` to verify the site builds without errors. Check that no file in `packages/site/src/pages/` (except preview/) imports from `../../lib/flare` or `../lib/flare`. Run: `grep -r "from.*lib/flare" packages/site/src/pages/ --include="*.astro" --include="*.ts" | grep -v preview`
  </verify>
  <done>
    All 10 page files use `getCollection` from `astro:content`. Preview page unchanged. Build passes. No flare.ts imports remain in pages except preview.
  </done>
</task>

<task type="auto">
  <name>Task 2: Clean up lib/flare.ts and delete static data files</name>
  <files>
    packages/site/src/lib/flare.ts
    packages/site/src/data/blog-posts.ts
    packages/site/src/data/news-articles.ts
  </files>
  <action>
    **Step 1: Strip lib/flare.ts down to getDraftContent only**

    Replace the entire file contents with ONLY:
    - The API_URL and API_TOKEN constants (getDraftContent needs them)
    - The `DraftContent` interface
    - The `getDraftContent` function

    Remove ALL other exports: `getBlogPosts`, `getBlogPostBySlug`, `getNewsArticles`, `getNewsArticleBySlug`, `getPages`, `getPageBySlug`, `getCollections`, `getDocsSections`, `getDocsPages`, `getContent`, and all their associated interfaces (`FlareResponse`, `BlogPost`, `NewsArticle`, `Page`, `DocsSection`, `DocsPage`).

    The resulting file should be ~30 lines.

    **Step 2: Delete static data files**

    Delete these files (list for user since rm is sandbox-blocked):
    - `packages/site/src/data/blog-posts.ts`
    - `packages/site/src/data/news-articles.ts`

    Do NOT delete `packages/site/src/data/homepage.ts` or `packages/site/src/data/comparison.ts` -- those are marketing/reference data, not CMS content.

    **Step 3: Verify no dead imports remain**

    Search all .astro and .ts files under packages/site/src for any remaining imports from the deleted data files or removed flare.ts exports. Fix any found.
  </action>
  <verify>
    Run `cd /home/jaime/www/_github/flarecms && pnpm build` to verify clean build. Run: `grep -r "blog-posts\|news-articles" packages/site/src/ --include="*.astro" --include="*.ts" | grep -v node_modules | grep "from.*data/"` should return nothing. Run: `grep -r "getBlogPosts\|getNewsArticles\|getDocsSections\|getDocsPages\|getPageBySlug\|getPages\|getCollections\|getContent" packages/site/src/lib/flare.ts` should return nothing.
  </verify>
  <done>
    lib/flare.ts contains only getDraftContent + DraftContent type (~30 lines). blog-posts.ts and news-articles.ts are deleted. Build passes clean. No dead imports anywhere.
  </done>
</task>

</tasks>

<verification>
1. `pnpm build` passes with zero errors
2. No pages (except preview) import from lib/flare.ts
3. lib/flare.ts exports only getDraftContent
4. No imports from data/blog-posts.ts or data/news-articles.ts exist anywhere
5. content.config.ts exports 5 collections: blogPosts, news, docs, docsSections, pages
</verification>

<success_criteria>
- All page files consume content via `getCollection`/`getEntry` from `astro:content`
- Preview page still uses getDraftContent directly (unchanged)
- lib/flare.ts is minimal (~30 lines, getDraftContent only)
- Static data files deleted
- Clean build with no errors
</success_criteria>

<output>
After completion, create `.planning/quick/001-migrate-pages-to-content-layer/001-SUMMARY.md`
</output>
