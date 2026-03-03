---
phase: 04-hook-system-integration
plan: 02
subsystem: api
tags: [hooks, webhooks, hmac, cloudflare-workers, hono, lifecycle-events]

# Dependency graph
requires:
  - phase: 04-01
    provides: HOOKS constants, HookExecutionResult, getHookSystem singleton, executeWithResult method
  - phase: 03-media-pipeline-caching
    provides: api-media.ts route handlers with emitEvent stubs to replace
  - phase: 02-content-workflow
    provides: api-content-crud.ts CRUD route handlers to wire hooks into
provides:
  - Hook calls wired into all content CRUD route handlers (create, update, delete, publish, unpublish)
  - Blocking before-hooks via executeWithResult() with 403 cancellation
  - Non-blocking after-hooks via c.executionCtx.waitUntil()
  - Outgoing webhook delivery service with HMAC-SHA256 signing
  - Publish/unpublish triggers fire outgoing webhooks to WEBHOOK_URLS
  - All 6 emitEvent stubs replaced with real hookSystem calls in api-media.ts
  - WEBHOOK_URLS and WEBHOOK_SECRET env var placeholders in wrangler.toml
affects:
  - phase-05-astro-frontend (receives webhooks on publish/unpublish for cache invalidation)
  - any-plugin (can now intercept content lifecycle via hookSystem.register())

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "executeWithResult() for synchronous blocking hooks — check result.cancelled, return 403"
    - "waitUntil() for non-blocking after hooks — guard with if (c.executionCtx)"
    - "Fire-and-forget webhook delivery via waitUntil — no retries, console.log/error tracking"
    - "Optional HMAC-SHA256: sign when WEBHOOK_SECRET set, send unsigned with console.warn when absent"
    - "All hook calls in try/catch — hook failures NEVER break route handlers"
    - "(c.env as any).WEBHOOK_URLS — same any-cast pattern as JWT_SECRET for untyped env vars"

key-files:
  created:
    - sonicjs-fork/packages/core/src/services/webhook-delivery.ts
  modified:
    - sonicjs-fork/packages/core/src/routes/api-content-crud.ts
    - sonicjs-fork/packages/core/src/routes/api-media.ts
    - sonicjs-fork/packages/core/src/services/index.ts
    - my-astro-cms/wrangler.toml

key-decisions:
  - "isPublishing/isUnpublishing detected before any hooks — transition type gates both before AND after hooks"
  - "Hook call sequence in PUT handler: detect transitions → BEFORE_PUBLISH/UNPUBLISH → BEFORE_UPDATE → DB update → AFTER hooks"
  - "WEBHOOK_SECRET optional by design — sends unsigned with console.warn if missing (not a crash)"
  - "media:after-move and media:after-update use string literals (not HOOKS constants) — they are not in the 7 core events"
  - "deliverWebhooks called only when WEBHOOK_URLS is truthy — empty string from wrangler.toml disables webhooks"

patterns-established:
  - "Before hooks: synchronous, use executeWithResult(), return 403 if result.cancelled"
  - "After hooks: async via waitUntil(), always guard with if (c.executionCtx), wrapped in try/catch"
  - "Webhook delivery: deliverWebhooks(WEBHOOK_URLS, WEBHOOK_SECRET, payload) pattern in PUT handler"

# Metrics
duration: 9min
completed: 2026-03-02
---

# Phase 4 Plan 02: Hook Integration and Webhook Delivery Summary

**Content lifecycle hooks wired into all CRUD routes with blocking before-hooks, non-blocking after-hooks via waitUntil, and HMAC-SHA256 signed outgoing webhooks on publish/unpublish**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-02T16:09:23Z
- **Completed:** 2026-03-02T16:18:55Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Content CRUD routes (create, update, delete) now call hookSystem lifecycle events — before hooks block with cancellation, after hooks fire non-blocking via waitUntil
- Publish/unpublish transitions fire BEFORE_CONTENT_PUBLISH/UNPUBLISH (blocking) and trigger outgoing HTTP POST webhooks when WEBHOOK_URLS is configured
- All 6 emitEvent stubs removed from api-media.ts, replaced with real hookSystem.execute() calls via waitUntil
- Webhook delivery service (webhook-delivery.ts) supports optional HMAC-SHA256 signing — gracefully degrades to unsigned with console.warn when WEBHOOK_SECRET is absent

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire hooks into content CRUD routes and create webhook delivery service** - `1b088ef3` (feat)
2. **Task 2: Replace emitEvent stubs in media routes and add env var config** - `2c7b2143` (feat) + `1895b5c` (chore, my-astro-cms repo)

## Files Created/Modified

- `sonicjs-fork/packages/core/src/services/webhook-delivery.ts` - New: fire-and-forget webhook delivery with optional HMAC-SHA256 signing via crypto.subtle
- `sonicjs-fork/packages/core/src/routes/api-content-crud.ts` - Wired BEFORE/AFTER hooks for create, update, delete, publish, unpublish events; webhook delivery on publish/unpublish
- `sonicjs-fork/packages/core/src/routes/api-media.ts` - Removed emitEvent stub; replaced all 6 calls with hookSystem.execute() via waitUntil
- `sonicjs-fork/packages/core/src/services/index.ts` - Added deliverWebhooks and WebhookPayload exports
- `my-astro-cms/wrangler.toml` - Added WEBHOOK_URLS and WEBHOOK_SECRET empty placeholders in [vars]

## Decisions Made

- **isPublishing/isUnpublishing detected first** — transition type detected before any hook calls. This ensures BEFORE_PUBLISH/UNPUBLISH fire even if BEFORE_UPDATE would cancel. The sequence is: detect → BEFORE_PUBLISH (if publishing) → BEFORE_UNPUBLISH (if unpublishing) → BEFORE_UPDATE → DB update → AFTER hooks.
- **WEBHOOK_SECRET optional** — sends webhooks unsigned with console.warn if secret is missing. This allows local dev testing without needing a secret configured. Never throws or silently fails.
- **media:after-move and media:after-update use string literals** — these events are not in the 7 named HOOKS constants from Plan 01. They use `'media:after-move'` and `'media:after-update'` string literals directly. Plugins can listen if they want.
- **deliverWebhooks only called when WEBHOOK_URLS truthy** — empty string in wrangler.toml evaluates as falsy, effectively disabling webhooks by default without code changes needed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- TypeScript errors in api-media.ts (ReadableStream type mismatch with Cloudflare workers-types) are pre-existing in the original file. Confirmed by stash-and-check: errors existed on lines 93 and 260 in the original file, corresponding to lines 89 and 268 in our updated file. No new errors introduced.

## User Setup Required

None - no external service configuration required. WEBHOOK_URLS and WEBHOOK_SECRET are in wrangler.toml as empty strings; fill them in to enable webhook delivery.

## Next Phase Readiness

- Phase 4 complete: all 3 success criteria met
  - SC#1: Route handlers call hookSystem.execute()/executeWithResult() — plugins can listen to content lifecycle
  - SC#2: Publish/unpublish triggers outgoing HTTP POST webhooks with HMAC-SHA256 when WEBHOOK_SECRET is set
  - SC#3: Plugin middleware registration via PluginContext.app (from Plan 01)
- Astro frontend (Phase 5) can now receive webhook notifications on publish/unpublish — configure WEBHOOK_URLS to point to an Astro API endpoint for cache invalidation
- Any plugin can register hooks via hookSystem.register(HOOKS.BEFORE_CONTENT_PUBLISH, handler) to intercept and cancel publish operations

---
*Phase: 04-hook-system-integration*
*Completed: 2026-03-02*
