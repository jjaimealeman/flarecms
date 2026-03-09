# Phase 3: Content Rendering & Route - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform raw CMS markdown into polished documentation pages with syntax highlighting, copy buttons, callout boxes, and tabbed code examples. This phase builds the rendering pipeline — it does not add new content types, new routes beyond the docs catch-all, or site shell elements.

</domain>

<decisions>
## Implementation Decisions

### Code block presentation
- Dual Shiki themes: `catppuccin-mocha` (dark) and `catppuccin-latte` (light), swapped via CSS `prefers-color-scheme`
- No line numbers
- Language label visible on each block (e.g., "TypeScript", "bash")
- Filename/title support via meta flag (e.g., ` ```ts title="src/config.ts" `)
- Line highlighting support via meta flag (e.g., ` ```ts {3,5-7} `)
- Copy button on every code block

### Callout authoring convention
- GitHub-style syntax: `> [!NOTE]`, `> [!WARNING]`, `> [!TIP]`, `> [!CAUTION]`
- Four types: Info/Note (blue), Warning (amber), Tip (green), Caution/Danger (red)
- Each type gets a distinct icon and color
- Always expanded — no collapsible option
- Custom title support: Claude's Discretion

### Tabbed code examples
- Arbitrary tab groups — not hardcoded to TS/JS. Authors define tab labels, system renders whatever groupings are authored (TS/JS, npm/pnpm/yarn, Astro/Next/Nuxt, etc.)
- Tab authoring syntax: Claude's Discretion (consecutive fenced blocks vs wrapper syntax — pick most practical for the pipeline)
- Tab preference persists across pages via localStorage (reader picks "pnpm" once, all tab groups default to pnpm site-wide)

### Content typography & spacing
- Heading anchor links: show `#` or link icon on hover for deep linking
- Images: click-to-expand lightbox/modal for full-size viewing
- External links: open in new tab with small external-link icon indicator
- Table of Contents (right sidebar): scroll-spy highlights active heading as reader scrolls

### Claude's Discretion
- Callout custom title implementation (whether to support `> [!NOTE] Custom Title`)
- Tab authoring syntax choice (consecutive blocks vs wrapper)
- Prose typography specifics (font size, line height, spacing)
- Lightbox implementation approach
- Scroll-spy implementation approach
- Copy button visual style and feedback

</decisions>

<specifics>
## Specific Ideas

- Catppuccin theme family chosen specifically for visual consistency between light/dark variants
- Dark/light mode will use `prefers-color-scheme` (no toggle) — decided during discussion as site-wide approach for Phase 4, but Shiki dual themes are set up now
- Tab system designed for open-source reuse — Flare docs will use TS/JS and package managers, but other dogfooded sites need arbitrary tab groups

</specifics>

<deferred>
## Deferred Ideas

- Light/dark mode toggle UI — Phase 4 (Site Shell) if ever; for now `prefers-color-scheme` only
- Site-wide `prefers-color-scheme` CSS support beyond code blocks — Phase 4

</deferred>

---

*Phase: 03-content-rendering-route*
*Context gathered: 2026-03-08*
