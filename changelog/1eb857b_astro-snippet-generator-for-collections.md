# 2026-03-11 - Astro Snippet Generator for Collections

**Keywords:** [FEATURE] [UI] [BACKEND] [API]
**Session:** Late night, Duration (~30 minutes)
**Commit:** 1eb857b

## What Changed

- File: `packages/core/src/templates/pages/admin-snippets.template.ts`
  - New template that generates 4 Astro code snippets per collection from live schema
  - Content Config (content.config.ts with flareLoader setup)
  - Astro Page (getCollection + field mapping with TS type hints)
  - API Fetch (direct fetch without @flare-cms/astro)
  - Field Reference (all fields with types and required status)
  - Tabbed UI with per-snippet copy buttons
- File: `packages/core/src/routes/admin-collections.ts`
  - Added GET `/:id/snippets` HTMX endpoint returning rendered snippet HTML
  - Reads collection schema from DB, passes to snippet template
  - Imports renderSnippetModal from new template
- File: `packages/core/src/templates/pages/admin-collections-list.template.ts`
  - Added "Astro" button to each collection row (code bracket icon)
  - Added snippet modal (backdrop + centered panel with header/body)
  - Modal loads snippets via HTMX ajax call on button click
- File: `packages/core/src/db/migrations-bundle.ts`
  - Timestamp update from rebuild

## Why

Users building Astro frontends need to know how to fetch and use each collection's data. Instead of reading API docs and manually writing boilerplate, they click "Astro" on any collection and get copy-paste-ready code that matches their exact schema — field names, types, required status all dynamically generated.

## Issues Encountered

No major issues encountered. The snippet route was placed before the `/:id` catch-all to avoid path conflicts.

## Dependencies

No dependencies added.

## Testing Notes

- Verified snippets generate correctly for Pages collection (5 fields)
- All 4 tabs render and switch correctly
- Copy button works with clipboard API
- Snippets update dynamically when fields are added/removed (reads from DB each time)

## Next Steps

- [ ] Public API rate limiting (next on roadmap)
- [ ] Consider adding syntax highlighting (Shiki or Prism)

---

**Branch:** feature/astro-snippet-generator
**Issue:** N/A
**Impact:** MEDIUM - New admin feature, no data changes
