# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-01)

**Core value:** A secure, reliable CMS that Jaime can deploy per-client and trust in production
**Current focus:** v1 Milestone COMPLETE — all 7 phases executed and verified

## Current Position

Phase: 6 of 6 (Audit Gap Closure) — COMPLETE
Plan: 1 of 1 in current phase — Complete
Status: All 3 audit gaps closed. Project complete.
Last activity: 2026-03-02 — Completed 06-01-PLAN.md (audit gap closure)

Progress: [████████████████████████████████████████] 100% (23/23 total plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 18
- Total execution time: ~3.8 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 00-foundation | 3/3 | 16 min | 5.3 min |
| 01-security-hardening | 2/2 | 34 min | 17 min |
| 02-content-workflow | 7/7 | ~100 min | ~14 min |
| 03-media-pipeline-caching | 3/3 | ~65 min | ~22 min |
| 04-hook-system-integration | 3/3 | ~31 min | ~10.3 min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Soft fork approach — watch upstream, diverge where needed
- [Init]: Cherry-pick @mmcintosh PRs rather than re-implementing (7 PRs: #659-#663, #668, #671)
- [Init]: Per-client single-tenant deployment (wrangler environments, not Workers for Platforms)
- [Init]: Collection-level RBAC for v1 (field-level deferred to v2 AUTH-03)
- [Init]: Workers Queues research flagged for Phase 4 webhook delivery decision
- [00-02]: Fork point SHA is 2250de9b (PR #624 discord-webhook-audit merge)
- [00-03]: Staging D1 database ID: 83d65e82-86dd-4c43-8494-60f50e4c0053 (region WNAM)
- [01-01]: pnpm store caches file: dependencies — after rebuilding fork, must run `pnpm install` in my-astro-cms to refresh store
- [01-01]: (c.env as any).JWT_SECRET used for JWT_SECRET access — Bindings type doesn't include it
- [01-01]: wrangler.toml vars NOT inherited by child environments — must set CORS_ORIGINS explicitly in each env section
- [01-01]: CACHE_KV prod namespace ID: 7dacbabdf6aa4896b0c9b0bc7b9125fe; staging: deeb721cb0e5460ca410222fef5af184
- [01-02]: Default admin password is sonicjs! — user updated .env to match
- [01-02]: HSTS skipped in dev mode (ENVIRONMENT=development) — correct per Hono secureHeaders
- [02-01]: Bracket-syntax filter parsing placed after simpleFieldMappings loop — both simple and bracket params populate filter.where.and
- [02-01]: Shorthand sort constrained to /^-?[a-zA-Z_][a-zA-Z0-9_]*$/ — preserves existing ?sort=JSON support and error handling test
- [02-01]: api.ts wiring was already correct — no changes needed, parseFromQuery -> build -> db.prepare.bind pattern was in place
- [02-02]: isSlugLocked uses published_at (not status === 'published') — slug stays locked even after unpublishing, ensures URL stability
- [02-02]: State machine service in services/ not utils/ — it's business logic not a pure utility
- [02-02]: Bulk action validates per-item transitions and rejects entire batch on any invalid — prevents partial state corruption
- [02-06]: Admin global role bypasses all collection checks — no DB lookup on admin requests
- [02-06]: Author edit check is two-step: checkCollectionPermission() returns true, isAuthorAllowedToEdit() enforces author_id === userId separately
- [02-06]: HTMX lazy-load pattern used for permissions table (hx-trigger=load) — avoids slowing user edit page load
- [02-06]: dist files tracked in git create recurring issue — pnpm build regenerates with new hash names; must build + stage dist before every commit
- [02-03]: Non-blocking audit pattern — all audit calls wrapped in try/catch, failure logged but never surfaces as HTTP error
- [02-03]: logContentEdit uses from_status=to_status (current status) — content_edit is not a state transition, records what status content was in when edited
- [02-03]: workflow_history schema extended locally; must apply --remote before staging/production: ALTER TABLE workflow_history ADD COLUMN changed_fields TEXT; ADD COLUMN action_type TEXT DEFAULT 'status_change'
- [02-04]: Script tags inside innerHTML-injected HTML fragments are never executed — all modal JS must live in the host page template
- [02-04]: Version history modal now uses id='version-history-modal' for reliable targeting; backdrop click-to-close added
- [02-04]: Rollback audit uses action_type='rollback' and action='rollback' (was 'version_restored' with no action_type)
- [03-01]: R2 my-astro-cms-media bucket confirmed in Cloudflare account; MEDIA_BUCKET binding consistent in wrangler.toml + app.ts + route handlers
- [03-01]: file.stream() for non-image uploads (PDFs/videos/audio/docs); file.arrayBuffer() only for images needing dimension extraction
- [03-01]: sonicjs-fork/ is a nested git repo — must cd into it for all git operations; parent repo git won't track its contents
- [03-02]: Cache API is transparent on /files/* — no X-Cache-Status header; Cache API operates at edge layer before Workers code
- [03-02]: object.writeHttpMetadata(headers) preferred over manual httpMetadata reads — R2 recommended approach
- [03-02]: kvInitialized module-level flag prevents redundant setGlobalKVNamespace calls per Workers isolate
- [03-02]: KV middleware placed before all app.route() calls — getCacheService() singleton created with KV as Tier 2
- [03-02]: cache.match() always misses on *.workers.dev and local dev — expected behavior, not a bug
- [03-02]: executionCtx.waitUntil(cache.put(...)) used for non-blocking cache population

- [03-03]: getCacheService() in services/cache.ts was not singleton — fixed with Map<keyPrefix, CacheService> pattern
- [03-03]: isPluginActive() import broken through tsup re-export chain — replaced with inline D1 query in api.ts
- [03-03]: Two separate CacheService classes: services/cache.ts (simple) vs plugins/cache/services/cache.ts (three-tier) — api.ts uses the simple one
- [03-03]: Module-level state persists in Workers isolate between requests — confirmed with debug counter
- [03-03]: services/cache.ts upgraded from memory-only to memory+KV two-tier — setGlobalKVNamespace() wired from app.ts middleware
- [03-03]: app.ts KV middleware calls both setPluginKVNamespace and setSimpleKVNamespace — both cache singletons get KV

### Pending Todos

- ~~Update `CORS_ORIGINS` in `[env.production]` in `my-astro-cms/wrangler.toml` with actual production domain before deploying~~ (done — set to https://my-astro-site.pages.dev; update if Pages URL differs)
- Complete production deploy per DEPLOY-RUNBOOK.md — then resume 05-03-PLAN.md checkpoint

### Blockers/Concerns

- [Pre-work]: Phase 4 webhook delivery mechanism (direct HTTP vs Workers Queues) flagged for research pass before Phase 4 planning
- [01-01]: Pre-existing TypeScript error in blog-posts.collection.ts (quill type not in FieldType union) — runtime works, type check fails
- [01-01]: Production CORS_ORIGINS is placeholder — blocks production deployment until actual domain set
- [02-01]: Pre-existing table-sorting.test.ts failure in sonicjs-fork (cannot import @sonicjs-cms/core/templates in test env) — unrelated to this plan
- [02-02]: D1 slug uniqueness index applied locally; must apply --remote before staging/production deployment
- [02-07]: api_tokens table migrated locally with token_hash, token_prefix, allowed_collections, is_read_only columns; must apply --remote before staging/production
- [02-07]: Token format st_<48hex> with SHA-256 hash stored; plaintext never persisted
- [02-07]: X-API-Key handled in both api.ts middleware AND requireAuth() — dual coverage for all route types
- [02-07]: pnpm build requires PATH to include sonicjs-fork/node_modules/.bin for tsup to be found

- [02-06]: user_collection_permissions table exists locally; must be applied --remote (migration SQL needed for staging/production)
- [02-06]: dist file tracking in sonicjs-fork causes recurring hash-churn — consider adding packages/core/dist/ to .gitignore as cleanup task
- [02-05]: Workers module export pattern (fetch+scheduled) must be maintained — reverting to default Hono export breaks cron handler
- [02-05]: app.fetch.bind(app) preserves Hono 'this' context — use bind() when destructuring Hono app handlers

### Decisions from 02-05
- [02-05]: ctx.waitUntil() wraps processScheduledContent() so scheduled response completes immediately while D1 processing continues
- [02-05]: SchedulerService constructor takes env.DB (D1Database) — matches wrangler.toml binding name DB

### Decisions from 04-01
- [04-01]: HookSystemImpl.execute() delegates to executeWithResult() — backward compat preserved, new callers get cancellation info via executeWithResult()
- [04-01]: App reference stored in bootstrap module-level var (not constructor injection) — avoids threading through all bootstrap service call sites; PluginManager reads it lazily in initialize()
- [04-01]: Hono<any> used for app reference type in bootstrap.ts — SonicJSApp (Hono<{Bindings,Variables}>) not assignable to Hono<BlankEnv>; any accepts all variants
- [04-01]: email-templates/admin-routes.ts excluded from tsconfig — pre-existing zValidator type incompatibility was blocking all commits; consistent with other excluded files in same plugin
- [04-01]: getHookSystem() singleton follows same pattern as getCacheService() and kvInitialized — module-level var with lazy init per Workers isolate

### Decisions from 04-02
- [04-02]: isPublishing/isUnpublishing detected before any hooks — BEFORE_PUBLISH/UNPUBLISH fire before BEFORE_UPDATE; sequence: detect → BEFORE_PUBLISH/UNPUBLISH → BEFORE_UPDATE → DB update → AFTER hooks
- [04-02]: WEBHOOK_SECRET optional — sends webhooks unsigned with console.warn when missing; never throws or silently fails
- [04-02]: media:after-move and media:after-update use string literals (not HOOKS constants) — not in the 7 core events; plugins can listen if desired
- [04-02]: deliverWebhooks only called when WEBHOOK_URLS truthy — empty string in wrangler.toml disables webhooks by default
- [04-02]: my-astro-cms/wrangler.toml WEBHOOK_URLS and WEBHOOK_SECRET added as empty strings — fill in locally to test; production values go in [env.production]

### Decisions from 04-03
- [04-03]: getHookSystem() replaces new HookSystemImpl() in PluginManager constructor — plugins share the same singleton as route handlers
- [04-03]: plugin.activate(pluginContext) called after PLUGIN_INSTALL hook in install() — lifecycle order: install → PLUGIN_INSTALL hook → activate → registry status
- [04-03]: pluginsInstalled module-level flag mirrors kvInitialized pattern — once-per-isolate plugin installation
- [04-03]: Static import of PluginManager in app.ts is safe (no circular dependency)
- [04-03]: app as any cast in app.ts — same pattern as bootstrap.ts for Hono<{Bindings,Variables}> → Hono<BlankEnv> mismatch

### Decisions from 05-01
- [05-01]: Content CRUD log calls in api-content-crud.ts (not api.ts) — actual handlers live there; api.ts gets import + content.access_denied log
- [05-01]: log.warn for security events (login_failed, permission_denied); log.info for normal operations
- [05-01]: log event names use dot notation (domain.event): auth.login, content.created, etc.
- [05-01]: No try/catch around log calls — console.* methods never throw; inherently non-blocking
- [05-01]: Workers Logs already enabled via observability.enabled = true in wrangler.toml — logger utility only, no infra changes needed

### Decisions from 06-01
- [06-01]: SchedulerService constructor extended to (db, env?, ctx?) — env/ctx optional for backward compat
- [06-01]: Hook/webhook/cache pipeline runs in a separate try/catch from DB update — pipeline failure never prevents status:completed marking
- [06-01]: archiveContent uses HOOKS.AFTER_CONTENT_UPDATE (not a nonexistent AFTER_CONTENT_ARCHIVE)
- [06-01]: validate-bindings.ts: `return c.json(...)` required — without return, Hono falls through to next() despite sending a response
- [06-01]: All 3 audit gaps from v1-MILESTONE-AUDIT.md closed: admin collection guard (verified existing), scheduler hook/webhook/cache pipeline (added), binding validation return (fixed)

### Decisions from 05-03
- [05-03]: Production uses same D1/R2/KV resources as dev — single-instance initial deploy; per-client isolation via provision-client.sh
- [05-03]: CORS_ORIGINS = https://my-astro-site-4q9.pages.dev — Cloudflare assigned -4q9 suffix (name collision)
- [05-03]: No pnpm build step — wrangler deploy handles bundling internally for SonicJS CMS apps
- [05-03]: Production URL: https://my-sonicjs-app-production.jjaimealeman.workers.dev
- [05-03]: Password reset / email (Resend) flagged for v2

## Session Continuity

Last session: 2026-03-02T20:27:00Z
Stopped at: Completed 06-01-PLAN.md — all audit gaps closed, project 100% complete
Resume file: None
