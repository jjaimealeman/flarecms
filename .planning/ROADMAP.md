# Roadmap: Flare CMS

## Milestones

- SHIPPED **v2.0 Platform Maturity** -- Phases 1-10 (shipped 2026-03-15)
- SHIPPED **v2.1 Live Demo** -- Phases 11-14 (shipped 2026-03-18)

<details>
<summary>v2.0 Platform Maturity (Phases 1-10) -- SHIPPED 2026-03-15</summary>

- [x] Phase 1: CMS Content Foundation (2/2 plans) -- 2026-03-08
- [x] Phase 2: Docs Layout & Navigation (2/2 plans) -- 2026-03-08
- [x] Phase 3: Content Rendering & Route (3/3 plans) -- 2026-03-08
- [x] Phase 4: Site Shell & Homepage (3/3 plans) -- 2026-03-08
- [x] Phase 5: Documentation Content (5/5 plans) -- 2026-03-08
- [x] Phase 6: Search & Deploy (3/3 plans) -- 2026-03-09
- [x] Phase 7: Astro Content Layer Loader (3/3 plans) -- 2026-03-09
- [x] Phase 8: Live Preview API (3/3 plans) -- 2026-03-09
- [x] Phase 9: Schema Migrations UI (4/4 plans) -- 2026-03-09
- [x] Phase 10: Workflow Engine Activation (3/3 plans) -- 2026-03-15

Full details: milestones/v2.0-ROADMAP.md

</details>

## v2.1 Live Demo

**Milestone Goal:** Let visitors experience FlareCMS firsthand -- email in, demo out. A public /demo page gates access via OTP email, drops visitors into the admin with a sandboxed collection they can freely edit, and a cron resets everything every 6 hours.

### Phase Overview

- [x] **Phase 11: Sandbox Foundation** - Demo role, sandbox collection, permission boundaries, rate limiting
- [x] **Phase 12: Demo Authentication** - OTP email login flow with 30-minute session expiry
- [x] **Phase 13: Demo Page** - Astro /demo page with email gate, OTP entry, and admin redirect
- [x] **Phase 14: Reset & Cleanup** - Cron trigger to reset sandbox data and purge expired sessions

### Phase Details

#### Phase 11: Sandbox Foundation
**Goal**: Demo visitors land in an admin that gives them a safe playground -- one collection they own, everything else read-only, with guardrails against abuse
**Depends on**: Nothing (builds on existing RBAC shipped in v2.0)
**Requirements**: SAND-01, SAND-02, SAND-03, SAND-04, SAND-05, DEMO-04
**Success Criteria** (what must be TRUE):
  1. A `demo-sandbox` collection exists in admin with title, content, and status fields pre-populated with sample rows
  2. A user with `demo` role can view all collections but can only create/edit/delete content in `demo-sandbox`
  3. A demo user who exceeds 50 mutations in a session receives a clear "limit reached" response and is blocked from further writes
  4. Demo file uploads accept only images under 2MB; other file types or oversized images are rejected with a clear message
  5. Every demo signup is recorded in a `demo_signups` table with email, IP address, and timestamp
**Plans**: 3 plans

Plans:
- [x] 11-01-PLAN.md -- Demo sandbox plugin, migration 038, collection + demo-service, plugin registration
- [x] 11-02-PLAN.md -- Mutation rate limiting, upload restrictions middleware
- [x] 11-03-PLAN.md -- Gap closure: grant viewer on all collections for demo users (SAND-02)

#### Phase 12: Demo Authentication
**Goal**: A visitor can go from entering their email to sitting in the admin dashboard in under 60 seconds, with no password to remember
**Depends on**: Phase 11 (demo role must exist for session assignment)
**Requirements**: DEMO-01, DEMO-02, DEMO-03
**Success Criteria** (what must be TRUE):
  1. Visitor submits their email and receives an OTP code via Resend within seconds
  2. Visitor enters the OTP code and is logged into the admin panel with `demo` role -- no password creation needed
  3. Demo session automatically expires after 30 minutes and the user is redirected to the demo page
**Plans**: 1 plan

Plans:
- [x] 12-01-PLAN.md -- OTP send/verify endpoints, branded email template, 30-min JWT session, route wiring

#### Phase 13: Demo Page
**Goal**: Visitors on flarecms.dev see a clear path to try the CMS -- one page, minimal friction, straight into the admin
**Depends on**: Phase 12 (OTP flow must work before the page can use it)
**Requirements**: PAGE-01, PAGE-02, PAGE-03
**Success Criteria** (what must be TRUE):
  1. Visiting flarecms.dev/demo shows a page with a brief explanation of what the demo offers and an email input field
  2. The page displays a visible disclaimer about 30-minute sessions, 50-operation limits, and 6-hour data resets
  3. After successful OTP verification on the /demo page, the visitor is redirected to admin.flarecms.dev and lands authenticated as a demo user
**Plans**: 2 plans

Plans:
- [x] 13-01-PLAN.md -- Backend: CORS on demo auth routes, token in verify response, exchange endpoint
- [x] 13-02-PLAN.md -- Astro /demo page with audience toggle, email/OTP flow, admin redirect, nav links

#### Phase 14: Reset & Cleanup
**Goal**: The demo stays clean without manual intervention -- sandbox data resets itself, expired sessions disappear, and the system stays healthy
**Depends on**: Phase 11 (sandbox content must exist to reset)
**Requirements**: RESET-01, RESET-02, RESET-03
**Success Criteria** (what must be TRUE):
  1. A Cloudflare cron trigger fires every 6 hours automatically
  2. After cron runs, all demo-sandbox content is replaced with fresh seed data (visitor edits are gone, sample rows are back)
  3. After cron runs, all expired demo sessions are purged from the database
**Plans**: 1 plan

Plans:
- [x] 14-01-PLAN.md -- DemoResetService + cron trigger wiring (sandbox reset + user purge)

## Progress

**Execution Order:** 11 -> 12 -> 13 -> 14

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-10 | v2.0 | 31/31 | Complete | 2026-03-15 |
| 11. Sandbox Foundation | v2.1 | 3/3 | Complete | 2026-03-16 |
| 12. Demo Authentication | v2.1 | 1/1 | Complete | 2026-03-16 |
| 13. Demo Page | v2.1 | 2/2 | Complete | 2026-03-18 |
| 14. Reset & Cleanup | v2.1 | 1/1 | Complete | 2026-03-18 |

---
*Last updated: 2026-03-18 after Phase 14 complete*
