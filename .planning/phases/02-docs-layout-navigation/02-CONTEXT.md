# Phase 2: Docs Layout & Navigation - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the responsive 3-column docs layout shell with sidebar navigation, breadcrumbs, and prev/next links — all generated from CMS data. Content rendering (Shiki, callouts, tabs) is Phase 3. Site shell (header, footer, homepage) is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Layout structure
- Clean dividers style — subtle 1px vertical borders between columns, minimal backgrounds (Astro/Tailwind docs aesthetic)
- Content area has a max-width cap (~65ch) for comfortable prose line length
- Only TOC column is sticky (follows viewport on scroll); sidebar scrolls normally

### Sidebar navigation
- Astro docs style — subtle, non-distracting, doesn't compete with page content
- All sections expanded by default — no collapse/accordion, full overview at a glance
- Active page shown with subtle rounded background highlight (pill shape, like Astro docs)
- Sections display icon + text label (icon from CMS `docs-sections.icon` field or hardcoded — Claude's discretion)
- Section entries show name and child pages only — no page counts or metadata badges

### Responsive behavior
- Desktop: 3-column layout (sidebar, content, TOC)
- Tablet: 2-column (sidebar stays visible, TOC collapses to a dropdown above content)
- Phone: single-column with floating bottom button to trigger sidebar navigation
- Mobile sidebar appearance style: Claude's discretion (slide-in, bottom sheet, or overlay)
- Floating menu button shows on phone-sized screens only, not tablet

### Breadcrumbs
- Format: Docs > Section Name > Page Title (full path with root)
- All segments are clickable links ("Docs" → /docs index, "Section" → section landing page)
- Breadcrumbs appear above the page title in the content area

### Prev/next navigation
- Full-width cards at bottom of content — prev on left, next on right
- Each card shows direction label, page title, and section name
- Cards have hover effects
- Navigation crosses section boundaries (continuous reading flow through all docs)
- First page hides prev card, last page hides next card — clean absence, no placeholders

### Claude's Discretion
- Column proportions (sidebar/content/TOC widths)
- Mobile sidebar appearance animation and behavior
- Icon source strategy (CMS field vs hardcoded map)
- Exact spacing, typography, and hover states
- Loading/skeleton states if needed

</decisions>

<specifics>
## Specific Ideas

- "I prefer the Astro docs page style — more subtle, doesn't distract from the actual documentation"
- Active page highlight should look like Astro's soft rounded pill highlight
- Dark sidebar aesthetic (matching Astro docs dark sidebar screenshots provided)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-docs-layout-navigation*
*Context gathered: 2026-03-08*
