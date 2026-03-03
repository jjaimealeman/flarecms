# Phase 4: Hook System + Integration - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the existing hook system stubs into real lifecycle event execution, add outgoing webhooks for external consumers (primarily Astro rebuild), and enable plugins to register their own Hono middleware and routes through PluginContext. The content state machine (Phase 2) and media pipeline (Phase 3) provide the events that hooks fire on.

</domain>

<decisions>
## Implementation Decisions

### Webhook delivery
- Webhook URLs configured via **wrangler.toml env vars** (e.g., WEBHOOK_URLS) — simple, per-client deployable
- **Fire and forget** — send once, log result, no retries
- **Console log only** for delivery tracking — Workers logs via `wrangler tail` / dashboard, no D1 persistence
- Include **HMAC-SHA256 signature** in `X-Webhook-Signature` header using a shared secret env var — receiving end can verify authenticity

### Hook event design
- Support **both before and after** lifecycle events (before:create, after:create, etc.)
- **Before hooks can block/reject** operations — return failure to cancel the operation with an error response to the user
- **Before hooks run synchronously** (blocking, since they need to approve/reject); **after hooks run asynchronously** via `waitUntil` (non-blocking)
- **7 event types**: create, update, delete, publish, unpublish, media:upload, media:delete — covers content lifecycle (Phase 2) + media pipeline (Phase 3)

### Plugin middleware
- Plugins can add **both new API routes AND middleware** on existing routes — full extensibility
- Plugin middleware runs **after core security middleware** (auth, CORS, CSRF) — safer default

### Claude's Discretion
- Plugin registration mechanism (config file setup function vs hook-based app:init event)
- Plugin access model (full bindings vs scoped PluginContext)
- Plugin middleware ordering/priority system
- Debouncing strategy for rapid publish events (if any)

### Astro rebuild trigger
- Rebuild via **Cloudflare Pages deploy hook** — POST to CF Pages deploy hook URL
- Only **publish and unpublish** events trigger rebuild — drafts and edits don't fire webhooks to Astro
- Deploy hook URL uses the **same general webhook system** — treated as another webhook consumer, not a special-case env var

</decisions>

<specifics>
## Specific Ideas

- The existing codebase has `emitEvent()` stubs that need to be replaced with real `hookSystem.execute()` calls in route handlers
- Success criteria #3 from roadmap requires plugins to receive the `app` reference through `PluginContext` — this is the integration point for middleware registration
- Workers Queues was flagged in Phase 2 decisions for webhook delivery research, but fire-and-forget with waitUntil is the chosen approach — no queue needed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-hook-system-integration*
*Context gathered: 2026-03-02*
