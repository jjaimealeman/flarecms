# Phase 2: Content Workflow - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Editors can manage the full content lifecycle — create, publish, unpublish, schedule, and query — without workarounds. Access is scoped by role at the collection level. API tokens enable read-only frontend access. Audit trail captures workflow history.

New capabilities like comments, content locking, or field-level permissions are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Content State Machine
- Statuses: draft, published, archived (three states)
- Transitions are bidirectional: published content can revert to draft (unpublish)
- Archived state for retired content that shouldn't be deleted but is no longer live
- Unpublishing reverts to draft (no separate "unpublished" state)
- Scheduled dates are cleared when content is unpublished (clean slate)
- Slug is locked after first publish to prevent broken links

### RBAC Role Design
- Four roles: admin, editor, author, viewer
- Admin: full access (users, collections, schemas, settings)
- Editor: create/edit content in assigned collections, no schema/user management
- Author: create/edit only their own content in assigned collections
- Viewer: read-only API access
- Collection-level permissions: each editor/author is assigned specific collections
- Only admins create user accounts and assign roles
- Users can update their own password/email
- Unauthorized actions: UI hides elements the user's role doesn't allow (no greyed-out buttons)

### Audit Trail
- Captures: status changes AND content edits (who edited, when)
- Stores old + new values for field changes (enables detailed review)
- Visible in admin UI on each content item's detail page
- Retention: keep forever (D1 storage is cheap)

### API Tokens
- Per-collection read-only scoping (token grants read access to specific collections)
- Optional expiration (creator can set expiry or leave permanent)
- Managed via admin UI (create/revoke from dashboard)
- Token value shown once at creation, then only prefix displayed (GitHub-style)
- Tokens stored as hashed values in D1

### Claude's Discretion
- Exact state transition validation rules and error messages
- Audit trail table schema and indexing strategy
- API token format and hashing algorithm
- Slug uniqueness enforcement mechanism (DB constraint vs application-level)
- Content versioning modal fix approach (UI bug #666)
- Workers scheduled trigger implementation for content scheduling

</decisions>

<specifics>
## Specific Ideas

- Per-client single-tenant deployment means RBAC doesn't need org/tenant isolation — each deployment is one client
- The Astro frontend (`my-astro-site`) is the primary consumer of read-only API tokens
- Existing `workflow_history` table from Phase 1 cherry-picks may already exist — researcher should check current schema

</specifics>

<deferred>
## Deferred Ideas

- Field-level permissions (AUTH-03) — deferred to v2 per project decisions
- Content locking (prevent simultaneous edits) — future phase
- Approval workflows with notifications — future phase
- API token rate limiting — could be added in Phase 4 or 5

</deferred>

---

*Phase: 02-content-workflow*
*Context gathered: 2026-03-01*
