# 2026-03-11 - Homepage Redesign + Design System Foundation

**Keywords:** [FRONTEND] [STYLING] [UI] [COMPONENTS] [DEPENDENCIES] [FEATURE]
**Session:** Afternoon, Duration (~30 minutes)
**Commit:** fb2c385

## What Changed

- File: `packages/site/package.json`
  - Removed `@fontsource-variable/inter`, `@fontsource-variable/space-grotesk`, `@fontsource-variable/jetbrains-mono`
  - Added `@fontsource-variable/outfit`, `@fontsource/geist-mono`
- File: `packages/site/src/styles/global.css`
  - Rewrote design tokens: true black palette replacing navy slate
  - Added semantic CSS custom properties (surface-primary/secondary/tertiary, border, text-primary/secondary/tertiary)
  - Added `.light` class toggle for Edge Light mode
  - Kept backwards-compat `--color-slate-*` aliases mapped to new neutral values
  - Replaced `--font-sans` (Outfit), `--font-mono` (Geist Mono), removed `--font-heading`
- File: `packages/site/src/layouts/Layout.astro`
  - Added theme toggle button (sun/moon icons) in desktop and mobile nav
  - Added FOUC-prevention `<script is:inline>` checking localStorage + prefers-color-scheme
  - Migrated all `slate-*` color classes to semantic tokens (surface-*, text-*, border)
  - Footer migrated to semantic tokens
- File: `packages/site/src/data/homepage.ts`
  - Reduced navLinks from 6 to 3 items (Docs, Features, Blog)
- File: `packages/site/src/components/Hero.astro`
  - Full rewrite: centered single-column layout
  - Massive headline (96px desktop), gradient text on "the edge"
  - Version badge pill, two CTA buttons, CLI snippet with copy
  - Admin UI video element with browser chrome mockup and poster fallback
  - Trust badges centered below
- File: `packages/site/src/components/Features.astro`
  - Full rewrite: asymmetric bento grid replacing 4-card icon grid
  - Admin UI screenshot tile (2-col span), performance stats tiles, code snippet tile, plugin architecture tile with service icons
- File: `packages/site/src/components/ComparisonTable.astro`
  - Added editorial intro paragraph, sticky header row
  - Flare CMS column highlight with left border accent and subtle background
  - Migrated to semantic tokens
- File: `packages/site/src/components/OpenSourceCTA.astro`
  - Improved copy ("Open source. Free forever."), added GitHub star CTA button
  - Migrated to semantic tokens
- File: `packages/site/src/components/CodeShowcase.astro`
  - Replaced `font-heading` with `font-sans`, migrated border colors to semantic tokens
- File: `packages/site/src/components/BlogPreview.astro`
  - Replaced `font-heading` with `font-sans`
- File: `packages/site/src/components/Stats.astro`
  - Replaced `font-heading` with `font-sans`
- File: 15 page files across `src/pages/`
  - Global `font-heading` → `font-sans` replacement across all pages
- File: `packages/site/public/videos/` (new directory)
  - Created placeholder directory for admin-demo.webm

## Why

Full homepage redesign to differentiate Flare CMS from generic "AI dark mode" dev tool templates. Establishes a dual-mode design system (Supernova Dark default + Edge Light toggle), modernizes typography from Inter/Space Grotesk to Outfit/Geist Mono, and replaces the two-column hero + terminal mockup with a centered hero featuring a real admin UI video showcase. The bento grid features section uses real product content instead of generic icons.

## Issues Encountered

Tailwind v4 `@theme` block resolves at build time, so CSS custom properties for runtime theme toggle needed to be defined in `@layer base` and then aliased through `@theme` using `var()`. This approach worked — build compiles and semantic color tokens resolve at runtime.

## Dependencies

- Added: `@fontsource-variable/outfit` (heading + body font, replaces Inter + Space Grotesk)
- Added: `@fontsource/geist-mono` (monospace font, replaces JetBrains Mono)
- Removed: `@fontsource-variable/inter`, `@fontsource-variable/space-grotesk`, `@fontsource-variable/jetbrains-mono`

## Testing Notes

- Build passes: `pnpm build` completes without errors
- Visual verification needed at localhost:4321 for both dark and light modes
- Admin demo video element present with poster fallback (video file not yet recorded)
- Mobile responsive testing needed for hero stack and bento grid

## Next Steps

- [ ] Record admin-demo.webm via OBS and add to public/videos/
- [ ] Take admin dashboard screenshot for public/images/admin-dashboard.webp
- [ ] Migrate SearchModal.astro and DocsLayout.astro to semantic tokens
- [ ] Visual QA in both dark and light modes
- [ ] Lighthouse audit for font loading regressions

---

**Branch:** feature/redesign-homepage
**Issue:** N/A
**Impact:** HIGH - full homepage redesign + global design system + typography overhaul
