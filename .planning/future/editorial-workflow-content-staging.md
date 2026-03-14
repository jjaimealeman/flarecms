# Editorial Workflow: Content Staging & Go Live

## The Problem

FlareCMS runs in SSR mode — Astro reads directly from D1 on every request. When an admin edits a published product and hits Save, the change is **instantly live**. There's no safety net. A $999 typo instead of $99 goes straight to the public site.

## The Solution

A **content staging layer** where edits to published content create a **pending revision** instead of overwriting. The live version stays untouched until the user explicitly clicks **"Go Live"** and approves all pending changes in a review modal.

---

## How It Works (User's Perspective)

### Single User (Jaime on jjaimealeman.com)

1. Write a blog post → status is `draft` (invisible to public, as it is today)
2. Click Publish → status becomes `published` (live on site)
3. Later, edit the published post → edits go to a **pending revision**
4. Public site still shows the original published version
5. Click **Go Live** → review modal shows all pending changes → approve → live

For a single user this is optional — you can still publish directly if you want. The staging layer only activates when editing **already-published** content.

### Multi-User (Small Business)

**Construction company example:**
- Secretary (author on `blog-posts`) writes a post, saves as draft
- Manager (editor on `blog-posts`) reviews, clicks Publish
- Later, secretary edits a published post → creates a pending revision
- Manager sees the pending badge, opens Go Live modal, reviews changes
- Catches the typo, sends it back (or fixes it), then approves

**The key:** nobody can accidentally break the live site. Every change to published content goes through a review gate.

---

## Technical Design

### What Changes in the Schema

**No new tables needed.** We extend `content_versions` to become the staging layer.

#### `content_versions` — add `status` column

```sql
ALTER TABLE content_versions ADD COLUMN status TEXT NOT NULL DEFAULT 'history';
-- Values: 'history' (existing behavior), 'pending' (staging), 'approved', 'rejected'
```

#### `content` table — no changes

The `content` table continues to hold the **live** version. The `content_versions` table holds pending revisions.

#### New: `content_revisions_meta` (lightweight tracking)

```sql
CREATE TABLE content_revision_meta (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES content_versions(id) ON DELETE CASCADE,
  submitted_by TEXT NOT NULL REFERENCES users(id),
  reviewed_by TEXT REFERENCES users(id),
  review_comment TEXT,
  submitted_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  UNIQUE(version_id)
);
```

This tracks who submitted the revision, who reviewed it, and any comments.

### How Save Works (The Core Change)

**Current behavior:**
1. User edits published content → `UPDATE content SET data = ...` (instant overwrite)
2. Old data saved to `content_versions` as history

**New behavior:**
1. User edits published content → **content table is NOT updated**
2. New data saved to `content_versions` with `status = 'pending'`
3. Content table keeps the live version untouched
4. Sidebar badge shows pending revision count

**For draft content:** behavior is unchanged. Drafts are not live, so editing them directly is fine.

### How "Go Live" Works

1. User clicks **Go Live** button (replaces Deploy button in sidebar)
2. Modal shows all content items that have `pending` revisions:
   - Item title, collection, who edited it, when
   - Diff view: what changed (old value → new value)
   - Link to edit page for quick fixes
3. User can:
   - **Approve all** → all pending revisions overwrite their content rows
   - **Approve individually** → cherry-pick which changes go live
   - **Reject** → pending revision is marked rejected, live content unchanged
4. On approve:
   - `UPDATE content SET data = [pending version data], updated_at = NOW()`
   - `UPDATE content_versions SET status = 'approved' WHERE id = [version_id]`
   - Old live data preserved as a `history` version (rollback capability)

### How the Public API / Astro Frontend Works

**No changes needed.** The `content` table always holds the live version. Astro's `flareLoader` already reads from `content` with `status: 'published'` filter. Pending revisions live in `content_versions` and are invisible to the public.

### Media Staging (R2)

For image replacements:
1. New image uploaded to R2 under a staging prefix: `staging/{content_id}/{filename}`
2. Media record created with `status = 'pending'` (new column on media table)
3. On "Go Live" approve: move from `staging/` to `uploads/`, update media record
4. On reject: delete staging file from R2

---

## The "Go Live" Modal UI

Replaces the current Deploy modal. Same position in sidebar, same badge concept.

```
┌─────────────────────────────────────────────────┐
│  Go Live                                    ✕   │
│                                                 │
│  3 pending changes ready for review             │
│                                                 │
│  ┌─────────────────────────────────────────────┐│
│  │ ✓  Blog Posts / "New Coffee Menu"           ││
│  │    Created by Secretary · 2 hours ago       ││
│  │    NEW — not yet published                  ││
│  ├─────────────────────────────────────────────┤│
│  │ ✓  Products / "Blue Coffee Mug"             ││
│  │    Edited by John · 30 min ago              ││
│  │    Price: $12.99 → $14.99                   ││
│  │    Image: red-mug.jpg → blue-mug.jpg        ││
│  ├─────────────────────────────────────────────┤│
│  │ ✓  Products / "Espresso Blend"              ││
│  │    Edited by John · 15 min ago              ││
│  │    Price: $99.00 → $999.00  ⚠️              ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  Last published: March 13, 2026 at 11:42 AM    │
│                                                 │
│           [ Cancel ]  [ Go Live (3) ]           │
└─────────────────────────────────────────────────┘
```

Each item is expandable to show a full field-by-field diff. Checkboxes allow selective approval.

---

## Role Integration

| Role | Can edit published content? | Creates pending revision? | Can approve "Go Live"? |
|------|---------------------------|--------------------------|----------------------|
| admin | Yes | Optional (can bypass staging) | Yes |
| editor | Yes (assigned collections) | Yes | Yes (assigned collections) |
| author | Yes (own content only) | Yes | No — needs editor/admin approval |
| viewer | No | N/A | No |

**Admin bypass:** Admins can optionally save directly to live (checkbox: "Publish immediately"). For solo users like you, this keeps the current instant-publish behavior when you want it.

---

## Implementation Phases

### Phase 1: Schema + Core Service (foundation)

- Migration: add `status` column to `content_versions` (default `'history'`)
- Migration: create `content_revision_meta` table
- New service: `RevisionService` — createPendingRevision, approvePendingRevision, rejectRevision, getPendingRevisions, getPendingCount
- No UI changes yet — just the engine

### Phase 2: Save Flow Change (the behavioral shift)

- Modify `POST /admin/content/:id` (update route):
  - If content.status === 'published' AND user is not bypassing → create pending revision instead of overwriting
  - If content.status === 'draft' → save directly (current behavior)
- Add "Publish immediately" checkbox for admins
- Pending badge on sidebar (reuse existing deploy badge logic)

### Phase 3: Go Live Modal (the review UI)

- Replace Deploy modal with Go Live modal
- List pending revisions with diffs
- Approve all / approve individually / reject
- Atomic promotion: revision data → content table
- History preservation: old live data → content_versions with status 'history'

### Phase 4: Media Staging (R2 layer)

- Upload to `staging/` prefix in R2
- Promote on approve, delete on reject
- Add `status` column to media table

### Phase 5: Audit Trail Integration

- Log every revision submission, approval, rejection
- Who submitted, who approved, when, what changed
- Feeds into the audit log system (from roles-permissions-audit-demo.md)

---

## What We're NOT Building (Yet)

- **Scheduled publishing** — "Go live at 9am Monday" (future enhancement)
- **Approval chains** — "Needs 2 approvals" (workflow engine territory)
- **Branch-based staging** — multiple parallel draft sets (too complex for v1)
- **Inline diff viewer** — field-by-field comparison in the modal (v1 shows summary, v2 shows diffs)
- **Custom roles via plugins** — the plugin system can extend the built-in 4 roles later

---

## What We CAN Delete

- **Deploy button routes** (`admin-deploy.ts`) — the entire GitHub workflow_dispatch deploy flow
- **Deploy modal UI** — replaced by Go Live modal
- **Deploy settings** — no longer need GitHub token/repo in admin
- The deploy PRD (`.planning/future/deploy-button-with-change-review.md`) — superseded by this

---

## Dependencies

- No new npm packages
- No external APIs (removed GitHub dependency)
- Builds on existing: `content_versions` table, RBAC service, sidebar badge
- D1 migration required (add column + new table)

---

## Success Criteria

1. Editing a published item does NOT change what the public sees
2. "Go Live" modal shows all pending changes with clear diffs
3. Approving promotes changes atomically
4. Rejecting preserves the live version
5. Solo admin can bypass staging when desired
6. Non-admin users always go through staging
7. Old deploy button functionality removed cleanly
