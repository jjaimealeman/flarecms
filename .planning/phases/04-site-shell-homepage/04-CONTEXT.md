# Phase 4: Site Shell & Homepage - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Polished header, footer, redesigned homepage inspired by Stitch v2 mockups, proper SEO metadata with sitemap, and "Edit in CMS" links on every docs page. The site has a complete shell that wraps all existing docs content.

</domain>

<decisions>
## Implementation Decisions

### Homepage layout
- Inspired by Stitch v2 mockups — same general flow but freedom to adjust sections and styling
- Hero section: Claude's discretion on content (version badge, tagline, CTAs, CLI snippet)
- Feature cards: Claude picks the best number and selection of features based on Flare's actual capabilities (reference SonicJS feature set: edge-native, D1+R2+KV, plugin architecture, admin UI, auth, caching, content workflow, media library, etc.)
- Comparison table: Keep it — lean into the full Cloudflare-native advantage (both frontend AND backend on CF). Frame it as Flare CMS vs "Traditional Headless CMS" highlighting zero cold starts, pay-as-you-go pricing, 275+ locations, Cloudflare-native infrastructure
- CTA section at bottom: "Ready to build on the edge?" style call-to-action

### Header & navigation
- Sticky header — must stay visible during long scroll content
- Nav links: Claude decides based on what pages/sections actually exist
- Search bar placeholder in header — Phase 6 implements actual search
- Mobile: Claude decides best mobile nav pattern (hamburger deferred from Phase 2)

### Footer content
- Claude designs footer appropriate for current project state
- Social links: GitHub only — no Discord, no other socials (unlikely to ever add)
- Legal pages: Terms of Service, Privacy Policy, Code of Conduct — all three created with actual content in this phase
- "Built with Flare CMS" badge
- MIT License badge

### Edit in CMS links
- Simple visible link on docs pages for now (not auth-gated)
- Placement: Claude's discretion
- URL built from `PUBLIC_FLARE_API_URL` env variable (localhost in dev, production admin URL in prod)
- Links to admin edit page for the specific content item

### SEO metadata
- Full SEO meta tags on all pages — title, description, Open Graph, Twitter cards
- Generated from existing content fields (title, slug, description)
- Auto-updated sitemap via Astro's sitemap integration
- No custom SEO fields in CMS collections yet (deferred)

### Claude's Discretion
- Hero section content and layout
- Number and selection of homepage feature cards
- Mobile navigation pattern
- Footer column layout and groupings
- Search placeholder behavior (clickable vs visual-only)
- Edit in CMS link placement and styling
- Exact spacing, typography, and component design

</decisions>

<specifics>
## Specific Ideas

- Homepage inspired by Stitch v2 mockups but with freedom to adjust — not pixel-faithful
- Comparison table should emphasize full CF deployment for BOTH frontend and backend as the key differentiator
- Feature cards should cover Flare's full feature set highlights (reference SonicJS screenshots: plugin architecture, three-tier cache, flexible auth, content workflow, media library, TypeScript native, etc.)
- Legal pages (ToS, Privacy, CoC) should have real generated content — CoC is for developers who use and contribute to the open-source project
- Header must be sticky for long scrolling content

</specifics>

<deferred>
## Deferred Ideas

- **Dedicated /features page** — Full feature listing with details, beyond the homepage highlight cards. Could include technology stack section and plugin grid like SonicJS site
- **Auth-gated floating "Edit in CMS" overlay** — Floating edit button only visible when user is logged in, toggleable from admin settings. Important for when Flare CMS is used for client-facing sites (not just developer docs)
- **CMS SEO fields** — Adding meta_title, meta_description, og_image fields to CMS collections for per-page SEO customization from the admin UI
- **"Deploy to Cloudflare" button** — One-click deploy for developers forking the project

</deferred>

---

*Phase: 04-site-shell-homepage*
*Context gathered: 2026-03-08*
