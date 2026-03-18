# Project Milestones: Flare CMS

## v2.1 Live Demo (Shipped: 2026-03-18)

**Delivered:** Public demo page at flarecms.dev/demo with OTP email gate, sandboxed admin access, and automated 6-hour reset cron.

**Phases completed:** 11-14 (7 plans total)

**Key accomplishments:**

- OTP-gated passwordless demo login via Resend with 30-minute JWT sessions
- demo-sandbox collection with full CRUD for demo users, read-only on all other collections
- Rate limiting (50 mutations/session) and upload restrictions (images only, 2MB max) via KV-based guards
- Cross-domain cookie handoff pattern (token-in-URL exchange) bridging flarecms.dev → admin.flarecms.dev
- Astro /demo page with audience toggle, 6-digit OTP entry, and site-wide nav integration
- DemoResetService with FK-safe content reset and KV-expiry-based user purge on 6-hour cron

**Stats:**

- 89 files created/modified
- ~7,300 lines added (TypeScript/Astro)
- 4 phases, 7 plans, 40 commits
- 3 days from 2026-03-16 to 2026-03-18

**Git range:** `3c596c4` → `0f52260`

**Tech debt accepted:** 3 items (dead token generation in createDemoUser, dead cookies in /verify, hardcoded CORS origins in demo plugin). See `milestones/v2.1-MILESTONE-AUDIT.md`.

**What's next:** TBD — next milestone via `/gsd:new-milestone`

---

## v2.0 Platform Maturity (Shipped: 2026-03-15)

**Delivered:** Full documentation site powered by the CMS itself (100% dogfooding), plus 4 platform features — Astro Content Layer Loader, Live Preview API, Schema Migrations UI, and Workflow Engine.

**Phases completed:** 1-10 (31 plans total)

**Key accomplishments:**

- Full docs site with 8 sections (40+ pages) managed entirely through the CMS admin
- `@flare-cms/astro` Content Layer Loader — `getCollection()` with type safety, no manual fetches
- Live Preview API — split-screen real-time draft preview on same-edge-network
- Schema Migrations UI — field CRUD from admin dashboard with migration history and rollback
- Workflow Engine — content approval workflows (Draft -> In Review -> Approved -> Published)
- Client-side search with MiniSearch, Cmd+K modal, and fuzzy matching

**Stats:**

- 504 files created/modified
- ~201K lines of TypeScript/Astro
- 10 phases, 31 plans
- 8 days from 2026-03-08 to 2026-03-15 (236 commits)

**Git range:** `736bf77` -> `f6797b1`

**Tech debt accepted:** 8 items (schema_migrations bundle entry, workflow plugin dead code, bookkeeping gaps). See `milestones/v2.0-MILESTONE-AUDIT.md`.

**What's next:** TBD — next milestone via `/gsd:new-milestone`

---
