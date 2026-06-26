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
- [x] Keep **Quill** as the primary rich text editor (already active, best UX).
- [x] Remove `core-plugins/tinymce-plugin/` — redundant, licensing overhead, not needed.
- [x] Consolidate EasyMDE: the "Inactive" duplicate was a ghost DB entry (`easymde-editor`, migration 025) with no code — no-op'd it. The real plugin is `available/easy-mdx/`. Fixed display name inconsistency.
- [x] ~~Remove `available/easy-mdx/`~~ — Kept. It's the ONLY real implementation. The "core" version never existed as code.

### CONSOLIDATE — Auth plugins (too many, pick a strategy)
Currently: JWT login + OTP Login + Magic Link Auth = 3 auth paths, confusing
- [x] Decision: Keep **JWT login** (standard, works) + **OTP Login** as optional upgrade for clients who want passwordless.
- [x] Remove `available/magic-link-auth/` — OTP Login covers the same use case with less complexity.
- [x] **KEEP `core-plugins/email-plugin/`** — it powers OTP Login (Resend API integration). Removing it breaks passwordless auth. Not related to magic link.

### EVALUATE — Keep or kill per client use case
- [x] `core-plugins/database-tools-plugin/` — Gated behind `FLARECMS_DEV_TOOLS` env flag. Routes return 404 and truncate endpoint returns 403 without it.
- [x] `core-plugins/code-examples/` — Default status changed to `inactive` in migrations. Code stays, clients can activate from Plugins page if needed.

### KEEP — Core functionality, activate and polish
- [x] Analytics & Tracking ✅
- [x] Authentication System ✅
- [x] Cache System ✅
- [x] Media Manager ✅
- [x] Workflow Engine — Fixed duplicate: ghost `core-workflow` entry from migration 006 removed, kept `workflow-plugin` from migration 015. Version aligned to `1.0.0-beta.1`.
- [ ] AI Search — currently Inactive. **Activate and wire up.** This is a key differentiator. See Phase 3.
- [x] FAQ Management ✅ — useful for most clients
- [x] Customer Testimonials ✅ — useful for most clients
- [x] Cloudflare Turnstile — kept as Available/opt-in

---

## PHASE 2 — Admin UI & Navigation Fix

### Sidebar cleanup
- [x] Sidebar is already dynamic (admin-menu middleware queries DB for active collections). No hardcoded nav.
- [x] Removed SonicJS demo collection seeds (blog_posts, pages, news) from migration 001. Fresh installs only show collections registered by the CMS package via collection-sync.
- [x] Collections in sidebar now driven entirely by `packages/cms/src/collections/` config files synced on startup.
- [ ] Broken editor: identify which editor is broken (Quill? EasyMDE?), fix or replace. Don't ship broken tooling.

### Plugin management UI
- [x] Removed "Experimental Feature" warning banner from Plugins page — plugin system is production-ready since v2.0.
- [ ] Plugins page count — verify after deploying Phase 1 changes that the count reflects the purge.

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
