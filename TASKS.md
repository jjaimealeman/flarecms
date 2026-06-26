# FlareCMS — Cleanup & Ownership Tasks
> Created: June 25, 2026
> Goal: Strip SonicJS legacy, make FlareCMS 100% 915website's own, deployable for real clients (dthelifecoach, 915website.com)

---

## PHASE 1 — Plugin Purge (do this first, no new features until clean)

### DELETE — SonicJS demo/dev artifacts, never ship to clients
- [x] Remove `core-plugins/demo-login/` — SonicJS prefilled login form. Zero value for real clients.
- [x] Remove `core-plugins/seed-data-plugin/` — dev-only seeding. Clients never need this.

### DELETE — FlareCMS demo system (built in v2.1, not needed for client sites)
The `demo-sandbox` plugin was built by us in v2.1 (March 2026, phases 11-14) for the flarecms.dev marketing demo — OTP auth, sandboxed collection, mutation guards, 6-hour reset cron. It's real code (40 commits), NOT SonicJS legacy. But client deployments don't need a public demo system.
- [x] Remove `core-plugins/demo-sandbox/` — includes demo-service, reset-service, middleware guards, email templates, and the exchange endpoint. All wired into app.ts.
- [x] Remove migration 038 (demo_signups table, demo-sandbox collection, seed rows).
- [x] Remove demo auth routes from app.ts (CSRF exemption for /demo/auth, guard middleware on /api/content/*, /api/media/*).
- [x] Remove `DemoResetService` exports from services/index.ts and index.ts.
- [x] Remove 6-hour cron trigger from wrangler.toml and scheduled handler dispatch from cms/src/index.ts.
- [x] Remove `/demo` page from packages/site/ and nav links (Layout.astro, homepage.ts, Hero.astro).
- [x] Audit and remove any remaining routes/middleware that reference demo/sandbox functionality.

### REMOVE — Redundant editors (pick one, kill the others)
Currently have: Quill, TinyMCE, EasyMDE, EasyMDx (4 editors for one job)
- [ ] Keep **Quill** as the primary rich text editor (already active, best UX).
- [ ] Remove `core-plugins/tinymce-plugin/` — redundant, licensing overhead, not needed.
- [ ] Consolidate EasyMDE: there are TWO versions showing in the plugin UI (Inactive + Active). Remove the duplicate. Keep one markdown editor for markdown-specific fields only.
- [ ] Remove `available/easy-mdx/` (installable version) if keeping core EasyMDE — don't need both.

### CONSOLIDATE — Auth plugins (too many, pick a strategy)
Currently: JWT login + OTP Login + Magic Link Auth = 3 auth paths, confusing
- [ ] Decision: Keep **JWT login** (standard, works) + **OTP Login** as optional upgrade for clients who want passwordless.
- [ ] Remove `available/magic-link-auth/` — OTP Login covers the same use case with less complexity.
- [ ] **KEEP `core-plugins/email-plugin/`** — it powers OTP Login (Resend API integration). Removing it breaks passwordless auth. Not related to magic link.

### EVALUATE — Keep or kill per client use case
- [ ] `core-plugins/database-tools-plugin/` — has truncate/backup/validation. NEVER expose in client deployments. Gate behind env flag `FLARECMS_DEV_TOOLS=true` or remove entirely. Evaluate.
- [ ] `core-plugins/code-examples/` — syntax-highlighted code snippets. Not useful for local business clients (boutique, auto dealer, life coach). Remove from default, make installable-only.

### KEEP — Core functionality, activate and polish
- [ ] Analytics & Tracking ✅
- [ ] Authentication System ✅
- [ ] Cache System ✅
- [ ] Media Manager ✅
- [ ] Workflow Engine — **fix the duplicate**: two versions show in UI (v1.0.0-beta1 and v1.0.0-beta.1). Consolidate to one.
- [ ] AI Search — currently Inactive. **Activate and wire up.** This is a key differentiator. See Phase 3.
- [ ] FAQ Management ✅ — useful for most clients
- [ ] Customer Testimonials ✅ — useful for most clients
- [ ] Cloudflare Turnstile — keep as Available/opt-in, not forced

---

## PHASE 2 — Admin UI & Navigation Fix

### Sidebar cleanup
- [ ] Audit sidebar nav for duplicated URLs. Remove duplication. Each route should appear exactly once.
- [ ] The default sidebar shows SonicJS demo collections: "Blog Posts", "Docs Sections", "Documentation", "News" — these are seeded from SonicJS's demo. A fresh FlareCMS install for dthelifecoach should NOT show these by default.
- [ ] Collections in sidebar should only show what the site operator has actually defined in `packages/cms/src/collections/`. Make sidebar dynamic from actual collection definitions.
- [ ] Broken editor: identify which editor is broken (Quill? EasyMDE?), fix or replace. Don't ship broken tooling.

### Plugin management UI
- [ ] The "Experimental Feature" warning banner on the Plugins page needs to either be removed (if it's production ready) or the functionality needs to reach that state. Don't show "experimental" to clients.
- [ ] Plugins page shows 21 total / 13 active — after Phase 1 purge, this number should drop to ~8-10 meaningful plugins.

---

## PHASE 3 — AI Search Activation (FlareCMS differentiator)

The AI Search plugin already exists (`core-plugins/ai-search-plugin/`) with embedding service, chunking, RAG service, and indexer. It's just Inactive.

- [ ] Activate AI Search plugin and wire up Workers AI binding (`AI`) in `wrangler.toml`
- [ ] Test embedding generation on real content collections
- [ ] Integrate CF AI Search **similarity cache freshness** (new CF feature, June 24 2026) — reduces inference cost for repeated/similar queries
- [ ] Add AI Search to the public-facing site as a real search experience (not just admin)
- [ ] Document the setup steps for deploying to a new client site

---

## PHASE 4 — Dogfood: Deploy for Real Clients

### 915website.com (internal dogfood)
- [ ] Set up FlareCMS instance for 915website.com content management
- [ ] Define collections: case studies, services, blog posts, testimonials
- [ ] Deploy and actually use it for a month before selling to clients

### dthelifecoach.com (first real client)
- [ ] Define client-specific collections: services, testimonials, blog/articles, FAQs
- [ ] Deploy with only the plugins that client actually needs (no demos, no dev tools)
- [ ] Document the "new client setup" process as you go — this becomes the onboarding playbook

---

## PHASE 5 — Astro 7.0 Upgrade

> From today's Scout Briefing (June 25, 2026)
- [ ] Upgrade `astro` to 7.0.x in `packages/site/`
- [ ] Upgrade `@astrojs/cloudflare` to compatible version
- [ ] Upgrade `vite` to v8 (comes with Astro 7)
- [ ] Test builds — Rust compiler is new, watch for any markdown processing edge cases
- [ ] Advanced Routing: evaluate if any FlareCMS site routing can benefit

---

## Notes
- Do NOT add new features until Phase 1 + 2 are done. Clean before build.
- The goal is a CMS you'd be proud to show Daniel Nunez at SunCity Trucks.
- Every plugin removed is maintenance burden removed permanently.
- Reference the GSD workflow: `/gsd-plan-phase` before executing each phase.
