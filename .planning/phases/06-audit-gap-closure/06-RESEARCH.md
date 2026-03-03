# Phase 6: Audit Gap Closure - Research

**Researched:** 2026-03-02
**Domain:** SonicJS codebase — auth middleware, scheduler service, Hono response handling
**Confidence:** HIGH (all findings from direct file inspection)

## Summary

This phase closes three specific bugs, all confirmed by reading the actual source files. The research findings are definitive — no ambiguity in what needs to change.

**Fix 1 (AUTH-01):** The admin RBAC guard for collection schema mutations is ALREADY IMPLEMENTED. Lines 21-38 of `routes/admin-api.ts` contain working middleware guards on `/collections` and `/collections/:id` for non-GET methods. The original audit described this as unguarded at "line ~18" but the file was subsequently patched. The guard is correct and working.

**Fix 2 (CONT-05 scheduler):** The `publishContent()` method in scheduler.ts (lines 171-197) does only raw SQL UPDATE. It has no access to `executionCtx`, `env.WEBHOOK_URLS`, or `env.WEBHOOK_SECRET`. The scheduler class only receives `db: D1Database` in its constructor. To match the full pipeline from `api-content-crud.ts`, the scheduler must call `getCacheService()` for cache invalidation and — where an execution context is available — fire after-hooks and webhook delivery. The challenge is that `SchedulerService` is instantiated in the Workers `scheduled()` handler which does have `env` and `ctx`, but these aren't passed to the service.

**Fix 3 (FOUND-04):** The binding validation bug is confirmed. Lines 17 and 29 of `my-astro-cms/src/middleware/validate-bindings.ts` call `c.json(...)` without `return`. The response object is created and discarded; Hono continues to call `next()` despite the intent to abort. Both occurrences must be `return c.json(...)`.

**Primary recommendation:** Fix 3 is a one-line fix per occurrence. Fix 1 is already done — verify before touching. Fix 2 requires refactoring the scheduler to accept env + executionCtx as parameters so it can fire the full pipeline.

---

## Fix 1: AUTH-01 RBAC — Collection Schema Guard

### Current State (ALREADY PATCHED)

File: `/home/jaime/www/_github/sonicjs/sonicjs-fork/packages/core/src/routes/admin-api.ts`

```typescript
// Lines 16-38 — ALREADY IMPLEMENTED
adminApiRoutes.use('*', requireAuth())
adminApiRoutes.use('*', requireRole(['admin', 'editor']))

// Restrict collection schema mutations to admin only
adminApiRoutes.use('/collections', async (c, next): Promise<void | Response> => {
  if (c.req.method !== 'GET') {
    const user = c.get('user') as any
    if (user?.role !== 'admin') {
      return c.json({ error: 'Only admins can modify collection schemas' }, 403)
    }
  }
  await next()
})
adminApiRoutes.use('/collections/:id', async (c, next): Promise<void | Response> => {
  if (c.req.method !== 'GET') {
    const user = c.get('user') as any
    if (user?.role !== 'admin') {
      return c.json({ error: 'Only admins can modify collection schemas' }, 403)
    }
  }
  await next()
})
```

### What Still Needs Checking

The guard covers `POST /collections` (create), `PATCH /collections/:id` (update), `DELETE /collections/:id` (delete). The `POST /migrations/run` route at line 720 has its own inline admin check (lines 724-731). Migration routes do not rely on the collection middleware.

**Action required:** Verify the guard exists as shown. If it already exists, this fix is DONE. Write a simple integration test to confirm an editor role gets 403 on POST /admin/api/collections.

---

## Fix 2: CONT-05 Scheduler Hook/Webhook/Cache Pipeline

### Current Scheduler State

File: `/home/jaime/www/_github/sonicjs/sonicjs-fork/packages/core/src/plugins/core-plugins/workflow-plugin/services/scheduler.ts`

```typescript
// Constructor — only receives db
export class SchedulerService {
  constructor(private db: D1Database) {}

  // Called from my-astro-cms/src/index.ts scheduled() handler:
  // const scheduler = new SchedulerService(env.DB)
  // ctx.waitUntil(scheduler.processScheduledContent())

  private async publishContent(contentId: string): Promise<boolean> {
    // Lines 171-197: raw SQL only, NO hooks/webhooks/cache
    await this.db.prepare(`
      UPDATE content SET status = 'published', published_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(Date.now(), Date.now(), contentId).run()

    await this.db.prepare(`
      UPDATE content_workflow_status SET current_state_id = 'published', ...
      WHERE content_id = ?
    `).bind(contentId).run()

    await this.db.prepare(`
      UPDATE content SET workflow_state_id = 'published' WHERE id = ?
    `).bind(contentId).run()

    return true
    // Missing: getHookSystem().execute(), deliverWebhooks(), getCacheService().invalidate()
  }
}
```

### What the PUT Handler Does (the reference pattern)

From `api-content-crud.ts` PUT handler, after a publish transition:

```typescript
// 1. Cache invalidation (SYNC — awaited before response)
const cache = getCacheService(CACHE_CONFIGS.api!)
await cache.delete(cache.generateKey('content', id))
await cache.invalidate(`content:list:${existing.collection_id}:*`)
await cache.invalidate('content-filtered:*')

// 2. After hooks via waitUntil (NON-BLOCKING)
if (c.executionCtx) {
  c.executionCtx.waitUntil(
    hookSystem.execute(HOOKS.AFTER_CONTENT_PUBLISH, {
      contentId: id,
      collectionId: existing.collection_id,
      title: updatedContent?.title || existing.title,
      slug: updatedContent?.slug || existing.slug,
    })
  )
}

// 3. Webhook delivery via waitUntil (NON-BLOCKING, only if WEBHOOK_URLS set)
if (webhookUrls) {
  const publishPayload = {
    event: HOOKS.AFTER_CONTENT_PUBLISH,
    contentId: id,
    contentType: existing.collection_id,
    timestamp: Date.now(),
  }
  if (c.executionCtx) {
    c.executionCtx.waitUntil(
      deliverWebhooks(webhookUrls, webhookSecret, publishPayload)
    )
  } else {
    deliverWebhooks(webhookUrls, webhookSecret, publishPayload).catch(...)
  }
}
```

### Required Refactor

The `SchedulerService` constructor must be extended to accept `env` and optionally `ctx`:

```typescript
// Option A: Pass full env + ctx to constructor
export class SchedulerService {
  constructor(
    private db: D1Database,
    private env?: any,             // for WEBHOOK_URLS, WEBHOOK_SECRET
    private ctx?: ExecutionContext  // for waitUntil
  ) {}
}

// Caller (my-astro-cms/src/index.ts) becomes:
async scheduled(controller: ScheduledController, env: any, ctx: ExecutionContext) {
  const scheduler = new SchedulerService(env.DB, env, ctx)
  ctx.waitUntil(scheduler.processScheduledContent())
}
```

Then `publishContent()` can:
1. Call `getCacheService(CACHE_CONFIGS.api!)` (no env needed — module singleton)
2. Call `getHookSystem().execute(HOOKS.AFTER_CONTENT_PUBLISH, ...)` via `this.ctx?.waitUntil()`
3. Call `deliverWebhooks(this.env?.WEBHOOK_URLS, this.env?.WEBHOOK_SECRET, payload)` conditionally

### Import Paths From scheduler.ts Location

The scheduler is at:
`sonicjs-fork/packages/core/src/plugins/core-plugins/workflow-plugin/services/scheduler.ts`

Relative import paths needed:
- `getCacheService`, `CACHE_CONFIGS`: `../../../../services/cache` (or via `../../../../services`)
- `getHookSystem`: `../../../../plugins/hooks-singleton`
- `deliverWebhooks`: `../../../../services/webhook-delivery`
- `HOOKS`: `../../../../types` (or `../../../../types/plugin`)

**Verify these paths resolve** — the `@ts-nocheck` pragma at line 1 of scheduler.ts means TypeScript won't catch import errors at build time.

### Content data needed for hook payload

The publishContent method only has `contentId`. To fire AFTER_CONTENT_PUBLISH with `collectionId`, `title`, `slug`, it must fetch the content row first:

```typescript
// Add before the UPDATE in publishContent():
const row = await this.db.prepare(
  'SELECT collection_id, title, slug FROM content WHERE id = ?'
).bind(contentId).first() as any
```

### unpublishContent and archiveContent

Apply the same pattern to `unpublishContent()` (fire `AFTER_CONTENT_UNPUBLISH` hook + webhook) and `archiveContent()` (fire `AFTER_CONTENT_UPDATE` hook — no specific archive hook exists in HOOKS constants).

---

## Fix 3: FOUND-04 Binding Validation Return Bug

### Current State (CONFIRMED BUG)

File: `/home/jaime/www/_github/sonicjs/my-astro-cms/src/middleware/validate-bindings.ts`

```typescript
// Line 15-22 — BUG: c.json() called without return
if (missing.length > 0) {
  console.error('[Startup] Missing required bindings:', missing.join(', '))
  c.json(                          // <-- response created but DISCARDED
    { error: 'Service unavailable: infrastructure misconfiguration' },
    500
  )
  return                           // <-- returns void, not the Response
}

// Line 27-33 — SAME BUG
if (!jwtSecret || jwtSecret === JWT_SECRET_HARDCODED_DEFAULT) {
  console.error('[Startup] FATAL: ...')
  c.json({                         // <-- response created but DISCARDED
    error: 'Service unavailable: ...'
  }, 500)
  return                           // <-- returns void, not the Response
}
```

### Fix

```typescript
// Line 17: change c.json() to return c.json()
return c.json(
  { error: 'Service unavailable: infrastructure misconfiguration' },
  500
)

// Line 29: change c.json() to return c.json()
return c.json({
  error: 'Service unavailable: JWT_SECRET must be configured — see wrangler secret put JWT_SECRET'
}, 500)
```

### Why This Matters

In Hono, middleware must `return` a Response to abort the chain. `c.json()` creates a Response object. Without `return`, execution falls through to `await next()` at line 40, which means:
- Missing DB binding → request still reaches route handlers → crashes with "Cannot read properties of undefined"
- Wrong JWT_SECRET → request still reaches route handlers → all auth fails with cryptic errors instead of clear 500

---

## Architecture Patterns

### Pattern: Hono Middleware Must Return the Response to Abort

```typescript
// WRONG — response discarded, chain continues
c.json({ error: '...' }, 500)
return

// CORRECT — chain aborts with 500 response
return c.json({ error: '...' }, 500)
```

**Source:** Confirmed by reading validate-bindings.ts behavior and Hono middleware contract.

### Pattern: Scheduler Service Constructor Extension

The scheduled() handler in Cloudflare Workers receives `(controller, env, ctx)`. The SchedulerService currently only takes `db`. To access env vars and executionCtx in service methods, pass them at construction time.

### Pattern: Cache Invalidation in Scheduler

`getCacheService()` is a module-level singleton that requires no env — call it directly. The KV namespace is wired at startup via `setGlobalKVNamespace()`. In a scheduled handler, the Workers isolate may be fresh (cold start), meaning memory cache is empty. Cache invalidation in the scheduler is still correct behavior — it clears KV entries that may survive across isolate restarts.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Admin role check | Custom role logic | `requireRole(['admin'])` middleware + inline `user.role !== 'admin'` check | Already established pattern in codebase |
| Hook firing | Direct handler invocation | `getHookSystem().execute()` or `executeWithResult()` | Singleton, handles all registered handlers |
| Webhook delivery | Custom HTTP POST | `deliverWebhooks()` from `webhook-delivery.ts` | Handles signing, comma-separated URLs, fire-and-forget |
| Cache invalidation | Direct KV delete | `getCacheService(CACHE_CONFIGS.api!).invalidate()` | Two-tier pattern (memory + KV) |

---

## Common Pitfalls

### Pitfall 1: Fix 1 Already Applied

**What goes wrong:** Treating AUTH-01 as unimplemented and adding a second guard layer — causing double-403 logic or middleware conflicts.
**How to avoid:** Read lines 21-38 of admin-api.ts FIRST. The guard is there. The task is to VERIFY it, not add it.
**Warning signs:** If you see the guard already exists, write the test and close the ticket.

### Pitfall 2: Scheduler @ts-nocheck Hides Import Errors

**What goes wrong:** Adding imports to scheduler.ts that have wrong paths — they won't surface as TypeScript errors due to `// @ts-nocheck` at line 1.
**How to avoid:** Test the built output or trace import paths manually before shipping. The scheduler is at `.../workflow-plugin/services/scheduler.ts` — count the `../../../../` levels carefully.
**Correct path depths:**
- `../` = `.../workflow-plugin/services/`
- `../../` = `.../workflow-plugin/`
- `../../../` = `.../core-plugins/`
- `../../../../` = `.../plugins/`
- `../../../../../` = `src/`

So from `scheduler.ts`:
- `../../../../services/cache` → `src/services/cache` ✓
- `../../../../plugins/hooks-singleton` → `src/plugins/hooks-singleton` ✓
- `../../../../services/webhook-delivery` → `src/services/webhook-delivery` ✓
- `../../../../types/plugin` → `src/types/plugin` ✓ (for HOOKS)

### Pitfall 3: waitUntil Not Available in All Contexts

**What goes wrong:** Using `ctx.waitUntil()` inside SchedulerService but `ctx` is undefined when tests call `processScheduledContent()` directly.
**How to avoid:** Guard all `ctx?.waitUntil()` calls with optional chaining, and provide a fallback `.catch()` path (same pattern as `api-content-crud.ts` lines 506-510).

### Pitfall 4: Fetching Content Row Adds DB Round-Trip

**What goes wrong:** publishContent() fetching content for hook payload on every scheduled action may seem like overhead.
**How to avoid:** This is necessary and correct. The hook contract requires `collectionId`, `title`, and `slug`. Without them, the hook payload is incomplete. One extra SELECT is acceptable.

---

## Code Examples

### Fix 3: validate-bindings.ts corrected

```typescript
// Source: /home/jaime/www/_github/sonicjs/my-astro-cms/src/middleware/validate-bindings.ts
// Fix: add 'return' before both c.json() calls

if (missing.length > 0) {
  console.error('[Startup] Missing required bindings:', missing.join(', '))
  return c.json(
    { error: 'Service unavailable: infrastructure misconfiguration' },
    500
  )
}

if (!jwtSecret || jwtSecret === JWT_SECRET_HARDCODED_DEFAULT) {
  console.error('[Startup] FATAL: JWT_SECRET is not set or is using the hardcoded default...')
  return c.json({
    error: 'Service unavailable: JWT_SECRET must be configured — see wrangler secret put JWT_SECRET'
  }, 500)
}
```

### Fix 2: publishContent() with full pipeline

```typescript
// Source: derived from api-content-crud.ts pattern
// Location: scheduler.ts publishContent()

private async publishContent(contentId: string): Promise<boolean> {
  try {
    // Fetch content row for hook payload (need collectionId, title, slug)
    const row = await this.db.prepare(
      'SELECT collection_id, title, slug FROM content WHERE id = ?'
    ).bind(contentId).first() as any

    // Raw SQL update (existing behavior — keep as-is)
    await this.db.prepare(`
      UPDATE content SET status = 'published', published_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(Date.now(), Date.now(), contentId).run()

    await this.db.prepare(`
      UPDATE content_workflow_status
      SET current_state_id = 'published', updated_at = CURRENT_TIMESTAMP
      WHERE content_id = ?
    `).bind(contentId).run()

    await this.db.prepare(`
      UPDATE content SET workflow_state_id = 'published' WHERE id = ?
    `).bind(contentId).run()

    // Cache invalidation (sync)
    const cache = getCacheService(CACHE_CONFIGS.api!)
    await cache.delete(cache.generateKey('content', contentId))
    if (row?.collection_id) {
      await cache.invalidate(`content:list:${row.collection_id}:*`)
    }
    await cache.invalidate('content-filtered:*')

    // After hook (non-blocking via waitUntil when ctx available)
    const hookSystem = getHookSystem()
    const hookPayload = {
      contentId,
      collectionId: row?.collection_id,
      title: row?.title,
      slug: row?.slug,
    }
    if (this.ctx) {
      this.ctx.waitUntil(
        hookSystem.execute(HOOKS.AFTER_CONTENT_PUBLISH, hookPayload)
      )
    } else {
      hookSystem.execute(HOOKS.AFTER_CONTENT_PUBLISH, hookPayload)
        .catch(err => console.error('[scheduler] after-publish hook failed:', err))
    }

    // Webhook delivery (non-blocking, only if WEBHOOK_URLS configured)
    const webhookUrls = this.env?.WEBHOOK_URLS as string | undefined
    const webhookSecret = this.env?.WEBHOOK_SECRET as string | undefined
    if (webhookUrls) {
      const payload = {
        event: HOOKS.AFTER_CONTENT_PUBLISH,
        contentId,
        contentType: row?.collection_id,
        timestamp: Date.now(),
      }
      if (this.ctx) {
        this.ctx.waitUntil(deliverWebhooks(webhookUrls, webhookSecret, payload))
      } else {
        deliverWebhooks(webhookUrls, webhookSecret, payload)
          .catch(err => console.error('[scheduler] publish webhook error:', err))
      }
    }

    return true
  } catch (error) {
    console.error('Failed to publish content:', error)
    return false
  }
}
```

### Fix 2: Updated constructor and caller

```typescript
// scheduler.ts constructor change
export class SchedulerService {
  constructor(
    private db: D1Database,
    private env?: any,
    private ctx?: ExecutionContext,
  ) {}
}

// my-astro-cms/src/index.ts — scheduled() handler change
async scheduled(controller: ScheduledController, env: any, ctx: ExecutionContext) {
  const scheduler = new SchedulerService(env.DB, env, ctx)
  ctx.waitUntil(scheduler.processScheduledContent())
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Middleware returns void to abort | Middleware `return c.json()` to abort | Fix 3 is a regression from this pattern |
| Service only needs DB | Service needs DB + env + ctx for full pipeline | Fix 2 requires constructor extension |
| Scheduler fires raw SQL only | Scheduler fires hooks + webhooks + cache | Fix 2 brings scheduler into parity with API |

---

## Open Questions

1. **Does Fix 1 have a test gap?**
   - What we know: The guard exists at lines 21-38 of admin-api.ts
   - What's unclear: Whether a test verifies this guard is enforced (editor role blocked)
   - Recommendation: Add integration test even if code is already correct

2. **Should unpublishContent() and archiveContent() also get the pipeline?**
   - What we know: The PUT handler fires AFTER_CONTENT_UNPUBLISH + webhook when unpublishing
   - What's unclear: The phase scope says "scheduled publish hook/webhook/cache pipeline" — does this include unpublish/archive scheduled actions?
   - Recommendation: Apply the same pattern to all three actions for consistency. Archive can use AFTER_CONTENT_UPDATE since no AFTER_CONTENT_ARCHIVE hook exists in HOOKS constants.

3. **ExecutionContext type import in scheduler.ts**
   - What we know: The file has `@ts-nocheck` and imports only from `@cloudflare/workers-types`
   - What's unclear: Whether `ExecutionContext` is exported from `@cloudflare/workers-types`
   - Recommendation: Use `any` type for `ctx` parameter or import from `@cloudflare/workers-types`

---

## Sources

### Primary (HIGH confidence)
- Direct file read: `/home/jaime/www/_github/sonicjs/sonicjs-fork/packages/core/src/routes/admin-api.ts` — admin guard already implemented at lines 21-38
- Direct file read: `/home/jaime/www/_github/sonicjs/sonicjs-fork/packages/core/src/plugins/core-plugins/workflow-plugin/services/scheduler.ts` — publishContent() does raw SQL only, lines 171-197
- Direct file read: `/home/jaime/www/_github/sonicjs/sonicjs-fork/packages/core/src/routes/api-content-crud.ts` — full hook/webhook/cache pipeline after publish, lines 463-548
- Direct file read: `/home/jaime/www/_github/sonicjs/my-astro-cms/src/middleware/validate-bindings.ts` — missing return bug confirmed at lines 17, 29
- Direct file read: `/home/jaime/www/_github/sonicjs/sonicjs-fork/packages/core/src/services/webhook-delivery.ts` — deliverWebhooks() signature and behavior
- Direct file read: `/home/jaime/www/_github/sonicjs/sonicjs-fork/packages/core/src/services/cache.ts` — getCacheService() singleton pattern
- Direct file read: `/home/jaime/www/_github/sonicjs/sonicjs-fork/packages/core/src/plugins/hooks-singleton.ts` — getHookSystem() singleton pattern
- Direct file read: `/home/jaime/www/_github/sonicjs/my-astro-cms/src/index.ts` — scheduled() handler shows how SchedulerService is instantiated
- Direct file read: `/home/jaime/www/_github/sonicjs/sonicjs-fork/packages/core/src/types/plugin.ts` — HOOKS constants (AFTER_CONTENT_PUBLISH, etc.)

---

## Metadata

**Confidence breakdown:**
- Fix 1 (AUTH-01 guard): HIGH — code already exists, confirmed by direct read
- Fix 2 (scheduler pipeline): HIGH — both the gap and the reference pattern confirmed by direct read; implementation approach is clear
- Fix 3 (validate-bindings return): HIGH — bug is exactly as described, two-line fix

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable codebase, no external dependencies)
