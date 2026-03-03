---
phase: 02-content-workflow
verified: 2026-03-02T07:23:19Z
status: gaps_found
score: 6/8 must-haves verified
gaps:
  - truth: "Editor role cannot modify collection schemas or user accounts"
    status: partial
    reason: "admin-users.ts correctly restricts /users/* to admin, but collection schema creation (POST /admin/api/collections) is gated only by requireRole(['admin', 'editor']) — editors can create new collections and therefore mutate schemas"
    artifacts:
      - path: "sonicjs-fork/packages/core/src/routes/admin-api.ts"
        issue: "Line 18: requireRole(['admin', 'editor']) applied to all routes including POST /admin/api/collections. No per-route admin-only guard on collection creation/deletion mutations."
    missing:
      - "Admin-only guard on POST /admin/api/collections (create collection)"
      - "Admin-only guard on PUT /admin/api/collections/:id (update collection schema)"
      - "Admin-only guard on DELETE /admin/api/collections/:id (delete collection)"

  - truth: "Content versioning modal closes correctly and rollback produces expected content state"
    status: partial
    reason: "The modal close and restore JavaScript exists in admin-content-form.template.ts and works structurally. However version-history.template.ts contains a placeholder: 'Change detection coming soon...' (line 107). The restore route exists in admin-content.ts. The modal close function (closeVersionHistory) is defined and called correctly. This is a warning-level stub in the diff view only — rollback itself is implemented."
    artifacts:
      - path: "sonicjs-fork/packages/core/src/templates/components/version-history.template.ts"
        issue: "Line 107: '<em>Change detection coming soon...</em>' — placeholder text in the version diff/changes view. The rollback and close functionality itself is wired."
    missing:
      - "Version diff/changes view implementation (currently shows placeholder text)"
human_verification:
  - test: "Verify scheduled content auto-publish fires at correct time"
    expected: "Content with scheduled_publish_at in the past is automatically set to 'published' when the cron trigger fires"
    why_human: "Cron trigger fires every minute (* * * * *) — requires a live Cloudflare Workers environment to test the scheduled handler path end-to-end"
  - test: "Verify editor role UI hides collection management links"
    expected: "Logged in as an editor, the admin sidebar should not show 'Collections' or 'Users' navigation items"
    why_human: "UI element hiding based on role is server-side HTML rendering — requires live browser test to confirm nav items are hidden"
---

# Phase 02: Content Workflow Verification Report

**Phase Goal:** Editors can manage the full lifecycle of content — create, publish, unpublish, schedule, and query — without workarounds, and access is scoped to each user's role
**Verified:** 2026-03-02T07:23:19Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                       | Status      | Evidence                                                                                          |
|-----|-------------------------------------------------------------|-------------|---------------------------------------------------------------------------------------------------|
| 1   | API bracket-syntax filter params produce D1 WHERE clauses   | VERIFIED    | `query-filter.ts` lines 434-444: bracketPattern regex parses `filter[field][op]=value`; wired in `api.ts` lines 633-695 with full SQL execution |
| 2   | Published content can transition back to draft              | VERIFIED    | `content-state-machine.ts` line 11: `published: ['draft', 'archived']`; enforced in `api-content-crud.ts` lines 226-281 with `getUnpublishUpdates()` clearing scheduling fields |
| 3   | Every status transition is recorded in `workflow_history`   | VERIFIED    | `audit-trail.ts`: `logStatusChange()` and `logContentEdit()` with full field diffs; called in `api-content-crud.ts` lines 307-344 and `admin-content.ts` (imports confirmed) |
| 4   | Versioning modal closes correctly; rollback produces expected state | PARTIAL | `closeVersionHistory()` function wired in `admin-content-form.template.ts` lines 1008-1011; restore route exists in `admin-content.ts` lines 1607-1651; but version diff view has placeholder text ("Change detection coming soon...") |
| 5   | Scheduled content auto-publishes via Workers cron trigger   | VERIFIED    | `wrangler.toml` line 56: `crons = ["* * * * *"]`; `my-astro-cms/src/index.ts` lines 42-45: `scheduled()` handler calls `SchedulerService.processScheduledContent()`; `scheduler.ts` has full `publishContent()` implementation |
| 6   | Duplicate slug in same collection returns 409 validation error | VERIFIED | `api-content-crud.ts` lines 117-124: SELECT check + `return c.json({ error: '...' }, 409)` before INSERT |
| 7   | Editor cannot modify collection schemas or user accounts    | PARTIAL     | User management correctly admin-only (admin-users.ts line 433-437: `requireRole('admin')`); but collection schema creation/modification in `admin-api.ts` only requires `requireRole(['admin', 'editor'])` (line 18) — editors can create collections |
| 8   | Read-only API token scoped to collection blocks write endpoints | VERIFIED | `api.ts` lines 67-69: POST/PUT/DELETE/PATCH returns 403 for API tokens; lines 89-102: collection scope enforced; `validateApiToken()` hashes and checks DB; SHA-256 storage confirmed in `api-tokens.ts` |

**Score:** 6/8 truths verified (2 partial)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `sonicjs-fork/packages/core/src/utils/query-filter.ts` | Bracket-syntax parsing | VERIFIED | 480 lines; `parseFromQuery()` with OPERATOR_MAP and bracketPattern regex; exported and imported in `api.ts` |
| `sonicjs-fork/packages/core/src/services/content-state-machine.ts` | Status transition validation | VERIFIED | 73 lines; `VALID_TRANSITIONS` map includes `published → draft`; `validateStatusTransition()`, `isSlugLocked()`, `getUnpublishUpdates()` all exported and used in `api-content-crud.ts` |
| `sonicjs-fork/packages/core/src/services/audit-trail.ts` | Status and edit logging | VERIFIED | 115 lines; `logStatusChange()` and `logContentEdit()` with real D1 INSERTs; `computeFieldDiff()` for field-level diffs; used in both API and admin routes |
| `sonicjs-fork/packages/core/src/services/rbac.ts` | Collection-level permission checks | VERIFIED | 147 lines; `checkCollectionPermission()` queries `user_collection_permissions` table; `grantCollectionPermission()` and `revokeCollectionPermission()` implemented |
| `sonicjs-fork/packages/core/src/services/api-tokens.ts` | SHA-256 token hashing + collection scoping | VERIFIED | 251 lines; `hashToken()` uses WebCrypto SHA-256; `validateApiToken()` checks hash + expiry; `allowed_collections` stored as JSON array |
| `sonicjs-fork/packages/core/src/middleware/auth.ts` | X-API-Key header support | VERIFIED | Lines 174-198: `X-API-Key` header checked first in `requireAuth()`; validates via `validateApiToken()`; sets role to 'viewer' |
| `sonicjs-fork/packages/core/src/routes/api-content-crud.ts` | RBAC enforcement on write endpoints | VERIFIED | 429 lines; `checkCollectionPermission()` called on POST (line 103) and PUT (line 210); `isAuthorAllowedToEdit()` called for author role; slug duplicate check at creation |
| `sonicjs-fork/packages/core/src/routes/admin-content.ts` | Admin RBAC + versioning routes | VERIFIED | 1759 lines; `validateStatusTransition()` imported; version history route at line 1548; restore route at line 1607; `logStatusChange()` called |
| `sonicjs-fork/packages/core/src/routes/admin-api-tokens.ts` | Token management UI | VERIFIED | 407 lines; GET list, POST create (shows token once), POST revoke; uses `createApiToken()`, `listApiTokens()`, `revokeApiToken()` |
| `sonicjs-fork/packages/core/src/routes/admin-users.ts` | User management admin-only | VERIFIED | Lines 433-437: `requireRole('admin')` applied to `/users/*`, `/users`, `/invite-user`, `/resend-invitation/*`, `/cancel-invitation/*` |
| `sonicjs-fork/packages/core/src/templates/components/version-history.template.ts` | Version history modal render | PARTIAL | 143 lines; `closeVersionHistory()` and `restoreVersion()` button wired; but line 107 has placeholder: "Change detection coming soon..." |
| `my-astro-cms/src/index.ts` | Workers scheduled handler | VERIFIED | `scheduled()` handler at line 42 calls `SchedulerService(env.DB).processScheduledContent()` via `ctx.waitUntil()` |
| `my-astro-cms/wrangler.toml` | Cron trigger configured | VERIFIED | Line 56: `crons = ["* * * * *"]` — fires every minute |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `api.ts` GET /collections/:name/content | `QueryFilterBuilder.parseFromQuery()` | Import + call at line 633 | WIRED | Bracket params parsed, SQL built and executed against D1 |
| `api-content-crud.ts` PUT /:id | `validateStatusTransition()` | Import + call at line 227 | WIRED | Returns 409 on invalid transition |
| `api-content-crud.ts` PUT /:id | `logStatusChange()` | Import + call at line 309 | WIRED | Logged after successful update |
| `api-content-crud.ts` POST / | `checkCollectionPermission()` | Import + call at line 103 | WIRED | 403 returned on insufficient permission |
| `api.ts` middleware | `validateApiToken()` | Import + call in middleware | WIRED | Read-only enforcement + collection scope enforcement present |
| `my-astro-cms/src/index.ts` scheduled() | `SchedulerService.processScheduledContent()` | Import + instantiation | WIRED | Cron fires, scheduler processes `scheduled_content` table rows |
| `admin-api.ts` POST /collections | admin-only guard | `requireRole(['admin', 'editor'])` | PARTIAL | Editors can create collections — admin-only guard missing |
| `version-history.template.ts` | `closeVersionHistory()` | Inline JS in admin-content-form | WIRED | Close button and backdrop click call `closeVersionHistory()` which removes modal element |

---

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| API filter params produce correct D1 WHERE clauses | SATISFIED | Full bracket-syntax parser implemented and wired |
| Published → draft transition possible | SATISFIED | State machine + unpublish updates implemented |
| Workflow history logged with user ID and timestamp | SATISFIED | `logStatusChange()` + `logContentEdit()` with D1 inserts |
| Versioning modal fix | SATISFIED (with warning) | Close/restore works; version diff view is placeholder |
| Scheduled content auto-publish | SATISFIED | Cron + SchedulerService + `processScheduledContent()` all wired |
| Slug uniqueness validation | SATISFIED | 409 returned on duplicate slug in same collection |
| Editor role scoped to content only | PARTIAL | User management blocked; collection schema creation not blocked |
| Read-only API token with collection scope | SATISFIED | Write methods blocked, collection scope enforced, SHA-256 hashing |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `version-history.template.ts` | 107 | `<em>Change detection coming soon...</em>` | Warning | Version diff view shows placeholder — does not affect close or rollback functionality |
| `admin-api.ts` | 18 | `requireRole(['admin', 'editor'])` on ALL routes including collection mutations | Blocker | Editors can create/modify collection schemas — violates Truth #7 |
| `scheduler.ts` | 1 | `// @ts-nocheck` at top of file | Info | TypeScript checking disabled — may hide type errors in scheduler logic |

---

### Human Verification Required

#### 1. Scheduled Content Auto-Publish End-to-End

**Test:** Create a content item, set `scheduled_publish_at` to 1 minute in the future using the workflow plugin, wait for the cron to fire, then check the content status.
**Expected:** Content status changes from `draft` to `published` automatically within ~1 minute
**Why human:** Cron trigger requires a live Cloudflare Workers deployment; `wrangler dev` local mode may not invoke scheduled handlers automatically.

#### 2. Editor Role — Collection Schema Creation Blocked

**Test:** Log in as an editor user (not admin), navigate to `/admin/collections` or call `POST /admin/api/collections`.
**Expected:** Should receive a 403 Forbidden — editors should not be able to create new collections
**Why human:** The code gap is confirmed (requireRole allows editors), but a live test will confirm the exact behavior and whether the UI even exposes this action to editors.

#### 3. Version History Modal Visual Behavior

**Test:** Open a content item with multiple versions, click "Version History", then click the X button and also click the backdrop.
**Expected:** Modal closes cleanly on both X button and backdrop click; "Restore" button triggers rollback and reloads page with previous content data.
**Why human:** The `closeVersionHistory()` and `restoreVersion()` JS functions are implemented but UI behavior (overlay stacking, scroll lock, focus trap) requires browser verification.

---

### Gaps Summary

Two gaps block full goal achievement:

**Gap 1 — Editor can create/modify collection schemas (Truth #7 partial):**
`admin-api.ts` applies `requireRole(['admin', 'editor'])` globally at line 18, which covers the collection creation endpoint `POST /admin/api/collections`. The user management routes in `admin-users.ts` are correctly admin-only, but collection schema management is not. An editor can navigate to `/admin/api/collections` and create a new collection, which is a schema mutation. The fix is a per-route admin check on collection CRUD mutations.

**Gap 2 — Version diff view is a placeholder (Truth #4 partial):**
The version history modal's close and rollback functionality is correctly implemented and wired. The placeholder is only in the "View Changes" diff expansion — `<em>Change detection coming soon...</em>` at line 107 of `version-history.template.ts`. This does not block the primary use case (close modal, restore version) but is an incomplete feature area within the versioning UI.

---

*Verified: 2026-03-02T07:23:19Z*
*Verifier: Claude (gsd-verifier)*
