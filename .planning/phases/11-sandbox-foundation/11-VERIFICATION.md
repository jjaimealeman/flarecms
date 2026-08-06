---
phase: 11-sandbox-foundation
verified: 2026-03-16T19:52:07Z
status: gaps_found
score: 4/5 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 3/5
  gaps_closed:
    - "Demo user can view all collections but can only create/edit/delete in demo-sandbox (SAND-02)"
  gaps_remaining:
    - "Every demo signup is recorded in demo_signups table (SAND-05) — route deferred to Phase 12"
  regressions: []
gaps:
  - truth: "Every demo signup is recorded in a demo_signups table with email, IP address, and timestamp"
    status: partial
    reason: "The demo_signups table exists (migration 038). The createDemoUser service inserts into demo_signups with email, user_id, ip_address, user_agent, and created_at. However, no POST /demo/signup route exists in Phase 11 — explicitly deferred to Phase 12 per index.ts line 7 comment. With no route calling createDemoUser, zero signups can ever be recorded in the current deployed state."
    artifacts:
      - path: "packages/core/src/plugins/core-plugins/demo-sandbox/index.ts"
        issue: "Line 7 comment: 'Routes (Phase 12): POST /demo/signup'. No routes defined in this plugin."
      - path: "packages/core/src/plugins/core-plugins/demo-sandbox/demo-service.ts"
        issue: "createDemoUser is defined and exported but is never called — no route imports or invokes it."
    missing:
      - "POST /demo/signup route that calls createDemoUser (planned for Phase 12)"
      - "NOTE: Phase 11 explicitly scopes itself to infrastructure only. The gap is intentional by design but means the observable truth 'Every demo signup is recorded' cannot be satisfied until Phase 12 adds the route."
---

# Phase 11: Sandbox Foundation Verification Report

**Phase Goal:** Demo visitors land in an admin that gives them a safe playground -- one collection they own, everything else read-only, with guardrails against abuse
**Verified:** 2026-03-16T19:52:07Z
**Status:** gaps_found (1 remaining gap — Phase 12 dependency)
**Re-verification:** Yes — after SAND-02 gap closure (plan 11-03, commit e07597d)

## Re-verification Summary

Previous score was 3/5. One gap was closed:

- **SAND-02 CLOSED:** `createDemoUser` in `demo-service.ts` now grants viewer permission on ALL active collections (lines 82-97). The admin content list filter at `admin-content.ts` lines 325-336 uses `getCollectionPermissions` to build `allowedCollectionIds` — now that demo users have permission records for every collection, all collections appear in the admin list. Collections other than `demo-sandbox-collection` have `viewer` role, so the "Create New Content" modal (lines 558-565, filters to editor/author only) correctly shows only `demo-sandbox-collection` as writable. No regressions found in truths 1, 3, or 4.

One gap remains open:

- **SAND-05 REMAINS:** Route activation deferred to Phase 12. Infrastructure is complete and correct.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | demo-sandbox collection exists with title/content/status fields and 3 seed rows | VERIFIED | Migration 038 (migrations-bundle.ts line 279): collection created with exact schema (title required, content richtext, status enum draft/published), 3 seed rows inserted. |
| 2 | Demo user can view all collections but can only create/edit/delete in demo-sandbox | VERIFIED | createDemoUser grants editor on demo-sandbox-collection then viewer on all others (demo-service.ts lines 74-97). admin-content.ts lines 335-336 filter shows all permitted collections. "Create New Content" modal (lines 558-565) restricts to editor/author only — demo user sees only demo-sandbox-collection as writable. API CRUD blocked via checkCollectionPermission (api-content-crud.ts lines 108, 260, 616). |
| 3 | Demo user exceeding 50 mutations receives 429 with clear "limit reached" message | VERIFIED | demoMutationGuard in middleware.ts: counts via KV key `demo-mutations:{userId}`, returns 429 with "You have reached the demo limit of 50 changes. Start a new demo session to continue." Wired in app.ts lines 287-288. |
| 4 | Demo file uploads accept only images under 2MB; others rejected with clear message | VERIFIED | demoUploadGuard in middleware.ts: rejects non-images with "Demo accounts can only upload images." (400) and >2MB with "Demo image uploads are limited to 2 MB." (400). Wired in app.ts line 289. |
| 5 | Every demo signup is recorded in demo_signups with email, IP address, and timestamp | PARTIAL | Table exists (migration 038). createDemoUser service inserts correctly. But no /demo/signup route exists — deferred to Phase 12. Nothing calls createDemoUser in the current state. |

**Score:** 4/5 truths verified (1 partial)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/migrations/038_demo_sandbox.sql` | demo_signups table + collection + seed rows | VERIFIED | 91 lines, complete SQL |
| `packages/core/src/db/migrations-bundle.ts` | Migration 038 bundled | VERIFIED | Line 279: id '038', full SQL embedded |
| `packages/core/src/plugins/core-plugins/demo-sandbox/index.ts` | Plugin factory + instance | VERIFIED | 43 lines, exports createDemoSandboxPlugin and demoSandboxPlugin |
| `packages/core/src/plugins/core-plugins/demo-sandbox/demo-service.ts` | createDemoUser with viewer grants on all collections | VERIFIED | 115 lines; editor on demo-sandbox-collection (line 75-80), viewer loop on all others (lines 82-97), continue guard (line 89), demo_signups INSERT (lines 99-107) |
| `packages/core/src/plugins/core-plugins/demo-sandbox/manifest.json` | Plugin metadata | VERIFIED | Valid JSON, id: demo-sandbox, category: demo |
| `packages/core/src/plugins/core-plugins/demo-sandbox/middleware.ts` | demoMutationGuard + demoUploadGuard | VERIFIED | 142 lines, both exports present, KV-based detection, 429 at limit, image/size validation |
| `packages/core/src/plugins/core-plugins/index.ts` | Export + CORE_PLUGIN_IDS entry | VERIFIED | Line 22 exports demoSandboxPlugin/createDemoSandboxPlugin, line 36 has 'demo-sandbox' in CORE_PLUGIN_IDS |
| `packages/core/src/app.ts` | Plugin import + middleware wiring | VERIFIED | Lines 54-55 import plugin and guards, lines 287-289 wire guards to /api/content/*, /api/media/*, /api/media/upload |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app.ts` | `demo-sandbox/index.ts` | import line 54 | WIRED | demoSandboxPlugin imported and registered |
| `app.ts` | `demo-sandbox/middleware.ts` | import line 55, use lines 287-289 | WIRED | Guards applied to content and media routes |
| `demo-service.ts` | `services/rbac.ts` | grantCollectionPermission import + call lines 75-96 | WIRED | Editor on demo-sandbox-collection, viewer on all others via loop |
| `demo-service.ts` | `demo_signups table` | INSERT lines 99-107 | WIRED (service only) | Correct schema (email, user_id, ip_address, user_agent, created_at) — but no route calls this service |
| `middleware.ts` | `CACHE_KV` | c.env.CACHE_KV lines 26, 55 | WIRED | Graceful degradation: returns next() if KV absent |
| `api-media.ts` | `parsedFormData context` | c.get('parsedFormData') ?? fallback line 47 | WIRED | Prevents double body-consumption when demoUploadGuard runs first |

---

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| SAND-01: demo-sandbox collection with sample fields and seed rows | SATISFIED | Migration 038 creates collection with title/content/status schema and 3 seed rows |
| SAND-02: Demo role read-only access to all collections, full access to demo-sandbox | SATISFIED | createDemoUser grants viewer on all collections + editor on demo-sandbox-collection. Admin UI filter shows all (read-only). Create modal shows only demo-sandbox-collection as writable. |
| SAND-03: 50 mutation limit per session with 429 response | SATISFIED | demoMutationGuard wired to /api/content/* and /api/media/* in app.ts |
| SAND-04: Image-only uploads under 2MB with clear error messages | SATISFIED | demoUploadGuard wired to /api/media/upload, both guards tested for message content |
| SAND-05: demo_signups table records email, IP, timestamp | BLOCKED | Table and service exist. POST /demo/signup route deferred to Phase 12 — no path currently calls createDemoUser. |
| DEMO-04: Demo signup infrastructure | PARTIAL | DB table and service layer complete. Route activation is Phase 12 scope. |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `demo-sandbox/index.ts` | 7 | `Routes (Phase 12): POST /demo/signup` | Info | Intentional deferral, not a defect — Phase 12 activates the endpoint |

No blockers found. No stubs in verified paths. All existing implementations are substantive.

---

## Gaps Summary

One gap remains from the previous verification. It is architectural by design:

**SAND-05 / DEMO-04 — Route not yet wired.** The `demo_signups` table (migration 038) and `createDemoUser` service (`demo-service.ts`) are complete and correct. The service correctly inserts into `demo_signups` with email, user_id, ip_address, user_agent, and created_at. However, Phase 11 explicitly scoped itself to infrastructure only — `index.ts` line 7 documents: "Routes (Phase 12): POST /demo/signup". No HTTP route exists that calls `createDemoUser`, so no demo signups can flow until Phase 12.

The gap is intentional but real: the success criterion "Every demo signup is recorded" cannot be satisfied without the route. Phase 12 must add `POST /demo/signup` calling `createDemoUser` to satisfy SAND-05.

---

_Verified: 2026-03-16T19:52:07Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — closes SAND-02, SAND-05 remains pending Phase 12_
