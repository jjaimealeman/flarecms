---
phase: 04-site-shell-homepage
plan: 03
subsystem: site-frontend
tags: [astro, homepage, components, tailwind, responsive]
dependency-graph:
  requires: [04-01]
  provides: [redesigned-homepage, comparison-table, feature-cards]
  affects: [04-02]
tech-stack:
  added: []
  patterns: [responsive-mobile-cards, copy-to-clipboard, gradient-cta]
key-files:
  created:
    - packages/site/src/components/ComparisonTable.astro
  modified:
    - packages/site/src/components/Hero.astro
    - packages/site/src/components/Features.astro
    - packages/site/src/components/OpenSourceCTA.astro
    - packages/site/src/data/homepage.ts
    - packages/site/src/pages/index.astro
decisions:
  - id: 04-03-01
    description: "Responsive comparison uses card layout on mobile instead of table to avoid horizontal overflow"
  - id: 04-03-02
    description: "Features reduced from 6 to 4 cards to match Stitch v2 mockup focus"
  - id: 04-03-03
    description: "Stats and BlogPreview removed from homepage but files preserved for future use"
metrics:
  duration: ~2min
  completed: 2026-03-08
---

# Phase 04 Plan 03: Homepage Redesign Summary

Redesigned homepage to match Stitch v2 mockup: Hero with gradient headline and CLI snippet, 4-card Features grid, ComparisonTable with responsive mobile cards, and gradient CTA band.

## What Was Done

### Task 1: Hero, Features Data, and ComparisonTable
**Commit:** `83192bc`

- **Hero.astro**: Responsive grid (`grid-cols-1 lg:grid-cols-2`), gradient headline highlighting "Cloudflare Workers", dual CTA buttons (Get Started + Documentation), CLI one-liner (`npx create-flare-app my-site`) with copy-on-click, responsive text sizing, flex-wrap on trust badges
- **homepage.ts**: Features array reduced to 4 focused items (Edge-native Performance, D1+R2+KV, Plugin Architecture, Built-in Admin UI). Added `comparisonRows` export with 6 comparison points
- **ComparisonTable.astro**: New component with desktop table (`hidden md:block`) and mobile stacked cards (`md:hidden`). Cyan-400 accent on Flare CMS column. Slate-800 borders

### Task 2: Features, CTA, and Homepage Composition
**Commit:** `8d93028`

- **Features.astro**: 4-card responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`), uppercase "FEATURES" section label in cyan-400, updated heading to "Everything you need for the edge", removed unused icon entries
- **OpenSourceCTA.astro**: Replaced card-wrapped layout with full-width gradient band (`from-cyan-900/50 to-flare-900/50`), single prominent CTA button
- **index.astro**: New composition order: Hero > Features > CodeShowcase > ComparisonTable > OpenSourceCTA. Removed Stats and BlogPreview imports (files preserved)

## Decisions Made

1. **Responsive comparison as cards** -- Mobile renders each comparison row as a card with Traditional vs Flare side by side, avoiding table horizontal overflow
2. **4 features instead of 6** -- Matches Stitch v2 mockup's focused 4-card layout
3. **Files preserved** -- Stats.astro and BlogPreview.astro kept in codebase, just removed from homepage

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- [x] Hero has responsive grid (`grid-cols-1 lg:grid-cols-2`)
- [x] ComparisonTable exists with desktop table + mobile cards
- [x] Features shows 4 cards in `lg:grid-cols-4` grid
- [x] CTA has gradient background
- [x] Stats and BlogPreview removed from index.astro (0 matches)
- [x] Stats.astro and BlogPreview.astro files still exist
- [x] Homepage composition matches mockup flow

## Next Phase Readiness

Homepage redesign complete. Ready for visual verification when 04-02 (navigation/footer) completes in parallel.
