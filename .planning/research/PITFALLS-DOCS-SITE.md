# Domain Pitfalls: CMS-Driven Documentation Site

**Domain:** Developer documentation website powered entirely by a headless CMS (FlareCMS) instead of static markdown files
**Researched:** 2026-03-08
**Confidence:** HIGH for Quill/editor pitfalls (verified against source code and GitHub issues), MEDIUM for architecture/caching pitfalls (verified against Cloudflare docs and community reports)

---

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

---

### Pitfall 1: Quill Cannot Do What Documentation Needs

**What goes wrong:**
Quill's `code-block` format has no built-in UI for specifying the programming language. It relies on highlight.js auto-detection, which frequently guesses wrong (e.g., a TypeScript config snippet gets detected as YAML). The saved HTML also has known bugs: language text appearing above the code block, indentation being deleted on re-render, and code blocks splitting into two when multiple newlines are entered (GitHub issues #4300, #4448). For a docs site that is 60%+ code examples, this makes content authoring miserable and output unreliable.

**Why it happens:**
Quill was designed for general-purpose rich text (blog posts, emails), not technical documentation. Its code-block is a single undifferentiated format -- there is no concept of "this is JavaScript" vs "this is bash" at the UI level. The Syntax module can highlight, but language declaration in the UI is not supported without custom blot work.

**Consequences:**
- Code examples render with wrong or no syntax highlighting
- Authors cannot specify language, making code tabs (JS/TS/Python) impossible out of the box
- Saved content loses formatting on re-edit (round-trip fidelity broken)
- Documentation looks unprofessional compared to any markdown-based docs site

**Prevention:**
1. **Do not rely on Quill's default code-block for docs content.** Either:
   - Build a custom Quill blot that adds a language selector dropdown to code blocks (moderate effort, fragile)
   - Switch the docs collection to use the EasyMDE (markdown) plugin instead of Quill -- FlareCMS already has this plugin (`easy-mdx`). Markdown with fenced code blocks (`\`\`\`typescript`) solves language specification natively
   - Build a hybrid: use Quill for prose fields but a dedicated CodeMirror/Monaco widget for code examples stored as separate structured fields
2. **Render-side fix:** Process stored HTML through a server-side syntax highlighter (Shiki or Prism) during SSR, using heuristics or metadata to determine language. This patches output but does not fix the authoring experience.

**Detection:**
- Create 5 test docs with code in JS, TS, bash, JSON, and SQL. If any renders with wrong highlighting or loses formatting after save/reload, you have hit this.
- Ask: "Can an author specify the language of a code block?" If the answer is "no" or "they have to edit the Delta JSON," the DX is broken.

**Phase to address:** Phase 1 (Content Modeling). Must decide editor strategy before writing any content. This is a blocker -- do not defer.

**Confidence:** HIGH (verified against FlareCMS Quill plugin source code at `packages/core/src/plugins/core-plugins/quill-editor/index.ts` and Quill GitHub issues)

---

### Pitfall 2: No Callout/Admonition Primitives in Rich Text

**What goes wrong:**
Every serious docs site needs callout boxes: "Warning: This will delete your data," "Tip: You can also use the shorthand syntax," "Note: Requires v2.0+." Quill has no built-in admonition/callout format. Neither does EasyMDE out of the box (it is a plain markdown editor without extended syntax support). Authors either cannot create callouts at all, or resort to workarounds like bold text with emoji prefixes that look terrible and are inconsistent.

**Why it happens:**
Callouts/admonitions are a documentation-specific need. General-purpose editors (Quill, TinyMCE, EasyMDE) do not include them because blog posts and marketing content rarely need them.

**Consequences:**
- Documentation lacks visual hierarchy for warnings, tips, and notes
- Authors invent inconsistent workarounds
- Docs site looks amateur compared to Docusaurus, VitePress, or MkDocs

**Prevention:**
1. **If using Quill:** Build a custom Quill blot for callouts (BlockEmbed with type: note/warning/tip/caution and content). This is moderate custom development.
2. **If using markdown (EasyMDE):** Define a convention like `:::warning\nContent\n:::` and parse it during SSR rendering with a custom remark/rehype plugin. This is the approach Docusaurus and VitePress use.
3. **Structured field approach:** Add a `calloutType` select field and `calloutContent` text field to the collection schema, making callouts explicit CMS content rather than inline formatting. This is the most CMS-native approach but makes content authoring more rigid.
4. **Render-side transform:** Regardless of editor choice, build an HTML transform in the Astro rendering layer that converts a convention (e.g., `<blockquote>` with a specific class or data attribute) into styled callout components.

**Detection:**
- Try to create a "Warning" callout in the admin editor. If you cannot, this pitfall is active.

**Phase to address:** Phase 1 (Content Modeling) for the convention decision, Phase 2 (Rendering) for the Astro component implementation.

**Confidence:** HIGH (verified -- Quill source code has no admonition format in its formats list; EasyMDE has no extended markdown syntax support)

---

### Pitfall 3: SSR API Calls on Every Page Load Without Caching

**What goes wrong:**
In SSR mode, every page request from a visitor triggers a `fetch()` call from Cloudflare Pages to the CMS Worker API. For a docs site with 50+ pages, a visitor navigating through 10 pages creates 10 API round-trips. If the CMS Worker is in a different Cloudflare region than the Pages function, latency adds up. Under any real traffic, this multiplies into thousands of unnecessary API calls per hour for content that changes perhaps once a day.

**Why it happens:**
The existing `flare.ts` API client does zero caching -- every call is a fresh `fetch()`. The current blog site pattern works because blog posts are browsed occasionally. Documentation is browsed sequentially and repeatedly, with far more page views per session.

**Consequences:**
- Time to First Byte (TTFB) of 200-500ms per page instead of <50ms
- CMS Worker gets hammered with redundant requests
- D1 database reads scale linearly with traffic instead of with content changes
- Core Web Vitals suffer, hurting SEO for the docs site

**Prevention:**
1. **Edge caching with KV:** Cache rendered API responses in Cloudflare KV (already bound as `CACHE_KV` in the CMS Worker). Set a TTL of 5-15 minutes. Implement cache invalidation on content publish.
2. **Stale-while-revalidate pattern:** Serve cached content immediately, revalidate in the background. The Cloudflare Cache API supports this natively in Workers.
3. **Hybrid rendering in Astro:** Use `export const prerender = true` for docs pages that can be statically generated at build time. Only use SSR for pages that genuinely need dynamic data (search results, user-specific content).
4. **ISR (Incremental Static Regeneration):** Use Cloudflare KV to implement ISR -- serve a cached static version, regenerate after TTL expires. LaunchFa.st has a documented pattern for this with Astro + Cloudflare KV.

**Detection:**
- Open browser DevTools Network tab, navigate 5 docs pages. If every navigation shows a full API fetch with 200+ ms, caching is missing.
- Check CMS Worker analytics for request volume -- if it scales with visitor traffic rather than content changes, caching is absent.

**Phase to address:** Phase 2 (Rendering/Infrastructure). Must be solved before any public launch.

**Confidence:** HIGH (verified -- `packages/site/src/lib/flare.ts` has no caching; Cloudflare KV binding confirmed in `wrangler.toml`)

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

---

### Pitfall 4: Navigation Ordering Becomes Unmanageable

**What goes wrong:**
Documentation has strict ordering requirements: "Getting Started" comes before "Configuration" comes before "API Reference." A CMS stores content items as independent records with no inherent order beyond `createdAt` or a sort field. Without explicit ordering, navigation menus render in creation order or alphabetical order, neither of which is correct for docs. Reordering requires editing every item's sort value or building a drag-and-drop reorder UI in the admin.

**Why it happens:**
CMS content is inherently unordered (it is a database, not a file tree). Static docs sites like VitePress and Docusaurus use filesystem ordering or config files (`sidebar.ts`) that developers version-control. A CMS has no equivalent unless you build one.

**Consequences:**
- Sidebar navigation is wrong or inconsistent
- Adding a new page between two existing pages requires re-numbering
- No "previous/next" page links without explicit ordering
- Section grouping (e.g., "Guides" vs "API Reference") requires either separate collections or a taxonomy field

**Prevention:**
1. **Add an `order` integer field** to the docs collection schema. Use increments of 10 (10, 20, 30...) to leave room for insertions.
2. **Add a `section` field** (select: "Getting Started", "Guides", "API Reference", "Advanced") to group pages in the sidebar.
3. **Build a navigation config collection** -- a single CMS record that stores the ordered tree structure as JSON. The Astro frontend reads this to build the sidebar. This is the most flexible approach but adds content modeling complexity.
4. **Consider a `parentPage` reference field** for hierarchical docs (nested sections). But be careful: FlareCMS API filters are documented as broken (CLAUDE.md known bug #1), so querying children of a parent may require client-side filtering.

**Detection:**
- Create 5 docs pages. Check if the sidebar shows them in the intended order. If not, ordering is broken.

**Phase to address:** Phase 1 (Content Modeling). The collection schema must include ordering fields from the start.

**Confidence:** HIGH (this is a fundamental CMS architecture issue, well-documented across all headless CMS platforms)

---

### Pitfall 5: Content Authoring DX Is Terrible Compared to Markdown Files

**What goes wrong:**
Developer documentation authors are used to writing in VS Code with markdown files, git diffs for review, and instant local preview. Moving to a CMS admin UI means: writing in a browser-based WYSIWYG editor (or textarea), no version diffs beyond "published/draft," no local preview, no batch operations, and no ability to use their preferred editor. For a solo developer writing their own docs, this friction can kill the project -- the author stops writing because the tool is annoying.

**Why it happens:**
The 100% dogfooding requirement means no escape hatch to markdown files. The CMS admin UI is optimized for content editors (marketing, blog posts), not developers writing technical documentation.

**Consequences:**
- Documentation writing velocity drops 50-70% compared to markdown in an editor
- Author frustration leads to docs not being written or updated
- No git-based review workflow for docs changes
- Cannot use tools like Vale (prose linter) or markdownlint

**Prevention:**
1. **Use the EasyMDE plugin** instead of Quill for docs content. At least the author writes markdown syntax, which is familiar territory. The preview pane provides immediate feedback.
2. **Build a "paste from markdown" feature:** Accept raw markdown input, convert to the stored format server-side. This lets authors draft in VS Code and paste into the CMS.
3. **Consider storing content as markdown in the database** and rendering with remark/rehype on the Astro side. This preserves markdown ecosystem tools while keeping content in the CMS.
4. **Add keyboard shortcuts** for common docs patterns (code block, heading, link). The default Quill/EasyMDE shortcuts may not cover docs-specific needs.
5. **Accept the tradeoff explicitly:** The dogfooding requirement is a product decision. Document that the docs site is a showcase of FlareCMS capabilities, and some DX friction is acceptable to prove the product works.

**Detection:**
- Time yourself writing a 500-word doc page with 3 code examples in the CMS admin vs. in a markdown file. If the CMS takes more than 2x longer, the DX gap is too wide.

**Phase to address:** Phase 1 (Content Modeling) for editor choice, ongoing for DX improvements.

**Confidence:** HIGH (universal developer sentiment, confirmed by TinyMCE's own research that 75% of developers customize editors for specific needs)

---

### Pitfall 6: Search Does Not Work Well for CMS-Driven Content

**What goes wrong:**
Static docs sites ship with built-in search (Algolia DocSearch, Pagefind, FlexSearch) that indexes content at build time. A CMS-driven SSR site has no build-time index. You either need a runtime search solution (API-powered) or must generate a search index on content change. Without search, a docs site with 30+ pages becomes unusable.

**Why it happens:**
Search is typically a build-time concern for docs sites. SSR sites do not have a "build" step where content is available for indexing. The CMS API may support basic text search (`searchFields` in collection config), but full-text search across all docs content with ranking, snippets, and fuzzy matching requires more infrastructure.

**Consequences:**
- Users cannot find documentation pages
- Bounce rate increases as users leave for Google instead of using site search
- "I know I read this somewhere" becomes a dead end

**Prevention:**
1. **Use the CMS API `searchFields` config** for basic search. FlareCMS collections support `searchFields` -- ensure the docs collection includes `title`, `content`, and any other searchable fields.
2. **Build a search index on content change:** When content is published, generate a JSON search index and store it in KV or R2. The Astro frontend loads this index and uses a client-side search library (Fuse.js, MiniSearch, or Pagefind).
3. **Pagefind as a post-build step:** If using hybrid rendering (some prerendered pages), Pagefind can index the static HTML output. This does not work for fully SSR pages.
4. **Algolia or Meilisearch:** External search services that crawl and index your site. Algolia DocSearch is free for open-source docs. This is the most robust solution but adds an external dependency.

**Detection:**
- Deploy the docs site with 10+ pages. Try to find a specific code example or concept using only the site. If you cannot without browsing the sidebar, search is needed.

**Phase to address:** Phase 3 or 4 (Post-MVP). Search is important but not a launch blocker for a small docs site (<30 pages).

**Confidence:** MEDIUM (search patterns are well-established, but the specific integration with FlareCMS API search capabilities needs validation)

---

### Pitfall 7: Code Tabs and Multi-Language Examples Are a Custom Build

**What goes wrong:**
Modern docs sites show code examples in multiple languages with tabs (e.g., "npm / yarn / pnpm" or "JavaScript / TypeScript / Python"). This is a standard feature in Docusaurus, VitePress, and MkDocs Material. Neither Quill nor EasyMDE has any concept of tabbed content. Building this requires either: (a) a custom editor widget, (b) structured CMS fields (one field per language variant), or (c) a markdown convention parsed during rendering.

**Why it happens:**
Tabbed code examples are a docs-site-specific UI pattern. No general-purpose editor supports them natively.

**Consequences:**
- Documentation shows only one language variant per example, or uses a clunky "see also" pattern
- Looks dated compared to modern docs sites
- If built as separate CMS fields, the schema becomes bloated (6 fields for one code example with 3 language tabs)

**Prevention:**
1. **Markdown convention approach:** If using EasyMDE/markdown storage, define a convention like:
   ```
   :::code-group
   \`\`\`bash [npm]
   npm install @flare-cms/core
   \`\`\`
   \`\`\`bash [yarn]
   yarn add @flare-cms/core
   \`\`\`
   :::
   ```
   Parse this with a custom remark plugin during Astro SSR rendering.
2. **Structured field approach:** Create a repeatable "code example" sub-schema with fields for `language`, `label`, and `code`. More CMS-native but complex to author.
3. **Defer to post-MVP:** Ship with single code blocks first. Add tabs as a later enhancement. Most initial docs content does not need multi-language examples.

**Detection:**
- Check if your docs need examples in multiple package managers, languages, or frameworks. If yes, plan for this.

**Phase to address:** Phase 3+ (Enhancement). Ship single code blocks first, add tabs later.

**Confidence:** MEDIUM (pattern is standard in docs sites, but implementation approach depends on editor choice made in Phase 1)

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

---

### Pitfall 8: Dark Theme Code Blocks Look Wrong

**What goes wrong:**
The docs site uses a dark theme. Code block syntax highlighting themes (highlight.js, Prism, Shiki) default to light themes. If you do not explicitly configure a dark highlighting theme, code blocks appear as bright white boxes inside a dark page, or the syntax colors clash with the dark background.

**Why it happens:**
Syntax highlighting CSS is separate from the site's theme CSS. The Quill plugin already has dark mode styles for the editor chrome (toolbar, container) but does NOT include highlight.js theme overrides for rendered code output on the frontend.

**Prevention:**
1. Use Shiki (built into Astro via `@astrojs/markdown-remark`) with a dark theme like `github-dark`, `one-dark-pro`, or `dracula`.
2. If processing HTML from the CMS, apply Shiki as a server-side transform during SSR -- parse `<pre><code>` blocks and re-highlight with Shiki.
3. If using highlight.js on the client, load a dark theme CSS file (e.g., `github-dark.min.css`) instead of the default.
4. Test with real code examples in at least 5 languages before launch.

**Detection:**
- View any code block on the dark-themed docs site. If it has a white background or unreadable colors, the theme is wrong.

**Phase to address:** Phase 2 (Rendering). Quick fix, just needs to be remembered.

**Confidence:** HIGH (verified -- Quill plugin loads `quill.snow.css` which is light-themed)

---

### Pitfall 9: Broken API Filters Force Client-Side Filtering

**What goes wrong:**
FlareCMS has a known bug where API filters are broken (documented in CLAUDE.md). The existing `flare.ts` already works around this by fetching all content and filtering client-side (see `getBlogPosts()` which fetches all then `.filter(post => post.status === 'published')`). For a docs site, this means: fetching the entire docs collection on every page load to find one page by slug.

**Why it happens:**
Inherited SonicJS v2.8.0 bug. Filter query parameters are parsed but not applied correctly in the API.

**Consequences:**
- Every docs page load fetches the full collection payload
- Payload size grows linearly with number of docs pages
- 100 docs pages means transferring 100 pages of content to render 1 page
- Combined with Pitfall 3 (no caching), this is a performance disaster

**Prevention:**
1. **Fix the API filters** in the CMS core. This is the root fix. Investigate why `filter[slug][equals]=getting-started` does not work and fix the query builder.
2. **Cache aggressively** (see Pitfall 3). If you cache the full collection response, the overhead of client-side filtering is reduced to a one-time cost per cache window.
3. **Use the generic `getContent()` function** with filters set, even if they do not work yet. When filters are fixed, the code is already correct.
4. **For docs specifically:** Consider a dedicated API endpoint or Worker route that returns a single doc by slug, bypassing the collection listing endpoint.

**Detection:**
- Check Network tab: if fetching `/api/collections/docs/content` returns all docs when you only need one, filters are still broken.

**Phase to address:** Phase 2 (API Integration). Ideally fix the core API bug, or at minimum implement caching to mask the problem.

**Confidence:** HIGH (verified in source code -- `flare.ts` line 48 and line 62 both do client-side filtering after fetching all records)

---

### Pitfall 10: No Content Versioning or Preview Workflow for Docs

**What goes wrong:**
Technical documentation often needs review before publishing (especially API docs that could mislead developers). FlareCMS has a basic published/draft status, but: status is one-way (cannot unpublish -- known bug), there are no content diffs between versions, and there is no "preview draft" URL. An author writes a docs update, publishes it, discovers a mistake, and cannot revert or unpublish.

**Why it happens:**
Inherited SonicJS limitation. The workflow plugin exists but status transitions are incomplete.

**Consequences:**
- Published documentation errors are visible immediately with no rollback
- No review step before publishing
- Cannot preview how a docs change will look before going live

**Prevention:**
1. **Accept the limitation for MVP.** Solo developer workflow does not strictly need multi-stage review.
2. **Build a preview route:** Add an Astro route like `/docs/preview/[slug]` that renders draft content. Protect it with a simple auth check or query parameter token.
3. **Fix the unpublish bug** in a later phase when addressing known CMS bugs.
4. **Use content_versions table** (exists in the schema) to implement basic version history, at minimum storing the previous version before overwrite.

**Detection:**
- Publish a doc page, then try to set it back to draft. If you cannot, the one-way status bug is confirmed.

**Phase to address:** Phase 3+ (Polish). Not a launch blocker for solo developer workflow.

**Confidence:** HIGH (verified -- known bug documented in CLAUDE.md)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Content Modeling | Quill cannot handle code-heavy docs (Pitfall 1) | Choose EasyMDE or build custom Quill blots before writing any content |
| Content Modeling | No callout/admonition support (Pitfall 2) | Define convention early, implement in rendering |
| Content Modeling | Navigation ordering missing (Pitfall 4) | Add `order` and `section` fields to schema from day 1 |
| API Integration | Full collection fetched per page (Pitfall 9) | Fix API filters or implement aggressive KV caching |
| Rendering | SSR without caching kills performance (Pitfall 3) | Implement KV cache or hybrid rendering before launch |
| Rendering | Dark theme code blocks look wrong (Pitfall 8) | Configure Shiki/highlight.js dark theme |
| Rendering | Code tabs need custom build (Pitfall 7) | Defer to post-MVP, ship single blocks first |
| Search | No built-in search for SSR content (Pitfall 6) | Plan for Fuse.js/MiniSearch index, defer Algolia to later |
| DX | Writing docs in CMS is slow (Pitfall 5) | Use markdown editor, accept tradeoff for dogfooding |
| Workflow | Cannot unpublish or preview drafts (Pitfall 10) | Build preview route, accept limitation for MVP |

---

## The Meta-Pitfall: Trying to Compete with VitePress/Docusaurus

The single biggest risk for this project is not any individual technical issue -- it is the expectation gap. Developers visiting a docs site expect the polish level of Docusaurus or VitePress: instant search, tabbed code blocks, callout boxes, table of contents, previous/next navigation, version selectors, dark/light toggle, copy-to-clipboard on code blocks. These are all table stakes for static docs sites because frameworks like Docusaurus provide them for free.

A CMS-driven docs site must build every one of these features from scratch. The project scope is not "build a docs site" -- it is "build a docs site framework." Scope accordingly and ship iteratively. An honest, simple docs site that works is better than an abandoned attempt at feature parity with Docusaurus.

**Recommendation:** Define an explicit "not building" list. What features do static docs frameworks provide that you will consciously skip? Make this decision in Phase 1, not when you are deep in implementation wondering why it is taking so long.

---

## Sources

- FlareCMS source code: `packages/core/src/plugins/core-plugins/quill-editor/index.ts` (Quill plugin, formats list, toolbar config)
- FlareCMS source code: `packages/site/src/lib/flare.ts` (API client, client-side filtering pattern)
- FlareCMS source code: `packages/core/src/plugins/available/easy-mdx/index.ts` (EasyMDE plugin)
- CLAUDE.md known bugs section (API filters, one-way status, soft-delete cascade)
- [Quill Syntax Highlighter docs](https://quilljs.com/docs/modules/syntax) -- language detection limitations
- [Quill issue #4300](https://github.com/slab/quill/issues/4300) -- code-block display issues on save/reload
- [Quill issue #4448](https://github.com/slab/quill/issues/4448) -- code block splitting
- [Quill issue #2772](https://github.com/slab/quill/issues/2772) -- language selection request
- [Cloudflare Workers Astro guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/) -- SSR caching strategies
- [Astro ISR with Cloudflare KV](https://www.launchfa.st/blog/astro-incremental-static-regeneration-cloudflare-kv) -- ISR pattern
- [Cloudflare Pages SSR caching discussion](https://community.cloudflare.com/t/caching-for-server-side-rendered-astro-js-site-in-cloudflare-pages/479367)
- [TinyMCE CMS editor problems](https://www.tiny.cloud/blog/cms-problems/) -- 75% customization stat
- [Headless CMS API integration pitfalls](https://dredyson.com/building-a-headless-cms-the-definitive-step-by-step-guide-to-avoiding-api-integration-pitfalls-in-2025/)
