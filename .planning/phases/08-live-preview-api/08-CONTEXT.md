# Phase 8: Live Preview API - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Content editors see real-time preview of draft changes rendered through the actual Astro frontend, leveraging same-edge-network latency (<50ms round-trip). Deliverables: draft content API endpoint, preview client script, admin UI "Preview" button, and sub-50ms preview latency. Schema migrations and content modeling changes are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Preview rendering
- Dedicated standalone page (not modal, not iframe in admin) — no admin chrome
- Split-screen layout: editor fields on left, live preview on right
- Draggable divider between editor and preview panes
- Full-viewport page with no admin layout template

### Edit-to-preview flow
- Auto-update with debounce (~500ms) — preview refreshes as you pause typing
- Scroll sync between editor and preview (edit a section, preview scrolls to match)
- Unsaved changes preview from in-memory form state — no save required for preview

### Draft content scope
- Any content state is previewable (draft, published, unsaved in-progress edits)
- Authentication required — only logged-in CMS users can access preview routes
- Works for ALL collections with frontend routes (blog posts, docs, news, etc.)

### Admin UI integration
- "Open Preview" button on every content edit form
- Same-tab navigation — preview page replaces admin, "Back to editor" button returns
- All collections supported — generic solution that scales

### Claude's Discretion
- Preview render method (iframe of actual Astro page vs client-side markdown render)
- Which fields trigger live preview updates (content-only vs all visible fields)
- Loading/refresh indicator approach (subtle spinner, progress bar, or seamless)
- Options panel contents (viewport controls, meta info, etc.) and slide-in behavior
- Draft API design (dedicated endpoint vs existing API with draft param)
- Item switching UX (one-at-a-time vs dropdown switcher)

</decisions>

<specifics>
## Specific Ideas

- "Not an iframe but a full page — like a giant modal but actually a standalone page"
- "Leave maybe a 1em margin around it OR just a new page" — decided on new page
- "No admin style template layout — just a page with a split screen"
- "Some options that slide in from browser edge" — slide-in options panel from edge
- Split-screen feel inspired by VS Code markdown preview (editor left, preview right, scroll sync)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-live-preview-api*
*Context gathered: 2026-03-09*
