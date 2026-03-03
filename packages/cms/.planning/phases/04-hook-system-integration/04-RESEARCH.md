# Phase 04: Hook System + Integration - Research

**Researched:** 2026-03-02
**Domain:** SonicJS plugin/hook system wiring, Cloudflare Workers async patterns, HMAC-SHA256 signing
**Confidence:** HIGH (codebase investigation primary; external research for HMAC patterns)

---

## Summary

Phase 4 wires the existing but dormant hook system infrastructure into the live route handlers, then builds an outgoing webhook service on top of it. The codebase already contains a complete, functional `HookSystemImpl` class — it is NOT a stub. What is stubbed/missing is the integration: route handlers use a `emitEvent()` stub in `api-media.ts` and no hook calls at all in `api-content-crud.ts`. The work is primarily integration wiring, not new infrastructure.

The hook system supports before/after lifecycle semantics via its `cancel` mechanism and priority ordering. The Web Crypto API (`crypto.subtle`) is available natively in Cloudflare Workers — no npm packages needed for HMAC-SHA256. `ctx.waitUntil()` is accessed via `c.executionCtx` in Hono, which is already used in `app.ts` for the Cache API (`c.executionCtx.waitUntil(cache.put(...))`). Webhook URLs come from env vars via the `(c.env as any).WEBHOOK_URLS` pattern established for `JWT_SECRET`.

**Primary recommendation:** Wire `HookSystemImpl` as a module-level singleton, import it in route files, replace all `emitEvent()` stubs, add explicit hook calls in `api-content-crud.ts`, and build the webhook delivery service as a pure function using Web Crypto API + `ctx.waitUntil()`.

---

## Standard Stack

### Core (all already in codebase — no new npm installs needed)

| Component | Location | Purpose | Notes |
|-----------|----------|---------|-------|
| `HookSystemImpl` | `packages/core/src/plugins/hook-system.ts` | Event bus with priority + cancel | Fully implemented, not stubbed |
| `ScopedHookSystem` | `packages/core/src/plugins/hook-system.ts` | Per-plugin scoped hook registration | Fully implemented |
| `HookUtils` | `packages/core/src/plugins/hook-system.ts` | `debounce()`, `throttle()`, middleware factory | Ready to use |
| `HOOKS` constants | `packages/core/src/types/plugin.ts` | Standard hook name strings | Has content:create/update/delete/publish, media:upload/delete — note: MISSING `content:unpublish` and before/after variants |
| `PluginBuilder` SDK | `packages/core/src/plugins/sdk/plugin-builder.ts` | Fluent plugin construction | `.addHook()`, `.addMiddleware()`, `.addRoute()`, `.lifecycle()` |
| `crypto.subtle` | Cloudflare Workers global | HMAC-SHA256 signing | No import needed, Web Crypto API built in |

### Supporting

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `c.executionCtx.waitUntil()` | Non-blocking async after response | After-hooks, webhook delivery — follows pattern in `app.ts` line 332 |
| `(c.env as any).WEBHOOK_URLS` | Env var access for non-Bindings keys | Pattern established by `JWT_SECRET` usage in `validate-bindings.ts` |
| `HookUtils.debounce(handler, delay)` | Debounce rapid hook events | Available, but NOT needed given fire-and-forget decision |

### No New Packages Needed

The full implementation requires zero new npm packages. Web Crypto API, `fetch()`, and `ctx.waitUntil()` are Workers globals.

---

## Architecture Patterns

### Hook System as Module-Level Singleton

The `HookSystemImpl` must be instantiated once per Worker isolate (module-level), shared across all route files. This matches the pattern used for `kvInitialized` and the cache service singleton in `app.ts`.

```typescript
// Source: packages/core/src/plugins/hook-system.ts
// Create in: packages/core/src/plugins/index.ts or a new hooks-singleton.ts

import { HookSystemImpl } from './hook-system'
export const hookSystem = new HookSystemImpl()
```

### Before Hooks — Synchronous Blocking Pattern

Before hooks run synchronously and can cancel the operation by calling `context.cancel()`. Route handlers must check if cancelled and return error response.

```typescript
// Source: packages/core/src/plugins/hook-system.ts lines 60-84
// Pattern for before hooks in route handlers:

const result = await hookSystem.execute('content:before-create', {
  collectionId,
  title,
  slug: finalSlug,
  data,
  userId: user?.userId,
})

// Check if a before-hook cancelled the operation
if (result?.__cancelled) {
  return c.json({ error: result.__reason || 'Operation cancelled by plugin' }, 403)
}
```

**Important:** The current `HookSystemImpl.execute()` sets `cancelled = true` internally but does NOT communicate cancellation to the caller — it just returns the last `result`. The cancel mechanism needs augmentation: the hook context's `cancel()` sets a local boolean, but the caller can't detect it. Two options:

1. **Convention:** Before-hooks return `{ __cancelled: true, __reason: string }` payload to signal rejection
2. **Extend HookSystemImpl:** Return `{ data, cancelled, reason }` object from `execute()`

**Recommendation:** Extend `HookSystemImpl.execute()` to return `{ data: any, cancelled: boolean, reason?: string }` — cleaner than payload conventions.

### After Hooks — waitUntil Pattern

After hooks run non-blocking via `c.executionCtx.waitUntil()`. This matches the established Cache API pattern in `app.ts`:

```typescript
// Source: packages/core/src/app.ts line 332 (existing pattern)
c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()))

// Apply same pattern for after-hooks:
if (c.executionCtx) {
  c.executionCtx.waitUntil(
    hookSystem.execute('content:after-create', { id: contentId, title, collectionId })
  )
}
```

### emitEvent() Stubs to Replace

**File: `packages/core/src/routes/api-media.ts`**

The file contains a `emitEvent()` stub at line 12-15 (logs to console, does nothing). Replace all calls:

| Line | Event stub | Replace with |
|------|-----------|--------------|
| 175 | `emitEvent('media.upload', {...})` | `hookSystem.execute('media:after-upload', {...})` via waitUntil |
| 368 | `emitEvent('media.upload', {...})` | same pattern (bulk upload) |
| 463 | `emitEvent('media.delete', {...})` | `hookSystem.execute('media:after-delete', {...})` via waitUntil |
| 642 | `emitEvent('media.move', {...})` | `hookSystem.execute('media:after-move', {...})` via waitUntil (not in spec but should hook) |
| 693 | `emitEvent('media.delete', {...})` | `hookSystem.execute('media:after-delete', {...})` via waitUntil |
| 748 | `emitEvent('media.update', {...})` | `hookSystem.execute('media:after-update', {...})` via waitUntil |

**File: `packages/core/src/routes/api-content-crud.ts`**

No `emitEvent()` calls exist. Hooks need to be added for the 7 event types. Status transitions happen inside the PUT handler — publish and unpublish are both `PUT /api/content/:id` with `body.status` change detection:

| Operation | Where | Before Hook | After Hook |
|-----------|-------|------------|-----------|
| Create | POST line 85 | `content:before-create` (blocking) | `content:after-create` (waitUntil) |
| Update (non-status) | PUT line 194 | `content:before-update` (blocking) | `content:after-update` (waitUntil) |
| Delete | DELETE line 378 | `content:before-delete` (blocking) | `content:after-delete` (waitUntil) |
| Publish (status → published) | PUT line 269 | `content:before-publish` (blocking) | `content:after-publish` (waitUntil) + webhook |
| Unpublish (published → draft) | PUT line 275 | `content:before-unpublish` (blocking) | `content:after-unpublish` (waitUntil) + webhook |

### Webhook Service Pattern

Fire-and-forget via `ctx.waitUntil()`. The existing `WebhookService` in workflow-plugin has D1 persistence and retries — Phase 4 is simpler (env vars, no DB, fire-and-forget, log only).

```typescript
// Source: packages/core/src/plugins/core-plugins/workflow-plugin/services/webhooks.ts
// Pattern reference for HMAC-SHA256 (lines 293-311):

async function createSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(payload)
  const key = encoder.encode(secret)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data)
  const hashArray = Array.from(new Uint8Array(signature))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return `sha256=${hashHex}`
}
```

**CRITICAL:** This exact pattern is already in the codebase (`workflow-plugin/services/webhooks.ts` lines 293-311). Copy and adapt, do NOT reinvent.

### Webhook Delivery Function (Phase 4 version)

```typescript
// New file: packages/core/src/services/webhook-delivery.ts

interface WebhookPayload {
  event: string         // 'content:published', 'content:unpublished'
  contentId: string
  collectionId: string
  timestamp: string
}

async function deliverWebhook(
  url: string,
  payload: WebhookPayload,
  secret?: string
): Promise<void> {
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'SonicJS-CMS/1.0',
  }
  if (secret) {
    headers['X-Webhook-Signature'] = await createSignature(body, secret)
  }
  try {
    const response = await fetch(url, { method: 'POST', headers, body })
    console.log(`[webhook] ${payload.event} -> ${url} status=${response.status}`)
  } catch (error) {
    console.error(`[webhook] delivery failed for ${url}:`, error)
  }
}
```

### WEBHOOK_URLS Environment Variable Pattern

```
# wrangler.toml [vars] (non-secret)
WEBHOOK_URLS = "https://pages.cloudflare.com/api/v4/pages/webhooks/deploy_hooks/..."

# Or multiple URLs as comma-separated:
WEBHOOK_URLS = "https://hook1.example.com,https://hook2.example.com"
```

Access pattern (established in codebase):
```typescript
// Source: my-astro-cms/src/middleware/validate-bindings.ts line 26
const webhookUrls = (c.env as any).WEBHOOK_URLS as string | undefined
const urls = webhookUrls?.split(',').map(u => u.trim()).filter(Boolean) ?? []
```

### Plugin Registration Pattern

Based on `PluginBuilder` SDK and existing plugin examples, plugins self-register via the `activate` lifecycle hook receiving `PluginContext` (which includes `hooks`). The `PluginContext.hooks` is a `ScopedHookSystem`.

```typescript
// Source: packages/core/src/plugins/sdk/plugin-builder.ts lines 282-291
// Example plugin registering hooks via activate lifecycle:

const myPlugin = PluginBuilder.create({ name: 'my-plugin', version: '1.0.0' })
  .lifecycle({
    activate: async (context: PluginContext) => {
      context.hooks.register('content:after-publish', async (data, hookCtx) => {
        console.log('Content published:', data)
        return data
      }, 10)
    }
  })
  .build()
```

For Phase 4, the recommendation for plugin registration (Claude's Discretion area): use the `activate` lifecycle with `PluginContext` rather than an `app:init` event, because:
- `PluginContext` already provides scoped hook registration
- No new infrastructure needed
- Consistent with the existing `PluginBuilder.lifecycle()` API

### Plugin Middleware Registration

`PluginContext` does NOT currently include an `app` reference. The `PluginManager.registerPluginExtensions()` stores routes in `pluginRoutes` Map and middleware in the registry, but the main `app.ts` does NOT call `getPluginMiddleware()` after initialization — it only mounts pre-known plugin routes at startup.

For a plugin to add middleware on existing routes, the mechanism needed is:
1. Plugin declares middleware via `PluginBuilder.addSingleMiddleware()`
2. `createSonicJSApp()` calls `pluginManager.getPluginMiddleware()` and applies them after `afterAuth` middleware

**Gap identified:** `createSonicJSApp()` does NOT currently call `getPluginMiddleware()`. The wiring exists in `PluginManager` but is not connected to `app.ts`. Phase 4 must add this.

### Recommended Project Structure for Phase 4 Files

```
packages/core/src/
├── services/
│   └── webhook-delivery.ts    # New: fire-and-forget outgoing webhook service
├── plugins/
│   ├── hook-system.ts         # Modify: extend execute() to return cancel status
│   └── hooks-singleton.ts     # New: module-level HookSystemImpl singleton export
└── routes/
    ├── api-content-crud.ts    # Modify: add hookSystem.execute() calls
    └── api-media.ts           # Modify: replace emitEvent() with hookSystem.execute()
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC-SHA256 signing | Custom crypto impl | `crypto.subtle.importKey + sign` | Already in `workflow-plugin/services/webhooks.ts` lines 293-311 — copy exactly |
| Debounce for rapid publishes | Custom timer logic | `HookUtils.debounce(handler, delay)` | Already implemented in `hook-system.ts` lines 253-272 |
| Hook priority ordering | Custom sort | `HookSystemImpl.register()` with priority arg | Already implemented, lower number = earlier execution |
| Webhook payload construction | Ad-hoc JSON | Follow `WebhookDelivery` shape from `workflow-plugin/services/webhooks.ts` | Has delivery ID, timestamp, event type pattern |
| Plugin manager bootstrap | Manual plugin loading | `PluginManager.install()` + `activate()` lifecycle | Already wired in `plugin-manager.ts` |

---

## Common Pitfalls

### Pitfall 1: Hook Cancellation Not Propagated to Caller

**What goes wrong:** A before-hook calls `context.cancel()`, but `HookSystemImpl.execute()` returns `data` (not a cancelled signal). The route handler proceeds anyway despite the cancel.

**Why it happens:** `cancelled` is a local boolean inside `execute()`. The return value is still `data`.

**How to avoid:** Extend `HookSystemImpl.execute()` to return `{ data, cancelled, reason }` OR establish a payload convention where cancelled before-hooks return `{ __cancelled: true }`. The former is cleaner.

**Warning signs:** Before-hook logs "cancelled" but operation still commits to DB.

### Pitfall 2: waitUntil() Called When executionCtx Is Undefined

**What goes wrong:** In test environments or direct invocations, `c.executionCtx` may be undefined. Calling `c.executionCtx.waitUntil()` throws.

**Why it happens:** Tests using `app.request()` don't always inject ExecutionContext.

**How to avoid:** Guard all `waitUntil` calls:
```typescript
if (c.executionCtx) {
  c.executionCtx.waitUntil(hookSystem.execute('...', data))
}
```
This pattern is already used in `app.ts` line 332.

### Pitfall 3: Hook System Singleton Across Isolates

**What goes wrong:** Module-level singleton state is per-isolate, not per-request. If plugins register hooks in request scope (e.g., inside a route handler), they accumulate across requests in the same isolate.

**Why it happens:** Workers reuse the same module scope within a cold-start window. A `let kvInitialized = false` pattern is used elsewhere to prevent re-initialization.

**How to avoid:** Register hooks only during startup (bootstrap phase or plugin `activate()`), not in request handlers. Never call `hookSystem.register()` inside a route handler.

**Warning signs:** Hook handler count grows over time; same handler fires multiple times per event.

### Pitfall 4: Webhook URL in Bindings vs. `(c.env as any)`

**What goes wrong:** Adding `WEBHOOK_URLS` to the `Bindings` interface causes TypeScript errors when it's absent.

**Why it happens:** `Bindings` interface in `app.ts` lists only required bindings. Optional env vars like `JWT_SECRET` use `(c.env as any).JWT_SECRET` to avoid TS errors.

**How to avoid:** Access `WEBHOOK_URLS` via `(c.env as any).WEBHOOK_URLS` — consistent with `JWT_SECRET` pattern. Do NOT add to `Bindings` interface unless required.

### Pitfall 5: emitEvent() Stub Is Awaited

**What goes wrong:** `emitEvent()` in `api-media.ts` is `async` and currently awaited. When replacing with `hookSystem.execute()` for after-hooks, the team might mistakenly await the hook call blocking the response.

**Why it happens:** The stub was sync-wrapped as async for API compatibility.

**How to avoid:** For after-hooks, wrap in `waitUntil()`. For before-hooks that need to block, await them BEFORE the DB write, then check cancellation.

### Pitfall 6: HOOKS Constants Missing before/after Variants

**What goes wrong:** `HOOKS` in `types/plugin.ts` has `CONTENT_PUBLISH: 'content:publish'` but NOT `content:before-publish` or `content:after-publish`. Plugins must know the exact string.

**Why it happens:** Phase 4 spec requires before/after semantics not reflected in the current `HOOKS` constants.

**How to avoid:** Add new constants to `HOOKS` object for all 7 event types × 2 phases:
```typescript
CONTENT_BEFORE_CREATE: 'content:before-create',
CONTENT_AFTER_CREATE: 'content:after-create',
// ... etc
```

---

## Code Examples

### HMAC-SHA256 Signature (Verified — existing codebase)

```typescript
// Source: packages/core/src/plugins/core-plugins/workflow-plugin/services/webhooks.ts lines 293-311
// This exact implementation is in the codebase already.

private async createSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(payload)
  const key = encoder.encode(secret)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data)
  const hashArray = Array.from(new Uint8Array(signature))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return `sha256=${hashHex}`
}
```

### waitUntil Pattern (Verified — existing codebase)

```typescript
// Source: packages/core/src/app.ts line 332 (established pattern)

// Non-blocking async work after response:
if (c.executionCtx) {
  c.executionCtx.waitUntil(
    hookSystem.execute('content:after-publish', {
      contentId: id,
      collectionId: existing.collection_id,
      title: updatedContent.title,
      timestamp: new Date().toISOString(),
    })
  )
}
```

### HookSystemImpl Registration (Verified — existing codebase)

```typescript
// Source: packages/core/src/plugins/hook-system.ts lines 16-37

// Registration with priority (lower = earlier):
hookSystem.register('content:before-publish', async (data, context) => {
  // Validate or block the operation
  if (someCondition) {
    context.cancel?.()
    return { ...data, __cancelled: true, __reason: 'Validation failed' }
  }
  return data
}, 5)  // priority 5 runs before priority 10 (default)
```

### Plugin using activate() lifecycle for hook registration

```typescript
// Source: packages/core/src/plugins/sdk/plugin-builder.ts lines 282-291
// Pattern for Phase 4 plugin registration recommendation

import { PluginBuilder } from '@sonicjs-cms/core'

export const webhookPlugin = PluginBuilder.create({
  name: 'webhook-notifier',
  version: '1.0.0',
  description: 'Fires outgoing webhooks on content events'
})
  .lifecycle({
    activate: async (context) => {
      context.hooks.register('content:after-publish', async (data) => {
        // Send webhook via delivery service
        return data
      })
    }
  })
  .build()
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `emitEvent()` stub (logs only) | `hookSystem.execute()` (real dispatch) | Plugins actually receive events |
| No before/after distinction | Before (blocking) + after (waitUntil) | Plugins can reject operations |
| Webhook service via D1 (workflow-plugin) | Fire-and-forget via env var + waitUntil | Simpler, per-client deployable, no DB writes |
| Plugin middleware wiring missing | `getPluginMiddleware()` called in `createSonicJSApp()` | Plugins can intercept routes |

---

## Open Questions

1. **HookSystem singleton vs. PluginManager.hooks**
   - What we know: `PluginManager` has its own `HookSystem` instance (`this.hooks = new HookSystemImpl()`). Routes would need a separate singleton OR access through the PluginManager.
   - What's unclear: How routes should import `hookSystem` — module-level singleton, or passed via Hono context variables.
   - Recommendation: Create a module-level singleton in a new `hooks-singleton.ts` file, export it, import in routes. Avoids the PluginManager initialization dependency in routes.

2. **Plugin middleware: app reference vs. middleware array in config**
   - What we know: `SonicJSConfig.middleware.afterAuth` accepts an array. `PluginManager.getPluginMiddleware()` exists but is not called in `createSonicJSApp()`.
   - What's unclear: Whether Phase 4 should wire `getPluginMiddleware()` into `createSonicJSApp()` or leave it for Phase 5.
   - Recommendation: Wire it in Phase 4 since it's declared as a success criterion (plugin can register middleware via PluginContext).

3. **WEBHOOK_URLS: single URL vs. comma-separated**
   - What we know: CONTEXT.md says "treated as another webhook consumer" — general webhook system.
   - Recommendation: Support comma-separated list for multi-consumer flexibility. Parse with `.split(',').map(u => u.trim()).filter(Boolean)`.

---

## Sources

### Primary (HIGH confidence)

- `packages/core/src/plugins/hook-system.ts` — Full HookSystemImpl, ScopedHookSystem, HookUtils implementation
- `packages/core/src/plugins/types.ts` — PluginContext, HookSystem interfaces, HOOKS constants
- `packages/core/src/plugins/plugin-manager.ts` — PluginManager.install(), getPluginMiddleware()
- `packages/core/src/plugins/sdk/plugin-builder.ts` — PluginBuilder fluent API
- `packages/core/src/routes/api-media.ts` — emitEvent() stubs locations (lines 12-15, 175, 368, 463, 642, 693, 748)
- `packages/core/src/routes/api-content-crud.ts` — No existing hook calls; create/update/delete/publish/unpublish operations
- `packages/core/src/app.ts` — SonicJSConfig, createSonicJSApp(), c.executionCtx.waitUntil() pattern (line 332)
- `packages/core/src/plugins/core-plugins/workflow-plugin/services/webhooks.ts` — HMAC-SHA256 signing implementation (lines 293-311)
- `packages/core/src/services/content-state-machine.ts` — Publish/unpublish detection logic
- `my-astro-cms/wrangler.toml` — Env var config patterns
- `my-astro-cms/src/middleware/validate-bindings.ts` — `(c.env as any).JWT_SECRET` pattern

### Secondary (MEDIUM confidence)

- Cloudflare Workers documentation (Web Crypto API available as global `crypto.subtle`) — verified by existing `webhooks.ts` usage in codebase

---

## Metadata

**Confidence breakdown:**

- Hook system internals: HIGH — full source code read, not just types
- emitEvent() stub locations: HIGH — exact line numbers verified by code read
- HMAC-SHA256 pattern: HIGH — verified against existing `webhooks.ts` in codebase
- waitUntil pattern: HIGH — verified in `app.ts` line 332
- Plugin middleware wiring gap: HIGH — confirmed `createSonicJSApp()` does not call `getPluginMiddleware()`
- Before-hook cancel propagation gap: HIGH — confirmed `execute()` returns `data`, not cancellation status
- HOOKS constants missing before/after: HIGH — verified `types/plugin.ts` only has unprefixed event names

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable codebase, 30-day window)
