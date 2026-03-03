# Project Research Summary

**Project:** SonicJS CMS — Security Hardening + Production Hardening for Agency Deployment
**Domain:** Edge-native headless CMS soft fork (SonicJS v2.8.0 on Cloudflare Workers)
**Researched:** 2026-03-01
**Confidence:** HIGH (core pitfalls verified against live source code; architecture verified against Cloudflare official docs)

---

## Executive Summary

This is a soft fork of SonicJS v2.8.0 targeting production deployability for agency clients via 915website.com. The base platform is technically sound — Hono + D1 + R2 + KV on Cloudflare Workers gives a genuinely differentiated edge-native CMS with architecture that no mainstream open-source CMS (Strapi, Directus, Payload) matches. However, the codebase ships with critical security flaws (hardcoded JWT secret, SHA-256 password hashing with static salt), several blocking bugs (R2 binding mismatch, broken API filters, one-way publish state), and partially-wired infrastructure (KV cache not connected, hook system stubbed with no-ops). The delta between "developer demo" and "client-deployable product" is concrete and well-scoped.

The recommended approach is a layered build sequence: fix infrastructure and security foundations first (Phase 0-1), then tackle the blocking functional bugs that prevent real content workflows (Phase 2), then complete the media pipeline and caching infrastructure (Phase 3), and finally wire up the integration layer that makes the CMS composable for frontend teams (Phase 4). This order is dictated by the dependency graph: you cannot safely fix content workflow bugs on a system with forged-JWT-level security exposure, and you cannot deliver reliable webhooks before the hook system is properly wired. Seven open security PRs from mmcintosh (Feb 2026) on the upstream repo should be cherry-picked rather than re-implemented — they solve the exact problems identified here.

The primary risk is fork divergence compounding over time. Every local fix that isn't tracked creates future merge pain. This must be addressed as pre-work, not as a feature: establish a FORK-CHANGES.md tracking file, add an upstream remote, and adopt a `[fork-patch]` commit tagging convention before writing a single line of feature code. The secondary risk is the performance trap of client-side filtering as a workaround for the broken API filter bug — this pattern fails at ~500 content items and will become a production incident if not fixed server-side.

---

## Key Findings

### Recommended Stack

The base stack (Hono, Drizzle, D1, R2, KV, Cloudflare Workers) is locked and correct — do not replace any of it. The additional security and operational layer to add is almost entirely built from things already in the dependency tree: Hono's built-in `jwt`, `secureHeaders`, `cors`, and `csrf` middleware require zero new packages. Only two new packages are needed: `zod` + `@hono/zod-validator` for input validation, and `@elithrar/workers-hono-rate-limit` for the CF native rate-limiting binding. Secrets management via `wrangler secret put` requires no packages. Workers Logs observability is wrangler.toml config only. The overall installation footprint for all security hardening is two `npm install` entries.

**Core technologies:**
- Hono v4.x built-in middleware — JWT auth, security headers, CORS, CSRF — already in dependency tree, zero new installs
- Web Crypto API PBKDF2 — password hashing replacement for SHA-256, Workers built-in, no npm needed
- Cloudflare Rate Limiting binding + `@elithrar/workers-hono-rate-limit` — brute-force protection, requires wrangler v4.36.0+, period must be 10s or 60s
- Zod + `@hono/zod-validator` — API input validation, SQL injection prevention layer above Drizzle
- Drizzle Kit `generate` + `wrangler d1 migrations apply` — auditable migration workflow, never use `drizzle-kit push` in production
- Workers Logs (`observability.enabled = true` in wrangler.toml) — free tier (200k/day), zero-config, sufficient for solo-operated CMS

**Critical version constraints:**
- PBKDF2 is capped at 100,000 iterations in the Cloudflare Workers production runtime (workerd issue #1346); this is the pragmatic maximum — do not attempt 600,000
- Wrangler v4.36.0+ required for Rate Limiting binding
- Hono CSRF middleware versions < 4.5.8 had a bypass vulnerability (CVE-2024-43787); verify current version

### Expected Features

SonicJS's edge-native architecture and zero-egress-cost R2 media delivery are genuine differentiators no mainstream competitor matches. The gap is production reliability (blocking bugs) and editorial polish (workflow UX). The API filter bug is the single most important fix because it blocks all downstream querying features — it must be Phase 1.

**Must have (table stakes — clients expect these, absence causes rejection):**
- API filter fix (server-side WHERE clause) — broken API means no reliable frontend queries; blocks content scheduling, search, and SDK
- Content unpublish — one-way publish is a dealbreaker; clients cannot hide content
- Granular RBAC — client editors need scoped write access; client admins need collection config; agency needs superadmin
- Reliable media library — PDF upload broken, R2 binding mismatch means zero media works currently
- Outgoing webhooks — Astro frontend needs rebuild triggers on publish; no webhook = no cache invalidation
- Stable versioning UI — modal close bug (issue #666) must be fixed; rollback must work
- Secure JWT with refresh tokens — production auth requires token refresh flow, not just login

**Should have (competitive differentiators to add after first client is live):**
- TypeScript SDK with auto-generated types — major DX win, reduces frontend integration bugs (issue #642 tracks this)
- Content scheduling — common marketing request; already partially in schema
- Import/Export (JSON/CSV) — needed for client onboarding from other CMSs

**Defer to v2+:**
- Multi-tenancy — build when managing 3+ clients on one instance justifies it
- GraphQL API — only if a client frontend team explicitly requires it
- i18n/localization — build when first international client engagement happens
- WebSocket real-time collaboration — Durable Objects complexity; defer indefinitely
- Visual workflow automation (Flows) — high complexity; not needed until teams outgrow webhooks

**Anti-features (say no to these):**
- Full WYSIWYG page builder — design-driven content modeling anti-pattern; creates unmaintainable content types
- Multi-database support (MySQL/Postgres) — D1/SQLite is an edge-native feature, not a limitation
- Built-in ecommerce — separate vertical product; recommend Shopify + API integration

### Architecture Approach

The current architecture is well-designed but incompletely wired. The middleware stack has security placeholders that do nothing (`security: (no-op placeholder)` in app.ts). The hook system has 22 named hooks defined but routes call `emitEvent()` stubs that only `console.log`. The three-tier cache (memory → KV → DB) is designed but KV is not connected. The media pipeline uses `file.arrayBuffer()` which buffers entire files and will crash on uploads > ~50MB. The build order is dictated by these dependency layers: Foundation first (bind R2, wire security middleware), then Core Services (wire KV cache, implement content state machine, fix API filters), then Content Lifecycle (connect routes to hook system, implement write-through cache invalidation), then Media Pipeline (stream uploads, add Cache API for serve), then Plugin Integration (add `app` reference to PluginContext so plugins can register middleware).

**Major components:**
1. Middleware Stack (Hono) — security headers, CORS, rate limiting, auth; currently has no-op placeholders where security should be
2. Service Layer — ContentService, MediaService, AuthService, CacheService; KV not wired into CacheService, HookSystem not wired into routes
3. Content State Machine — target: pure function transition validator; current: one-way status bug, missing `published → draft` (unpublish) transition
4. Media Pipeline — target: streaming R2 upload + Cache API serve; current: memory-buffering upload, `BUCKET` vs `MEDIA_BUCKET` binding name mismatch
5. Plugin Hook System — 22 hooks defined, priority queue implemented, but execution path is stubbed with emitEvent no-ops; PluginContext missing `app` reference
6. Three-Tier Cache — memory → KV → D1 design is correct; KV namespace binding not passed to cache plugin

### Critical Pitfalls

1. **Hardcoded JWT secret deployed to production** — `auth.ts` contains a literal `'your-super-secret-jwt-key-change-in-production'` string. Any attacker with repo access can forge admin tokens for all production deployments. Fix: `wrangler secret put JWT_SECRET`; add startup assertion that rejects the default value before handling any request. (Phase 0 pre-work)

2. **SHA-256 + static salt for password storage** — current `hashPassword()` uses SHA-256 with a hardcoded salt string. Modern GPUs crack this in minutes after a DB dump. Fix: replace with PBKDF2-SHA256 at 100,000 iterations with per-user random salt (Web Crypto built-in, no npm required). PR #659 from mmcintosh implements this correctly — cherry-pick it. (Phase 1)

3. **R2 binding name mismatch** — `my-astro-cms/wrangler.toml` binds R2 as `BUCKET`; core package reads `c.env.MEDIA_BUCKET`. Result: all media operations silently fail. Wrangler logs show `MEDIA_BUCKET is not available!` but the admin UI shows no error. Fix: rename binding in wrangler.toml to `MEDIA_BUCKET`; add startup validation for all required bindings. (Phase 0 — must be before any other work)

4. **D1 migration transaction syntax fails in production** — `BEGIN TRANSACTION` / `COMMIT` in SQL migration files works in local `wrangler dev` but throws in production D1. Drizzle Kit sometimes generates these. A migration that runs cleanly locally can brick the production database. Fix: always grep generated migrations for `BEGIN TRANSACTION` before applying; maintain a staging D1 database; never trust `--local` alone for migrations. (Phase 0)

5. **Fork divergence compounding** — every local fix that isn't tracked creates future merge impossibility. Seven upstream security PRs are open and unmerged; re-implementing them locally without tracking creates permanent divergence. Fix: add `FORK-CHANGES.md`, add `upstream` remote to git, tag all core-touching commits with `[fork-patch]`, cherry-pick the 7 mmcintosh PRs rather than re-implementing. (Phase 0 pre-work, before any code)

6. **Client-side filtering as workaround creates production time bomb** — returning entire D1 table for client-side filtering fails at ~500 content items. Fix API filters server-side (add WHERE clause to D1 queries from filter params); this unblocks all downstream content querying features. (Phase 2)

---

## Implications for Roadmap

Based on combined research, the dependency graph dictates a 5-phase build sequence. The ordering is not arbitrary — it reflects the fact that security flaws must be fixed before content workflow improvements (to avoid building on a compromised foundation), and infrastructure wiring must precede feature work (because features depend on correctly-bound services).

### Phase 0: Foundation — Repo Setup + Infrastructure Audit

**Rationale:** Pre-work that is not feature work but must happen before any code is written. Two of the six critical pitfalls are preventable only at this stage. Doing this after Phase 1 means security patches land on an untracked fork.
**Delivers:** Clean repository hygiene, working R2 binding, verified migrations, fork divergence tracking established
**Addresses:**
- Pitfall #3: R2 binding mismatch (`BUCKET` → `MEDIA_BUCKET`)
- Pitfall #4: D1 migration transaction syntax (establish staging D1, document review process)
- Pitfall #5: Fork divergence (add upstream remote, FORK-CHANGES.md, cherry-pick 7 mmcintosh security PRs)
**Key tasks:**
- Fix `wrangler.toml` binding: `BUCKET` → `MEDIA_BUCKET`
- Add startup binding validation (fail fast if required bindings missing)
- Create staging D1 database; document migration apply workflow
- Add `upstream` remote pointing to `lane711/sonicjs`
- Create `FORK-CHANGES.md` tracking all deliberate divergences
- Cherry-pick PRs #660, #659, #662, #661, #663, #668, #671 from mmcintosh
**No deeper research needed** — all tasks are mechanical; patterns are well-established

### Phase 1: Security Hardening

**Rationale:** After cherry-picking the 7 security PRs in Phase 0, this phase wires them properly and adds the remaining security infrastructure. Must come before any client-facing deployment. Cannot be deferred — hardcoded JWT secret and SHA-256 passwords are CVE-level issues.
**Delivers:** Production-safe auth layer: PBKDF2 passwords, environment-variable JWT secret, rate-limited auth endpoints, security headers, CSRF protection on admin, proper CORS
**Addresses:**
- Pitfall #1: Hardcoded JWT secret (wire `c.env.JWT_SECRET`, add startup assertion)
- Pitfall #2: SHA-256 password hashing (PBKDF2 with per-user salt, backward-compatible re-hash on login)
- KV auth cache invalidation risk (implement short TTL + logout invalidation path)
**Stack from STACK.md:**
- Hono `jwt` middleware (factory pattern for `c.env.JWT_SECRET`)
- Hono `secureHeaders` middleware (HSTS, X-Frame-Options, X-Content-Type-Options)
- Hono `cors` middleware (replace wildcard with explicit origins)
- Hono `csrf` middleware (header-based, no token storage needed)
- CF Rate Limiting binding + `@elithrar/workers-hono-rate-limit`
- Web Crypto PBKDF2 (100k iterations, per-user salt)
- `wrangler secret put JWT_SECRET`
**Middleware order from ARCHITECTURE.md:** security headers → CORS → rate limiting → auth (before auth is critical so DoS can't overwhelm JWT verification path)
**No deeper research needed** — Hono docs + CF docs are comprehensive; STACK.md has exact implementation patterns

### Phase 2: Core Bug Fixes — Content Workflow

**Rationale:** Blocking bugs that prevent real content workflows. API filter bug is the single most critical fix because it blocks all downstream content querying, scheduling, and frontend SDK features. Draft/publish reliability must be solid before RBAC can be layered on top.
**Delivers:** Working API filter system (server-side WHERE clause), bidirectional content status transitions (unpublish works), granular RBAC with role-scoped permissions
**Addresses:**
- FEATURES.md P1: API filter fix, content unpublish, granular RBAC
- Pitfall #6: Client-side filtering as performance time bomb
- ARCHITECTURE.md content state machine (pure function transition validator, `published → draft` unpublish transition)
**Key tasks:**
- Fix API filter params: parse `filter[field][op]=value` into D1 WHERE clauses
- Implement content state machine as pure function (`canTransition(from, to, role) → {allowed, reason}`)
- Add `published → draft` transition (unpublish fix)
- Wire `workflow_history` audit trail on all status transitions
- Implement RBAC: `admin`, `editor`, `author`, `viewer` roles with collection-level permissions
**Research flag:** RBAC implementation may need a deeper research pass — field-level vs collection-level permission scoping decisions have long-term consequences. Directus's approach (field-level) is the gold standard but higher complexity. Recommend `gsd:research-phase` before execution.

### Phase 3: Media Pipeline + Caching Infrastructure

**Rationale:** Depends on Phase 0 (R2 binding fix) and Phase 1 (security headers for CORS on media responses). Media library is table stakes for content entry — broken PDF upload and zero R2 connectivity block real content work.
**Delivers:** Streaming R2 upload (not memory-buffering), Cache API for media serve, KV cache wired into CacheService, write-through cache invalidation on content mutations
**Addresses:**
- FEATURES.md P1: Reliable media library (PDF upload, stable selection)
- ARCHITECTURE.md: Streaming upload fix (`file.stream()` not `file.arrayBuffer()`), Cache API for serve route, KV wired into three-tier cache
- Performance trap: large file memory overflow (128MB Workers limit)
**Stack from STACK.md:**
- Cloudflare Cache API (media serve — free, local edge, 1-year immutable TTL)
- Cloudflare KV (content API responses — eventual consistency, 5min-2hr TTL)
- KV write-through invalidation on content mutations
**No deeper research needed** — ARCHITECTURE.md has exact implementation patterns verified against CF docs

### Phase 4: Hook System + Webhooks + Integration Layer

**Rationale:** Depends on Phase 2 (content state machine must exist before hooks fire on state transitions) and Phase 3 (media hooks need a working pipeline). This phase converts the CMS from a standalone CRUD tool to a composable integration platform.
**Delivers:** Working hook system (routes call `hookSystem.execute()` not `emitEvent()` stubs), outgoing webhooks for frontend cache invalidation, API token management UI, plugin middleware registration path
**Addresses:**
- FEATURES.md P1: Outgoing webhooks (Astro rebuild triggers)
- ARCHITECTURE.md: Replace `emitEvent()` stubs with actual `hookSystem.execute()` calls; add `app` reference to `PluginContext`; add missing workflow hooks to HOOKS constant
- FEATURES.md: Stable content versioning UI (modal close bug #666)
**Hook additions needed (from ARCHITECTURE.md):**
- `content:before-publish`, `content:after-publish`
- `content:unpublish`, `content:submit-review`, `content:approve`, `content:reject`
- `media:before-upload`, `media:after-upload`
- `cache:invalidate`
**Research flag:** Outgoing webhook delivery reliability (retry logic, queue vs direct HTTP call) may warrant a targeted research pass. Workers Queues is the right pattern for reliable delivery at scale but adds operational complexity.

### Phase 5: Production Deployment + Observability

**Rationale:** Final hardening before handing to agency clients. Depends on all prior phases being stable. Per-client deployment pattern (wrangler environments) must be decided before deploying to first client.
**Delivers:** Per-client wrangler environment configuration, Workers Logs enabled, Cloudflare Pages deployment for Astro frontend, documented runbook for client handoff
**Addresses:**
- STACK.md: `wrangler.toml` `[env.client-name]` per-client deployment pattern (not Workers for Platforms — that's SaaS scale overkill)
- STACK.md: `observability.enabled = true` in wrangler.toml for structured auth event logging
- FEATURES.md: Audit log surfaced in admin UI (listed as complete on roadmap — verify and expose)
**No deeper research needed** — STACK.md has exact wrangler environment patterns; CF Pages deployment is well-documented

---

### Phase Ordering Rationale

- **Phase 0 before Phase 1** because cherry-picking the 7 security PRs is the first step of security hardening, and fork tracking must exist before those commits land
- **Phase 1 before Phase 2** because content workflow fixes should not be built on a system with exploitable auth
- **Phase 2 before Phase 4** because the hook system needs the state machine to exist before `content:after-publish` hooks mean anything
- **Phase 3 runs in parallel with Phase 2** (different code surfaces) but must be sequenced after Phase 0 due to R2 binding dependency
- **Phase 5 is gated on all prior phases** because it's the client handoff phase

### Research Flags

Phases likely needing `gsd:research-phase` during planning:
- **Phase 2 (RBAC):** Field-level vs collection-level permission scoping is a consequential architecture decision. Directus-style field-level RBAC is powerful but significantly more complex than collection-level. Need to decide the tradeoff before implementation.
- **Phase 4 (Webhook delivery):** Reliable webhook delivery at the agency scale requires deciding between synchronous direct HTTP (simple, fails silently) and Workers Queues (reliable, retry logic, adds operational overhead). This decision should be researched before implementation.

Phases with well-established patterns (skip research-phase):
- **Phase 0:** Mechanical tasks — binding rename, git remote setup, cherry-pick commands
- **Phase 1:** Security patterns are fully documented in STACK.md with exact code samples
- **Phase 3:** Cache patterns verified against CF docs; ARCHITECTURE.md has implementation examples
- **Phase 5:** Wrangler environment patterns are standard CF documentation

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core libraries are already in the dependency tree; addition requirements (Zod, rate limiter) verified against official docs and community usage |
| Features | HIGH | Competitor feature analysis cross-referenced across 5 sources; bug status verified against live source code and SONICJS-ISSUES.md |
| Architecture | HIGH | Verified directly against source code in `sonicjs-fork/packages/core/src/`; CF platform patterns verified against official docs |
| Pitfalls | HIGH | Pitfalls #1, #2, #3 verified by direct source code inspection (hardcoded strings found in live files); Pitfall #4 verified against CF KV eventual consistency docs; Pitfall #5 verified against workerd issue tracker |

**Overall confidence: HIGH**

The research is unusually high-confidence for this type of project because the codebase already exists and most findings were verified against live source code rather than inferred. The main uncertainty areas are RBAC scope decisions (architectural tradeoffs, not bugs) and webhook reliability at scale (operational decisions that depend on usage patterns).

### Gaps to Address

- **Webhook delivery mechanism:** The research recommends Workers Queues for reliable delivery but the exact queue setup and retry configuration was not researched. Flag Phase 4 for a targeted research pass on Workers Queues patterns before execution.
- **RBAC scope:** Collection-level vs field-level permissions is a consequential choice. The research identifies both options but does not recommend one definitively because it depends on client requirements. Flag Phase 2 for requirements clarification before architecture is committed.
- **D1 read replication:** At 100k+ req/day, D1 single-threaded reads become a bottleneck. The Sessions API for D1 read replication was identified but not fully researched. This is a Phase 5 concern; address during production scaling, not initial deploy.
- **Hono CSRF version confirmation:** PR #668 uses Hono CSRF middleware, but versions < 4.5.8 have a bypass (CVE-2024-43787). The cherry-pick should be verified against the current Hono version in the fork before merging.

---

## Sources

### Primary (HIGH confidence — official documentation or live source inspection)

- Cloudflare Workers Limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare D1 Migrations: https://developers.cloudflare.com/d1/reference/migrations/
- Cloudflare KV — How It Works (eventual consistency): https://developers.cloudflare.com/kv/concepts/how-kv-works/
- Cloudflare Workers Secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Cloudflare Rate Limiting binding: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Cloudflare R2 Workers API: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
- Cloudflare Cache API: https://developers.cloudflare.com/workers/runtime-apis/cache/
- Cloudflare Security Headers example: https://developers.cloudflare.com/workers/examples/security-headers/
- Workers Logs: https://developers.cloudflare.com/workers/observability/logs/workers-logs/
- Hono JWT middleware: https://hono.dev/docs/middleware/builtin/jwt
- Hono CSRF middleware: https://hono.dev/docs/middleware/builtin/csrf
- Hono Secure Headers: https://hono.dev/docs/middleware/builtin/secure-headers
- workerd issue #1346 (PBKDF2 100k iteration cap): https://github.com/cloudflare/workerd/issues/1346
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- Live source: `sonicjs-fork/packages/core/src/middleware/auth.ts` — hardcoded JWT secret, SHA-256 hash confirmed
- Live source: `my-astro-cms/wrangler.toml` — `BUCKET` binding name confirmed (mismatch with core's `MEDIA_BUCKET`)
- Live source: `my-astro-cms/scripts/seed-admin.ts` — SHA-256 password in seed script confirmed
- SonicJS GitHub — 7 mmcintosh security PRs (#659-#671): https://github.com/lane711/sonicjs/pulls

### Secondary (MEDIUM confidence — community/vendor sources)

- SonicJS Official Roadmap: https://sonicjs.com/roadmap
- Directus Features page: https://directus.io/features
- Cloudflare blog on Payload CMS on Workers: https://blog.cloudflare.com/payload-cms-workers/
- dasroot.net 2026 CMS comparison (Strapi/Directus/Payload): https://dasroot.net/posts/2026/01/headless-cms-comparison-strapi-directus-payload/
- kernelics.com headless CMS comparison guide: https://kernelics.com/blog/headless-cms-comparison-guide
- @elithrar/workers-hono-rate-limit: https://github.com/elithrar/workers-hono-rate-limit
- Hono CVE-2024-43787 CSRF bypass: https://security.snyk.io/vuln/SNYK-JS-HONO-7814167
- D1 transaction syntax production failure: https://github.com/cloudflare/workerd/issues/5411
- Fork drift analysis: https://preset.io/blog/stop-forking-around-the-hidden-dangers-of-fork-drift-in-open-source-adoption/

---

*Research completed: 2026-03-01*
*Ready for roadmap: yes*
