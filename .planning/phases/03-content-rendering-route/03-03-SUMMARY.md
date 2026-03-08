---
phase: 03-content-rendering-route
plan: 03
subsystem: ui
tags: [visual-verification, checkpoint, rendering, ux-fixes]

requires:
  - phase: 03-content-rendering-route/01
    provides: "unified/rehype rendering pipeline"
  - phase: 03-content-rendering-route/02
    provides: "TOC, copy buttons, scroll-spy, lightbox"
provides:
  - "All rendering features visually verified and bug-fixed"
affects: [04-site-shell, 05-documentation-content]

tech-stack:
  added: []
  patterns:
    - "toc-active CSS class for scroll-spy visual state"
    - "rehypeRaw must come AFTER rehypePrettyCode to preserve meta strings"

key-files:
  created: []
  modified:
    - packages/site/src/lib/markdown.ts
    - packages/site/src/styles/code-blocks.css
    - packages/site/src/styles/prose.css
    - packages/site/src/layouts/DocsLayout.astro

key-decisions:
  - "rehypeRaw moved after rehypePrettyCode — rehypeRaw strips code meta strings needed for titles"
  - "Shiki CSS targets [data-rehype-pretty-code-figure] spans, not .shiki class (which doesn't exist)"
  - "Inline code excluded from rehype-pretty-code (removed defaultLang.inline)"
  - "TOC active state uses CSS class toc-active with orange border-left + indent"
  - "External link icon uses explicit slate-300 stroke color, not currentColor"
  - "Content \r\n normalized to \n before pipeline processing"

patterns-established:
  - "CMS stores content with \\r\\n — always normalize before rendering"
  - "Tailwind prose-invert overrides require !important on custom pre styles"

duration: 45min
completed: 2026-03-08
---

# Phase 3 Plan 03: Visual Verification Summary

**Human-verified all Phase 3 rendering features — 8 bugs found and fixed during verification**

## Performance

- **Duration:** 45 min (interactive verification with human)
- **Started:** 2026-03-08T21:30:00Z
- **Completed:** 2026-03-08T22:15:00Z
- **Tasks:** 1 (checkpoint:human-verify)
- **Bugs fixed:** 8

## Accomplishments
- All RENDER-01 through RENDER-04 requirements visually confirmed working
- TOC scroll-spy with orange active indicator verified
- Lightbox overlay for images verified
- External links with new-tab icon verified
- Code block titles (figcaption) now rendering

## Bugs Fixed During Verification

1. **Shiki colors not applied** — CSS targeted `.shiki` class which doesn't exist; fixed to target `[data-rehype-pretty-code-figure] code span`
2. **Code block bg invisible** — Tailwind `prose-invert` overrode custom `pre` background; added `!important`
3. **Inline code broken in callouts** — `defaultLang.inline: 'plaintext'` caused rehype-pretty-code to wrap inline code in figures; removed inline default
4. **Code block titles missing** — `rehypeRaw` placed before `rehypePrettyCode` stripped meta strings; reordered pipeline
5. **\r\n breaking meta parsing** — CMS content uses Windows line endings; normalize before processing
6. **"#" showing in TOC headings** — `extractHeadings` captured anchor span text; strip anchor elements first
7. **TOC active state too subtle** — replaced Tailwind class toggle with `toc-active` CSS class using orange border-left + indent
8. **External link icon black** — SVG used `currentColor`; changed to explicit `slate-300` stroke

## Task Commits

1. **Visual verification checkpoint** — `5ffcea7` (fix)

## Decisions Made
- Pipeline plugin order is critical: rehypeRaw must come after rehypePrettyCode
- CMS content normalization (\r\n → \n) is a rendering concern, not a storage concern

## Deviations from Plan
8 bugs discovered during human verification that weren't caught by build-only checks.

## Issues Encountered
- Astro SSR dev server slow to reflect changes (~30s for Shiki singleton reinit)
- D1 audit trail error (missing changed_fields column) — pre-existing, not Phase 3

---
*Phase: 03-content-rendering-route*
*Completed: 2026-03-08*
