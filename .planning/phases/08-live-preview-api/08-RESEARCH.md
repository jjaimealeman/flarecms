# Phase 8: Live Preview API - Research

**Researched:** 2026-03-09
**Domain:** Real-time content preview with split-screen editor, iframe rendering, CMS-to-frontend communication
**Confidence:** HIGH

## Summary

This phase implements a live preview system where content editors see real-time preview of draft changes rendered through the actual Astro frontend. The architecture follows the industry-standard pattern used by Payload CMS, Contentstack, and Strapi: a split-screen page with an editor pane on the left and an iframe loading the actual Astro-rendered page on the right, with `window.postMessage` as the communication channel.

The key insight is that both CMS (Cloudflare Workers) and Astro site (Cloudflare Pages) already run on the same Cloudflare edge network. The CMS admin already has an existing (basic) preview system (`POST /admin/content/preview`) that generates raw HTML. This phase replaces that with a proper preview that renders through the actual Astro frontend templates, giving editors a true WYSIWYG experience.

The approach: CMS stores draft data temporarily (in-memory or short-lived KV), provides a preview token, and the Astro site has a preview API endpoint that accepts the token and renders the content through its actual templates. The iframe in the CMS preview page loads this Astro preview URL. Updates flow via `postMessage` from the editor pane to the iframe, which re-fetches/re-renders with updated data.

**Primary recommendation:** Use a dedicated CMS API endpoint (`POST /api/preview/draft`) that accepts form data and returns a short-lived preview token. The Astro site has a preview route (`/preview/[collection]/[slug]`) that accepts the token via query param, fetches draft data from CMS using the token, and renders through the real Astro templates.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `window.postMessage` | Web API | Editor-to-iframe communication | Industry standard for cross-origin iframe communication; used by Payload CMS, Contentstack, Strapi |
| Vanilla JS (no library) | N/A | Split-pane UI, event handling | Admin UI is already vanilla JS/HTML templates; no framework to add |
| `hono/cors` | Already installed | CORS for preview API | Already configured in the codebase for API routes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS `resize`/flexbox | CSS3 | Draggable split pane | Pure CSS + minimal JS for divider drag; no library needed |
| `crypto.randomUUID()` | Web API | Preview token generation | Available in Cloudflare Workers runtime |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| postMessage + iframe | Client-side markdown render | Would not use actual Astro templates -- defeats the purpose of "true preview" |
| Short-lived KV token | Service bindings between Workers and Pages | Service bindings require Workers-to-Workers; Pages cannot be a service binding target |
| In-memory draft store | D1 draft table | D1 adds unnecessary persistence for ephemeral preview data; KV with TTL is simpler |

## Architecture Patterns

### Recommended Project Structure
```
packages/core/src/
  routes/
    admin-preview.ts           # New: preview page route + draft API
  templates/pages/
    admin-preview.template.ts  # New: split-screen preview page template

packages/site/src/
  pages/
    preview/
      [collection]/
        [slug].astro           # New: preview render route (SSR)
  lib/
    flare.ts                   # Modified: add getDraftContent() function
```

### Pattern 1: Draft Content Flow (Token-Based)
**What:** CMS creates a short-lived draft snapshot, returns a token. Astro site fetches draft data using that token.
**When to use:** Every preview render cycle.
**Example:**
```
1. Editor types in CMS admin form
2. After 500ms debounce, JS collects form data
3. POST /api/preview/draft { collectionId, fields... } -> { token: "abc123", expiresAt: ... }
4. CMS sends postMessage to iframe: { type: "preview-update", token: "abc123" }
5. Iframe (Astro) navigates/fetches: /preview/blog-posts/my-post?token=abc123
6. Astro preview route calls CMS: GET /api/preview/draft/abc123 -> draft data
7. Astro renders through real template with draft data
```

### Pattern 2: Split-Screen Preview Page
**What:** Full-viewport page with editor fields on left, iframe on right, draggable divider.
**When to use:** The preview page at `/admin/preview/:collectionId/:contentId`
**Example:**
```html
<!-- No admin layout template -- standalone full-viewport page -->
<div class="preview-container" style="display:flex; height:100vh;">
  <div class="editor-pane" style="width:40%; overflow-y:auto;">
    <!-- Form fields rendered here -->
  </div>
  <div class="divider" style="width:4px; cursor:col-resize; background:#333;"></div>
  <div class="preview-pane" style="flex:1;">
    <iframe src="/preview/blog-posts/my-slug?token=xxx" style="width:100%; height:100%; border:none;"></iframe>
  </div>
</div>
```

### Pattern 3: postMessage Communication Protocol
**What:** Structured message format for editor-to-iframe communication.
**When to use:** Every time form data changes.
**Example:**
```javascript
// CMS editor pane sends:
iframe.contentWindow.postMessage({
  type: 'flare-preview-update',
  token: 'abc123',
  timestamp: Date.now()
}, targetOrigin)

// Astro preview page listens:
window.addEventListener('message', (event) => {
  if (event.data.type === 'flare-preview-update') {
    // Re-fetch draft data with new token and re-render
    window.location.href = `/preview/${collection}/${slug}?token=${event.data.token}`
  }
})
```

### Pattern 4: Auth for Preview Routes
**What:** Preview tokens serve dual purpose: identify draft data AND authenticate the request.
**When to use:** Every preview route access.
**Example:**
```typescript
// CMS: POST /api/preview/draft creates token with embedded auth
const token = crypto.randomUUID()
await env.CACHE_KV.put(`preview:${token}`, JSON.stringify({
  data: formData,
  userId: user.userId,
  collectionId,
  slug,
  createdAt: Date.now()
}), { expirationTtl: 300 }) // 5 min TTL

// Astro: GET /preview/[collection]/[slug]?token=xxx
// Validates token exists in KV, uses data to render
```

### Anti-Patterns to Avoid
- **Direct D1 access from Astro for drafts:** The Astro site doesn't have D1 bindings and shouldn't. Keep draft data in KV accessed via API.
- **Storing drafts in D1 permanently:** Drafts are ephemeral; use KV with TTL, not a database table.
- **Client-side rendering of preview:** Defeats the purpose. The value is seeing content through the ACTUAL Astro templates.
- **Sending full HTML content via postMessage:** Too large, too slow. Send tokens, let iframe fetch.
- **Using localStorage/sessionStorage for cross-origin data:** Won't work between different origins (Workers vs Pages).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Draggable split pane | Custom mouse event handler from scratch | CSS flexbox + ~30 lines of mousedown/mousemove/mouseup | Well-understood pattern, but keep it simple; no library needed for one divider |
| Cross-origin messaging | Custom WebSocket or polling | `window.postMessage` | Built-in Web API, zero dependencies, designed for iframe communication |
| Token expiry | Custom timestamp checking | KV `expirationTtl` | Cloudflare KV handles TTL automatically, no cleanup needed |
| CORS configuration | Custom headers | `hono/cors` middleware (already in codebase) | Already set up for API routes; extend `CORS_ORIGINS` to include preview |
| Debouncing | Custom setTimeout tracking | Standard debounce pattern (~5 lines) | Too simple for a library, but don't skip it |
| Form data serialization | Manual field-by-field extraction | `new FormData(form)` + existing `extractFieldData` | Already exists in `admin-content.ts` |

**Key insight:** The existing codebase already has all the building blocks: form data extraction (`extractFieldData`), auth middleware (`requireAuth`), CORS setup (`hono/cors`), KV bindings (`CACHE_KV`), and SSR Astro pages. This phase is primarily integration work, not greenfield development.

## Common Pitfalls

### Pitfall 1: Cross-Origin iframe Issues
**What goes wrong:** CMS (localhost:8787) loads iframe from Astro (localhost:4321) -- different origins. `postMessage` works but accessing iframe DOM directly does not.
**Why it happens:** Same-origin policy blocks direct DOM access between different origins.
**How to avoid:** Use `postMessage` exclusively for communication. Set `targetOrigin` explicitly (never `*` in production). The CORS_ORIGINS env var already includes both origins for dev.
**Warning signs:** "SecurityError: Blocked a frame with origin" in console.

### Pitfall 2: Preview Token Race Conditions
**What goes wrong:** Fast typing creates multiple draft tokens before iframe finishes rendering the first one.
**Why it happens:** Each debounced update creates a new token and tells iframe to reload.
**How to avoid:** Use a single token ID that gets overwritten (same KV key per content item), not a new UUID each time. Pattern: `preview:{userId}:{collectionId}:{contentId}` as the KV key.
**Warning signs:** Iframe flickering, stale content appearing briefly.

### Pitfall 3: Iframe Navigation Causes Full Page Reload
**What goes wrong:** Updating iframe `src` causes a full HTTP round-trip each time.
**Why it happens:** Changing `iframe.src` = full page load.
**How to avoid:** Two strategies: (1) For the initial approach, accept the reload but make it fast (<50ms on same edge). (2) For optimization later, have the Astro preview page listen for postMessage and use `fetch()` + DOM swap instead of full reload.
**Warning signs:** Visible white flash between updates.

### Pitfall 4: Form State Diverges from Preview
**What goes wrong:** Rich text editors (Quill, TinyMCE, MDX) store content differently from what `FormData` captures.
**Why it happens:** WYSIWYG editors have their own internal state that may not be reflected in the form input until blur/save.
**How to avoid:** Before collecting form data for preview, trigger editor sync: Quill's `.root.innerHTML`, TinyMCE's `tinymce.get(id).getContent()`, etc. The existing form already handles this for save operations.
**Warning signs:** Preview shows stale rich text content.

### Pitfall 5: KV Consistency in Local Dev
**What goes wrong:** In local dev (`wrangler dev`), KV is simulated and both CMS Worker and Astro Pages need to read the same KV store. But they run as separate processes.
**Why it happens:** Local wrangler dev spins up separate KV instances per worker.
**How to avoid:** In local dev, use the CMS API as the draft data store (not shared KV). The Astro preview route fetches from CMS API which reads its own KV. This works because the API call goes over HTTP to localhost:8787.
**Warning signs:** "Token not found" errors in local development.

### Pitfall 6: Production CORS Not Configured
**What goes wrong:** Preview works locally but fails in production because CORS_ORIGINS doesn't include the Astro site URL for the preview API endpoint.
**Why it happens:** The new preview API endpoint needs CORS just like the content API.
**How to avoid:** The preview API route should use the same CORS middleware as the existing API routes, and verify `CORS_ORIGINS` includes the Astro site domain.
**Warning signs:** CORS errors in browser console on production.

## Code Examples

### Draft API Endpoint (CMS Worker)
```typescript
// packages/core/src/routes/admin-preview.ts
import { Hono } from 'hono'
import { requireAuth } from '../middleware'
import type { Bindings, Variables } from '../app'

const adminPreviewRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
adminPreviewRoutes.use('*', requireAuth())

// Store draft data and return preview token
adminPreviewRoutes.post('/draft', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const { collectionId, contentId, data, title, slug, status } = body

  // Deterministic key prevents race conditions
  const previewKey = `preview:${user.userId}:${collectionId}:${contentId || 'new'}`

  const draft = {
    collectionId,
    contentId,
    title,
    slug,
    status: status || 'draft',
    data,
    userId: user.userId,
    createdAt: Date.now()
  }

  await c.env.CACHE_KV.put(previewKey, JSON.stringify(draft), {
    expirationTtl: 300  // 5 minutes
  })

  return c.json({
    token: previewKey,
    expiresIn: 300
  })
})

// Retrieve draft data by token (called by Astro site)
adminPreviewRoutes.get('/draft/:token', async (c) => {
  const token = c.req.param('token')
  const raw = await c.env.CACHE_KV.get(token)

  if (!raw) {
    return c.json({ error: 'Preview expired or not found' }, 404)
  }

  return c.json({ data: JSON.parse(raw) })
})
```

### Astro Preview Route
```astro
---
// packages/site/src/pages/preview/[collection]/[slug].astro
const { collection, slug } = Astro.params
const token = Astro.url.searchParams.get('token')

if (!token) {
  return new Response('Preview token required', { status: 401 })
}

const API_URL = import.meta.env.PUBLIC_FLARE_API_URL || 'http://localhost:8787'
const response = await fetch(`${API_URL}/api/preview/draft/${encodeURIComponent(token)}`)

if (!response.ok) {
  return new Response('Preview expired', { status: 410 })
}

const { data: draft } = await response.json()
const post = {
  title: draft.title,
  content: draft.data.content,
  excerpt: draft.data.excerpt || '',
  author: draft.data.author || '',
  date: draft.data.publishedAt || new Date().toISOString(),
  featuredImage: draft.data.featuredImage,
}
---
<!-- Render using same template as production page -->
<!-- Plus: inject postMessage listener script for live updates -->
```

### Draggable Split Pane (Vanilla JS)
```javascript
// ~30 lines for draggable divider
function initSplitPane(container, divider, leftPane) {
  let isResizing = false
  let startX, startWidth

  divider.addEventListener('mousedown', (e) => {
    isResizing = true
    startX = e.clientX
    startWidth = leftPane.offsetWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  })

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return
    const dx = e.clientX - startX
    const newWidth = Math.max(300, Math.min(startWidth + dx, container.offsetWidth - 300))
    leftPane.style.width = newWidth + 'px'
  })

  document.addEventListener('mouseup', () => {
    isResizing = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  })
}
```

### Debounced Form Data Collection
```javascript
// Collect form data and post draft to API
let debounceTimer = null

function onFormChange() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    // Sync rich text editors first
    syncEditors()

    const form = document.getElementById('preview-form')
    const formData = new FormData(form)
    const data = Object.fromEntries(formData.entries())

    const response = await fetch('/api/preview/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collectionId: data.collection_id,
        contentId: data.id,
        title: data.title,
        slug: data.slug,
        data: extractFieldsFromFormData(data)
      })
    })

    const { token } = await response.json()
    const iframe = document.getElementById('preview-iframe')
    const previewUrl = `${SITE_URL}/preview/${data.collection_name}/${data.slug}?token=${encodeURIComponent(token)}`

    // Update iframe
    iframe.src = previewUrl
  }, 500) // 500ms debounce per CONTEXT.md
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw HTML preview (current in codebase) | Iframe of actual frontend page | This phase | True WYSIWYG instead of basic HTML dump |
| New window for preview (`window.open`) | Same-page split screen | This phase | Better UX, no lost windows |
| Save-then-preview | Preview unsaved in-memory state | This phase | Instant feedback loop |
| Manual refresh | Auto-update with debounce | This phase | Continuous preview as you type |

**Deprecated/outdated:**
- The existing `POST /admin/content/preview` endpoint generates raw HTML in a new window. This will be replaced (but can coexist during migration).
- The existing `previewContent()` function in `admin-content-form.template.ts` (line 915) opens a blank window. Will be replaced with navigation to preview page.

## Design Decisions (Claude's Discretion)

### Preview Render Method: Iframe of Actual Astro Page
**Decision:** Use an iframe loading the real Astro SSR preview route.
**Rationale:** The entire point is seeing content as it will appear on the real site. Client-side markdown rendering would miss Astro layouts, Tailwind styles, typography plugin, and any custom components. The iframe approach also means any future template changes automatically appear in preview.

### Which Fields Trigger Preview Updates: All Visible Fields
**Decision:** All form field changes trigger preview updates (with debounce).
**Rationale:** Editors expect to see changes to title, excerpt, featured image, author -- not just body content. The debounce handles performance. Attach `input`/`change` event listeners to all form fields.

### Loading Indicator: Iframe Opacity Transition
**Decision:** When preview is updating, reduce iframe opacity to 0.6 with a subtle "Updating..." overlay. Restore to full opacity when iframe loads.
**Rationale:** No jarring spinner. The subtle dimming signals "something is happening" without disrupting the reading flow.

### Draft API Design: Dedicated Endpoint
**Decision:** New `POST /api/preview/draft` and `GET /api/preview/draft/:token` endpoints.
**Rationale:** Keeps preview logic separate from content CRUD. The existing content API is read-only for API tokens and requires published status. Preview needs its own auth model (JWT user auth, not API key).

### KV Key Strategy: Deterministic Per-User-Per-Content
**Decision:** Key format `preview:{userId}:{collectionId}:{contentId}` with 5-minute TTL.
**Rationale:** Prevents token accumulation from rapid typing. Each update overwrites the previous draft for the same content item. Only one preview per user per content item can exist simultaneously.

## Open Questions

1. **Collection-to-route mapping:**
   - What we know: Blog posts render at `/blog/[slug]`, news at `/news/[slug]`, pages at `/[slug]`
   - What's unclear: How to generically map any collection to its Astro preview route
   - Recommendation: Create a preview route config mapping in the Astro site (e.g., `previewRoutes.ts`) that maps collection names to their template paths. Start with known collections, make it extensible.

2. **Scroll sync implementation:**
   - What we know: CONTEXT.md specifies scroll sync between editor and preview
   - What's unclear: Cross-origin iframe scroll position cannot be read directly due to same-origin policy
   - Recommendation: Use postMessage for scroll sync too. The Astro preview page reports its scroll position via postMessage, and the editor listens. Bidirectional sync is complex -- start with editor-scroll-drives-preview (simpler, more useful).

3. **Rich text editor sync timing:**
   - What we know: Quill, TinyMCE, and MDX editors have their own internal state
   - What's unclear: Exact API calls needed to extract current content from each editor type before preview collection
   - Recommendation: Document each editor's "get content" API during implementation. The existing save handlers in `admin-content-form.template.ts` already do this.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `packages/core/src/routes/admin-content.ts` (existing preview at line 1197)
- Codebase inspection: `packages/core/src/templates/pages/admin-content-form.template.ts` (existing previewContent() at line 915)
- Codebase inspection: `packages/site/src/pages/blog/[slug].astro` (production blog template)
- Codebase inspection: `packages/cms/wrangler.toml` (CORS_ORIGINS, KV binding)
- Codebase inspection: `packages/core/src/middleware/auth.ts` (JWT auth pattern)
- Codebase inspection: `packages/core/src/routes/api.ts` (CORS middleware setup)
- Codebase inspection: `packages/site/src/lib/flare.ts` (API client pattern)

### Secondary (MEDIUM confidence)
- [Payload CMS Live Preview docs](https://payloadcms.com/docs/live-preview/overview) - postMessage architecture pattern
- [Contentstack Live Preview](https://www.contentstack.com/docs/developers/set-up-live-preview/how-live-preview-works) - iframe + postMessage flow
- [Cloudflare Service Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/) - confirmed zero-overhead same-thread communication (but Pages cannot be a binding target, so we use HTTP)
- [Astro On-demand Rendering docs](https://docs.astro.build/en/guides/on-demand-rendering/) - SSR preview route pattern

### Tertiary (LOW confidence)
- [Strapi Preview docs](https://docs.strapi.io/cms/features/preview) - general pattern validation
- Web search results for split pane implementations - confirmed vanilla JS approach is standard

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Based on direct codebase analysis and industry patterns from Payload CMS/Contentstack
- Architecture: HIGH - Token-based draft flow is proven pattern; all infrastructure exists in codebase
- Pitfalls: HIGH - Cross-origin iframe issues are well-documented; KV behavior verified against Cloudflare docs
- Code examples: MEDIUM - Patterns are sound but will need adjustment during implementation for exact field names/APIs

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- no fast-moving dependencies)
