# 2026-03-09 - Redesign hero layout and add custom Shiki theme

**Keywords:** [UI] [STYLING] [COMPONENTS] [FRONTEND]
**Session:** Evening, Duration (~1 hour)
**Commit:** 380a11a

## What Changed

- File: `packages/site/src/components/Hero.astro`
  - Redesigned hero layout: logo centered at top, version badge right of logo
  - Headline centered full-width below logo
  - Two-column grid with items-stretch for vertical alignment
  - Left column uses justify-between: paragraph top-aligned with terminal, buttons centered, npx command bottom-aligned
  - Buttons and CLI snippet centered within left column
  - Description text bumped to text-xl, removed max-w-lg constraint
  - Trust badges moved to full-width strip below the grid with justify-between
  - Updated terminal lines to show both CMS and site dev commands
- File: `packages/site/src/lib/shiki-flare-theme.ts`
  - Created custom dark + light Shiki themes matching FlareCMS brand palette
  - Orange (#f6821f) for keywords, cyan (#22d3ee) for strings, amber (#fbbf24) for types, emerald (#34d399) for booleans
  - Dark background #0f172a, light background #f8fafc
- File: `packages/site/src/lib/markdown.ts`
  - Replaced catppuccin-mocha/latte with custom flareThemeDark/flareThemeLight
- File: `packages/site/src/styles/code-blocks.css`
  - Code block background changed to #0a0f1a (charcoal, matching homepage terminal)
  - Border-radius bumped to 0.75rem with !important to override prose resets
  - Padding increased to 1.25rem vertical, 1.25rem horizontal
  - Language label hidden (redundant with code titles)
  - Title element radius matched at 0.75rem

## Why

Unified the visual identity across homepage and documentation. The homepage terminal had a distinct FlareCMS palette (orange/cyan/emerald on dark charcoal) while docs used catppuccin — creating visual inconsistency. Hero layout was also redesigned for better breathing room and vertical rhythm.

## Issues Encountered

No major issues encountered. Tailwind prose styles were overriding border-radius on code blocks — resolved with !important.

## Dependencies

No dependencies added.

## Testing Notes

- What was tested: Visual inspection of homepage hero and docs code blocks in browser
- What wasn't tested: Light mode theme, mobile responsive layout
- Edge cases: Tab group code blocks may need radius adjustment at corners

## Next Steps

- [ ] Verify light mode Shiki theme renders correctly
- [ ] Test hero layout on mobile breakpoints
- [ ] Consider adding copy button styling updates to match new theme

---

**Branch:** develop
**Issue:** N/A
**Impact:** MEDIUM - visual redesign of homepage hero and docs code styling
