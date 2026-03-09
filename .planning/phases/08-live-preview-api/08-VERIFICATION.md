---
phase: 08-live-preview-api
verified: 2026-03-09T17:00:00Z
status: passed
score: 6/6 must-haves verified
human_verification:
  - test: "Open a blog post in admin, click 'Open Live Preview', type in a field"
    expected: "Split-screen loads, iframe shows Astro-rendered preview, updates after 500ms debounce"
    why_human: "Requires running CMS + Site servers, cross-origin iframe rendering, visual verification"
  - test: "Drag the divider between editor and preview panes"
    expected: "Panes resize smoothly, minimum 300px each side, no jank"
    why_human: "Visual/interaction quality cannot be verified programmatically"
  - test: "Wait 5+ minutes without editing, then type something"
    expected: "Draft save still works (new token created); old token returns 404"
    why_human: "Requires real KV TTL expiration timing"
  - test: "Visit /preview/blog-posts/my-slug?token=expired-token"
    expected: "Returns 410 Gone response"
    why_human: "Requires real HTTP request to Astro SSR"
---

# Phase 8: Live Preview API Verification Report

**Phase Goal:** Content editors see real-time preview of draft changes rendered through the actual Astro frontend, leveraging same-edge-network latency (<50ms round-trip)
**Verified:** 2026-03-09
**Status:** PASSED
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /api/preview/draft stores draft in KV with 5-min TTL and returns token | VERIFIED | `admin-preview.ts` L92-139: POST handler validates body, builds `preview:{userId}:{collectionId}:{contentKey}` key, calls `CACHE_KV.put()` with `expirationTtl: 300`, returns `{ token, expiresIn: 300 }` |
| 2 | GET /api/preview/draft/:token returns stored draft or 404 | VERIFIED | `admin-preview.ts` L142-157: Decodes token, calls `CACHE_KV.get()`, returns 404 if null, otherwise returns parsed JSON |
| 3 | Split-screen preview page with editor fields and iframe | VERIFIED | `admin-preview.template.ts` (462 lines): Full HTML page with `#editor-pane` (40% width), draggable `#divider`, `#preview-pane` with iframe, form fields rendered via `renderDynamicField`, debounced `saveDraftAndRefresh` on input/change events |
| 4 | Admin "Open Live Preview" button navigates to preview page | VERIFIED | `admin-content-form.template.ts` L319: `onclick="previewContent()"` button; L915-919: `previewContent()` navigates via `window.location.href = '/admin/preview/' + collectionId + '/' + contentId` |
| 5 | Astro SSR preview route renders draft via actual Layout | VERIFIED | `[collection]/[slug].astro` (115 lines): Calls `getDraftContent(token)` from `flare.ts`, returns 410 if expired, renders through `Layout` component with Tailwind prose styles |
| 6 | postMessage listener for flare-preview-update | VERIFIED | `[slug].astro` L106-113: Listens for `flare-preview-update` message type, updates URL token param and reloads |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/routes/admin-preview.ts` | Draft API routes (POST/GET) + preview page route | VERIFIED (229 lines) | 3 routes: POST /draft, GET /draft/:token, GET /:collectionId/:contentId. Auth on POST and page, unauthenticated GET /draft/:token |
| `packages/core/src/templates/pages/admin-preview.template.ts` | Split-screen HTML template | VERIFIED (462 lines) | Full implementation with draggable divider, debounced form listeners, Quill editor support, overlay transitions |
| `packages/site/src/pages/preview/[collection]/[slug].astro` | Astro SSR preview route | VERIFIED (115 lines) | Generic collection handler, uses Layout, preview banner, postMessage listener |
| `packages/site/src/lib/flare.ts` (getDraftContent) | API helper to fetch draft | VERIFIED (16 new lines, L241-269) | DraftContent interface + async fetch to CMS /api/preview/draft endpoint |
| `packages/core/src/routes/index.ts` | Exports adminPreviewRoutes | VERIFIED | L38: `export { adminPreviewRoutes } from './admin-preview'` |
| `packages/core/src/app.ts` | Mounts preview routes | VERIFIED | L276-277: mounted at `/api/preview` and `/admin/preview` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| admin-content-form button | /admin/preview/:id/:id | window.location.href | WIRED | `previewContent()` builds URL and navigates |
| Preview template form | POST /api/preview/draft | fetch() with credentials | WIRED | `saveDraftAndRefresh()` at L399-429 calls fetch with JSON body |
| Preview template iframe | Astro /preview/:collection/:slug | iframe.src assignment | WIRED | `updatePreview()` at L378-389 builds SITE_URL + path + token |
| Astro preview route | GET /api/preview/draft/:token | getDraftContent() | WIRED | flare.ts L254-269 fetches from API_URL |
| admin-preview.ts | CACHE_KV | c.env.CACHE_KV.put/get | WIRED | Direct KV binding calls at L130 and L146 |
| routes/index.ts | admin-preview.ts | export | WIRED | Re-exported at L38 |
| app.ts | adminPreviewRoutes | app.route() | WIRED | Mounted at L276-277 |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| POST /draft with auth, KV storage, 5-min TTL | SATISFIED | JWT auth via requireAuth(), deterministic key format |
| GET /draft/:token unauthenticated | SATISFIED | No auth middleware on GET route |
| Split-screen with draggable divider | SATISFIED | mousedown/mousemove/mouseup handlers, 300px min width |
| Debounced 500ms form updates | SATISFIED | DEBOUNCE_MS = 500, clearTimeout/setTimeout pattern |
| Iframe opacity transition | SATISFIED | overlay opacity toggle, 200ms CSS transition |
| Back to editor button | SATISFIED | goBack() navigates to /admin/content/:id/edit |
| Preview button navigates (not new window) | SATISFIED | window.location.href, not window.open |
| Astro renders with actual Layout + Tailwind | SATISFIED | Uses Layout component, prose classes |
| 410 for expired/missing token | SATISFIED | Returns Response with status 410 |
| postMessage listener | SATISFIED | Listens for flare-preview-update, reloads with new token |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| admin-preview.ts | 21 | `return null` | Info | Legitimate not-found return in cache helper |
| [slug].astro | 63 | "Author avatar placeholder" | Info | HTML comment describing avatar circle UI, not a code stub |

No blockers or warnings found.

### Human Verification Required

### 1. End-to-End Live Preview Flow
**Test:** Open CMS admin, navigate to a blog post, click "Open Live Preview", modify the title field
**Expected:** Split-screen loads with editor on left and iframe on right. After 500ms debounce, iframe reloads showing the updated title rendered through Astro Layout with Tailwind styles
**Why human:** Requires both CMS Worker and Astro Site running, cross-origin fetch, iframe rendering

### 2. Draggable Divider Interaction
**Test:** Click and drag the divider bar between editor and preview panes
**Expected:** Panes resize smoothly following the mouse, minimum 300px enforced on each side, cursor changes to col-resize
**Why human:** Mouse interaction quality and visual smoothness

### 3. KV TTL Expiration
**Test:** Save a draft, wait 5+ minutes, then try to load the preview URL with the old token
**Expected:** Returns 404 (API) or 410 (Astro page) after KV TTL expires
**Why human:** Requires real time passage for KV expiration

### 4. Cross-Collection Preview
**Test:** Try preview with different collections (blog-posts, news, docs)
**Expected:** Each renders through the same generic Astro template with correct data
**Why human:** Requires multiple collections configured with content

### Gaps Summary

No gaps found. All three sub-plans (08-01 draft API, 08-02 split-screen admin, 08-03 Astro SSR preview) are fully implemented with substantive code and correct wiring throughout the stack.

One design note (not a gap): The Astro preview route uses a single generic article template for all collections rather than collection-specific templates. The plan mentioned blog-posts, news, and docs as examples, and the generic template handles all of them. This is actually a reasonable approach -- collection-specific templates can be added later if needed.

---

_Verified: 2026-03-09_
_Verifier: Claude (gsd-verifier)_
