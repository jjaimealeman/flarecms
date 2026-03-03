# Roadmap: SonicJS Fork — Production Edge CMS

## Overview

A soft fork of SonicJS v2.8.0 is hardened from a developer demo into a production-grade headless CMS deployable per-client on Cloudflare Workers. The build sequence is dictated by a strict dependency graph: infrastructure must be correctly wired before security can be layered on, security must be complete before content workflow improvements are trustworthy, and media/caching infrastructure feeds the integration layer that makes the CMS composable for Astro frontends. The result is a CMS Jaime can hand to agency clients with confidence — no hardcoded secrets, no broken APIs, no manual workarounds.

## Phases

**Phase Numbering:**
- Integer phases (0, 1, 2, 3, 4, 5): Planned milestone work
- Decimal phases (e.g., 2.1): Urgent insertions via `/gsd:insert-phase`

- [x] **Phase 0: Foundation** - Repo hygiene, R2 binding fix, fork tracking, security PR cherry-picks
- [x] **Phase 1: Security Hardening** - Production-safe auth layer: PBKDF2, JWT env var, rate limiting, CORS, CSRF, security headers
- [x] **Phase 2: Content Workflow** - Fix API filtering, bidirectional status transitions, RBAC, audit trail, scheduling, slug uniqueness
- [x] **Phase 3: Media Pipeline + Caching** - Streaming R2 uploads, Cache API for media serve, KV cache wired, write-through invalidation
- [x] **Phase 4: Hook System + Integration** - Wire hook system, outgoing webhooks, plugin middleware
- [x] **Phase 5: Production Deployment** - Deploy CMS + Astro frontend, per-client wrangler template, observability
- [x] **Phase 6: Audit Gap Closure** - Fix RBAC collection guard, wire hooks into scheduled publish, fix binding validation return

## Phase Details

### Phase 0: Foundation
**Goal**: The repository is clean, the fork is trackable, and the infrastructure bindings are correctly wired — every subsequent phase builds on a stable base
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05
**Success Criteria** (what must be TRUE):
  1. R2 media binding is renamed to `MEDIA_BUCKET` and wrangler logs no binding errors on startup
  2. Startup validation rejects missing D1, R2, or KV bindings with a clear error before handling any request
  3. `FORK-CHANGES.md` exists, upstream remote is configured, and all 7 mmcintosh security PRs (#659-#663, #668, #671) are cherry-picked with `[fork-patch]` tags
  4. A staging D1 database exists and the migration review workflow (grep for `BEGIN TRANSACTION` before applying) is documented
  5. Local `wrangler dev` starts without errors and the `/api/health` endpoint returns 200
**Plans**: 3 plans (2 waves)

Plans:
- [x] 00-01: Fix R2 binding mismatch and add startup binding validation
- [x] 00-02: Establish fork tracking (FORK-CHANGES.md, upstream remote, commit convention)
- [x] 00-03: Cherry-pick 7 mmcintosh security PRs and document staging migration workflow

### Phase 1: Security Hardening
**Goal**: Users can trust the CMS with real credentials — no hardcoded secrets, passwords are not crackable from a DB dump, and auth endpoints are protected from brute force
**Depends on**: Phase 0
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06
**Success Criteria** (what must be TRUE):
  1. `JWT_SECRET` is read from `c.env.JWT_SECRET`; a startup assertion blocks all requests if the value matches the hardcoded default string
  2. New user passwords are stored as PBKDF2-SHA256 with per-user random salt; existing users are transparently re-hashed on next successful login
  3. Repeated failed login attempts (>5 in 10 seconds) receive 429 responses from the CF Rate Limiting binding
  4. All responses include HSTS, X-Frame-Options, and X-Content-Type-Options headers from Hono `secureHeaders` middleware
  5. CORS rejects requests from origins not in the configured allowlist; wildcard `*` is gone
  6. Admin route mutations are rejected without a valid CSRF token header
**Plans**: 2 plans (2 waves)

Plans:
- [x] 01-01-PLAN.md — Wire fork dependency, configure environment, JWT assertion, PBKDF2 migration log
- [x] 01-02-PLAN.md — End-to-end verification of all 6 SEC controls

### Phase 2: Content Workflow
**Goal**: Editors can manage the full lifecycle of content — create, publish, unpublish, schedule, and query — without workarounds, and access is scoped to each user's role
**Depends on**: Phase 1
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, AUTH-01, AUTH-02
**Success Criteria** (what must be TRUE):
  1. API query params (`filter[field][op]=value`, `sort`, `limit`, `offset`) produce correct D1 WHERE clauses — fetching all content and filtering client-side is no longer necessary
  2. Published content can be transitioned back to draft (unpublish); the admin UI reflects the new state immediately
  3. Every status transition (draft → published, published → draft, etc.) is recorded in `workflow_history` with the acting user ID and timestamp
  4. The content versioning modal closes correctly and rollback to a previous version produces the expected content state
  5. Content scheduled for a future publish date is automatically published by the Workers scheduled trigger at the correct time
  6. Creating two content items with the same slug in the same collection returns a validation error, not a silent duplicate
  7. An `editor` role user can create and edit content in assigned collections but cannot modify collection schemas or user accounts; a `viewer` role user receives read-only API responses
  8. A read-only API token scoped to a collection returns content without exposing write endpoints
**Plans**: 7 plans (2 waves)

Plans:
- [x] 02-01-PLAN.md — Fix API query filtering (bracket-syntax into D1 WHERE clauses)
- [x] 02-02-PLAN.md — Content state machine (bidirectional transitions, slug lock, slug uniqueness)
- [x] 02-03-PLAN.md — Workflow history audit trail (status changes + content edits)
- [x] 02-04-PLAN.md — Content versioning UI fix (modal close bug #666, stable rollback)
- [x] 02-05-PLAN.md — Content scheduling via Workers cron trigger
- [x] 02-06-PLAN.md — Collection-level RBAC (admin, editor, author, viewer)
- [x] 02-07-PLAN.md — Read-only API tokens (hashed, collection-scoped)

### Phase 3: Media Pipeline + Caching
**Goal**: Media uploads work reliably for all file types including large files, media is served efficiently from the edge, and content API responses are cached to reduce D1 reads
**Depends on**: Phase 0 (R2 binding), Phase 1 (security headers for CORS on media)
**Requirements**: MEDIA-01, MEDIA-02, MEDIA-03, CACHE-01, CACHE-02
**Success Criteria** (what must be TRUE):
  1. PDF and image uploads succeed in the admin UI and files appear in R2; the `MEDIA_BUCKET is not available!` error is gone
  2. A 50MB file upload completes without a memory error; uploads are streamed to R2 rather than buffered in Workers memory
  3. Media files served from R2 include `Cache-Control: public, max-age=31536000, immutable` and ETag headers; repeat requests within TTL return a cached response
  4. Content API responses are served from KV cache on cache hit; a content mutation (create, update, delete) immediately invalidates the relevant KV keys
  5. The KV cache hit/miss status is visible in `X-Cache-Status` response headers
**Plans**: 3 plans (2 waves)

Plans:
- [x] 03-01-PLAN.md — Fix R2 media uploads and switch to streaming for large files
- [x] 03-02-PLAN.md — Cache API for media serving and wire KV namespace into three-tier cache
- [x] 03-03-PLAN.md — End-to-end verification of all 5 success criteria

### Phase 4: Hook System + Integration
**Goal**: The CMS is composable — plugins receive real lifecycle events, Astro frontends are notified on content publish, and the versioning UI is stable
**Depends on**: Phase 2 (content state machine must exist for hooks to fire on state transitions), Phase 3 (media hooks need working pipeline)
**Requirements**: INTG-01, INTG-02
**Success Criteria** (what must be TRUE):
  1. Route handlers call `hookSystem.execute()` — not `emitEvent()` stubs; a registered plugin that listens to `content:after-publish` receives the event payload after a content item is published
  2. Publishing or unpublishing content triggers an outgoing HTTP POST webhook to a configured URL (e.g., Astro rebuild endpoint); the webhook payload includes the content ID and event type
  3. A plugin registered in `sonicjs.config.ts` can register its own Hono middleware by receiving the `app` reference through `PluginContext`
**Plans**: 3 plans (2 waves)

Plans:
- [x] 04-01-PLAN.md — Extend hook constants, cancellation result type, hooks singleton, plugin middleware wiring
- [x] 04-02-PLAN.md — Wire hooks into content/media routes, webhook delivery service with HMAC-SHA256
- [x] 04-03-PLAN.md — Gap closure: wire PluginManager to hook singleton, activate lifecycle, plugin registration in config

### Phase 5: Production Deployment
**Goal**: The CMS and Astro frontend are live in production, every deploy is observable, and spinning up a new client instance takes minutes not hours
**Depends on**: Phases 1-4 (all prior phases must be stable before client deployment)
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04
**Success Criteria** (what must be TRUE):
  1. The CMS backend is deployed to Cloudflare Workers production and returns a healthy response from the production URL
  2. The Astro frontend is deployed to Cloudflare Pages and loads blog, news, and pages routes from the production CMS API
  3. A new client instance can be provisioned by copying the wrangler environment template, running `wrangler d1 create`, and executing `wrangler deploy --env client-name` — no per-client code changes required
  4. Auth events (login, logout, failed login) and errors appear in Workers Logs with structured JSON fields; `observability.enabled = true` is set in wrangler.toml
**Plans**: 4 plans (3 waves)

Plans:
- [x] 05-01-PLAN.md — Structured logging utility + instrument auth/content routes (DEPLOY-04)
- [x] 05-02-PLAN.md — Per-client provisioning script (DEPLOY-03)
- [x] 05-03-PLAN.md — CMS backend production deploy: wrangler.toml config + deploy runbook (DEPLOY-01)
- [x] 05-04-PLAN.md — Astro frontend deploy to Cloudflare Pages (DEPLOY-02)

### Phase 6: Audit Gap Closure
**Goal**: Close the 2 blocker gaps and 1 high-severity integration bug identified by the v1 milestone audit — AUTH-01 RBAC enforcement, scheduled publish hook/webhook/cache pipeline, and binding validation error response
**Depends on**: Phases 2, 4 (RBAC and hook system must exist)
**Requirements**: AUTH-01 (complete), CONT-05 (complete), FOUND-04 (complete)
**Gap Closure**: Closes gaps from v1-MILESTONE-AUDIT.md
**Success Criteria** (what must be TRUE):
  1. An `editor` role user receives 403 when attempting to create, update, or delete a collection schema via admin-api.ts — only `admin` role can modify schemas
  2. When scheduled content is auto-published by the cron trigger, `AFTER_CONTENT_PUBLISH` hook fires, outgoing webhooks are delivered, and the KV cache for that collection is invalidated — matching the behavior of manual publish via the API
  3. If D1, R2, or KV bindings are missing, the binding validation middleware returns a 500 JSON response to the client (not a silently dropped response)
**Plans**: 1 plan (1 wave)

Plans:
- [x] 06-01-PLAN.md — Verify admin-only guard, wire hooks/webhooks/cache into scheduled publish, fix binding validation return

## Progress

**Execution Order:**
Phases execute in numeric order: 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Foundation | 3/3 | Complete | 2026-03-02 |
| 1. Security Hardening | 2/2 | Complete | 2026-03-02 |
| 2. Content Workflow | 7/7 | Complete | 2026-03-02 |
| 3. Media Pipeline + Caching | 3/3 | Complete | 2026-03-02 |
| 4. Hook System + Integration | 3/3 | Complete | 2026-03-02 |
| 5. Production Deployment | 4/4 | Complete | 2026-03-02 |
| 6. Audit Gap Closure | 1/1 | Complete | 2026-03-02 |
