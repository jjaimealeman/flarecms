# 2026-03-14 - Fix Editor CSP Blocking + Dark/Light Theme Support

**Keywords:** [FIX] [CSP] [EDITOR] [THEME] [SECURITY]
**Session:** Saturday night, Duration (~30 min)
**Commit:** 3c48475

## What Changed

- File: `packages/core/src/middleware/security-headers.ts`
  - Added `cdn.jsdelivr.net` to `style-src` (Quill CSS was blocked)
  - Added `unpkg.com` to `style-src` (EasyMDE CSS was blocked)
  - Added `maxcdn.bootstrapcdn.com` to `style-src` (Font Awesome CSS was blocked)
  - Added `maxcdn.bootstrapcdn.com` to `font-src` (Font Awesome font files)
- File: `packages/core/src/plugins/available/easy-mdx/index.ts`
  - Replaced hardcoded dark-only styles with proper light/dark theme support
  - Light mode: white backgrounds, dark text, zinc borders
  - Dark mode: wrapped all styles in `.dark` selector scope
  - Syntax highlighting colors for both themes (headers, bold, italic, links, quotes)
- File: `packages/core/src/plugins/core-plugins/quill-editor/index.ts`
  - Added `.quill-editor-container` max-width constraint
  - Added `.ql-container` overflow hidden
  - Added `.ql-editor` overflow-y auto, max-height 600px, word-wrap
  - Added border-radius to toolbar and container for polished look
- File: `packages/core/src/db/migrations-bundle.ts`
  - Regenerated timestamp

## Why

The Documentation collection content editor was completely broken — rendering as a massive dark blob with no toolbar, overflowing the page. Root cause: CSP `style-src` directive was missing the CDN origins for EasyMDE CSS (`unpkg.com`), Font Awesome CSS (`maxcdn.bootstrapcdn.com`), and Quill CSS (`cdn.jsdelivr.net`). The editor JS loaded fine (those origins were in `script-src`) but without CSS, the layout collapsed. Additionally, EasyMDE had hardcoded dark-only styles with no `.dark` scoping, so it always looked dark regardless of theme.

## Issues Encountered

- Initially misidentified as a Quill editor issue — console logs revealed it was EasyMDE (`[Quill] Found 0 editor containers` + `EasyMDE initialized for field: field-content`)

## Dependencies

No dependencies added

## Testing Notes

- What was tested: EasyMDE editor renders correctly in both light and dark mode, toolbar visible, content editable, no overflow
- What wasn't tested: Quill editor (no collections currently use quill field type for testing)
- Edge cases: Very long markdown content within max-height constraint

## Next Steps

- [ ] Version History modal styling (dark on light, "Untitled" titles, change detection)
- [ ] Release v1.17.0 after merging audit-logging + this fix

---

**Branch:** feature/quill-editor-overflow
**Issue:** N/A
**Impact:** HIGH - unblocks editing Documentation collection content
