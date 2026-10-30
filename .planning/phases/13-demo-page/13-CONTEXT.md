# Phase 13: Demo Page - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

A public Astro page at `/demo` on flarecms.dev that explains what the demo offers, gates access via OTP email login, and redirects authenticated visitors into admin.flarecms.dev. The page is the front door — it uses the Phase 12 OTP endpoints but does not modify them.

</domain>

<decisions>
## Implementation Decisions

### Page layout & structure
- Light landing style — headline, short description, 3-4 bullet points, then email form
- **Developer / Client toggle** (like PinchTab's HUMANS/AGENTS toggle) — swaps headline, subtitle, and bullet points based on selected audience
- Toggle defaults to "Developers" side
- Same email form and demo entry point regardless of toggle position

### Developer-side content
Bullet points highlighting:
- Cloudflare-native stack (Workers, D1, R2, KV — runs at the edge)
- REST API + Astro Content Layer Loader with type safety
- Schema Migrations UI (add/edit fields visually, history, rollback)
- Open source / self-host (fork it, deploy to your own Cloudflare account)

### Client-side content
Bullet points highlighting:
- Visual content editor (rich text, media uploads, intuitive admin)
- Workflow & approvals (Draft → Review → Published, content governance)
- Live preview (split-screen draft preview, see changes before publishing)
- No technical setup (just log in and manage content)

### OTP flow UX
- 6 individual digit boxes for OTP code entry, auto-advance cursor (Stripe/Vercel pattern)
- OTP entry appears after email submission (exact transition is Claude's discretion)
- Resend code UX is Claude's discretion
- Error handling for wrong OTP code is Claude's discretion

### Disclaimer presentation
- Limitations displayed **above** the email form (set expectations before committing)
- Styled as a subtle callout box with info icon — noticeable but not alarming
- Wording differs by toggle:
  - Developer view: "50 API operations" framing
  - Client view: "50 content edits" framing
- Same core info both sides: 30-minute session, operation limit, 6-hour data resets

### Auth redirect experience
- After OTP verification: brief success state ("Redirecting to admin..." with checkmark + spinner) for 1-2 seconds, then redirect
- No welcome tips or onboarding in the success state — keep it minimal
- Cross-domain auth handoff mechanism is Claude's discretion (token-in-URL vs shared cookie)
- Session expiry redirect behavior is Claude's discretion

### Claude's Discretion
- Page chrome (full site nav vs minimal) — pick what fits the existing site
- Email-to-OTP transition animation (inline swap vs card flip)
- Resend code cooldown behavior
- OTP error states (shake animation vs simple text)
- Cross-domain auth mechanism
- Session expiry redirect destination
- Copy tone (developer-direct on dev side, friendly on client side suggested but Claude can adjust)

</decisions>

<specifics>
## Specific Ideas

- Toggle inspired by PinchTab's "HUMANS / AGENTS" toggle — a clean pill-shaped toggle in the upper area of the page that swaps all content below it
- The CMS serves two audiences: developers evaluating a headless CMS, and clients/content managers who need to understand what they'd be working with
- Both audiences enter the same demo — only the pitch changes

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-demo-page*
*Context gathered: 2026-03-16*
