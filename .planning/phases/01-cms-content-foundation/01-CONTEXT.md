# Phase 1: CMS Content Foundation - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Create `docs` and `docs-sections` collections in the CMS with validated schemas, and integrate EasyMDE as the markdown editor for code-heavy documentation content. Admin can create, edit, and manage documentation pages with proper markdown round-tripping. Rendering, layout, and frontend display are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Collection fields & structure
- **docs-sections**: name, slug, description, icon (SVG string — NO emojis), color (subtle accent color for sidebar/visual distinction), order (integer)
- **docs**: title, slug, content (markdown via EasyMDE), section (reference to docs-sections), order (integer), excerpt (doubles as SEO meta description), status (draft/published), lastUpdated (date)
- Flat hierarchy — each doc belongs to one section, sorted by `order` field. No nested sub-pages
- Prev/next navigation is auto-calculated at render time from section + order — no explicit prev/next fields stored
- Slug auto-generates from title (kebab-case) but is editable by the author

### Markdown & code conventions
- Callout/admonition syntax: Claude's discretion — pick whichever is easiest to parse in the unified/rehype pipeline
- Tabbed code examples: Claude's discretion on whether to include and what authoring syntax to use. NOT for TS/JS switching (project is 96% TypeScript). If tabs exist, they'd be for comparing approaches (config formats, deployment methods, etc.)
- Code blocks require explicit language labels (ts, astro, sql, bash, toml, jsonc, html, json, etc.) — no default language assumption
- Heading conventions: Claude's discretion based on what works with TOC generation

### EasyMDE editor setup
- EasyMDE replaces Quill for docs content fields — Claude decides whether to apply globally or only to docs collections
- Preview mode (side-by-side vs toggle): Claude's discretion based on EasyMDE capabilities
- Toolbar and code block insertion UX: Claude's discretion
- Image upload: drag-and-drop/paste images in editor, uploaded to R2 bucket, inserted as markdown image syntax
- Astro image optimization (responsive srcsets, format conversion) deferred to rendering phases — Phase 1 just handles upload + markdown insertion

### Content validation & defaults
- New docs default to **draft** status — author explicitly publishes when ready
- Required vs optional fields: Claude's discretion based on practical workflow
- Order field default behavior: Claude's discretion (auto-increment vs manual)

### Claude's Discretion
Claude has broad discretion on implementation details for this phase:
- Callout syntax choice
- Whether tabs are worth including in Phase 1
- EasyMDE scope (docs-only vs global Quill replacement)
- Editor preview mode and toolbar configuration
- Required field selection
- Order field auto-increment behavior
- Heading hierarchy conventions

</decisions>

<specifics>
## Specific Ideas

- Section icon field stores SVG markup — absolutely no emojis
- Section color should be subtle and aesthetic, not bold or distracting — think accent borders or soft tints
- Excerpt/summary field doubles as SEO meta description for the page
- Research identified EasyMDE as the editor choice because Quill can't handle code-heavy content (no language spec, formatting bugs with fenced blocks)
- Project is 96% TypeScript — docs examples will primarily be TS, Astro, SQL, TOML, bash, and JSON
- The CMS already has an R2 media bucket (`my-astro-cms-media`) — image upload should use it

</specifics>

<deferred>
## Deferred Ideas

- Astro image optimization for uploaded images (responsive srcsets, format conversion) — rendering phase (Phase 3 or 4)

</deferred>

---

*Phase: 01-cms-content-foundation*
*Context gathered: 2026-03-08*
