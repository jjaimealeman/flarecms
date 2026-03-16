# Phase 10: Workflow Engine Activation - Research

**Researched:** 2026-03-15
**Domain:** FlareCMS internal workflow plugin activation (codebase investigation, not external libraries)
**Confidence:** HIGH

## Summary

This phase is entirely an internal activation task -- no new libraries are needed. The workflow plugin at `packages/core/src/plugins/core-plugins/workflow-plugin/` has 7 services, 3 admin templates, API and admin routes fully written but commented out, and all 7+ DB tables already created by migration `005_stage7_workflow_automation.sql`. The tables and default seed data (6 workflow states, default workflows per collection, and 4 default transitions) are already in production.

The two blocking issues are: (1) the routes file defines its own local `Bindings`/`Variables` types instead of importing from `../app` like every other route file does, causing type incompatibility when mounting via `app.route()`; and (2) the 3 admin templates use the legacy `renderAdminLayout` instead of the current `renderAdminLayoutCatalyst` (the Catalyst theme that all other admin pages use since v1.15.0).

**Primary recommendation:** Fix the type imports in routes.ts and admin-routes.ts, migrate templates to Catalyst layout, wire routes into app.ts following the exact pattern used by other plugins (e.g., emailPlugin, otpLoginPlugin), and add "Workflow" to the Catalyst sidebar nav.

## Standard Stack

No new libraries needed. This phase uses only existing FlareCMS internals:

### Core (Already In Codebase)
| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| Hono | `packages/core` | Route framework | Active |
| Drizzle/D1 | `packages/core` | Database access | Active |
| HTMX | Admin templates | Dynamic UI interactions | Active |
| Alpine.js | Admin templates | Client-side interactivity | Active |
| Tailwind CSS | Admin templates | Styling (Catalyst theme) | Active |

### Workflow Plugin Services (Already Written)
| Service | File | Purpose | Status |
|---------|------|---------|--------|
| WorkflowEngine | `services/workflow-service.ts` | State transitions, history, assignments | Written, has `@ts-nocheck` |
| SchedulerService | `services/scheduler.ts` | Scheduled publish/unpublish/archive | **Already active in production** |
| ContentWorkflow | `services/content-workflow.ts` | Static helpers for status/action validation | Written |
| WorkflowManager | `services/content-workflow.ts` | DB-backed workflow actions with audit | Written |
| AutomationEngine | `services/automation.ts` | Rule-based automation triggers | Written, has `@ts-nocheck` |
| NotificationService | `services/notifications.ts` | In-app notification CRUD | Written, has `@ts-nocheck` |
| WebhookService | `services/webhooks.ts` | Webhook registration and delivery | Written, has `@ts-nocheck` |

## Architecture Patterns

### The Type Mismatch Problem (ROOT CAUSE)

The workflow route files (`routes.ts` and `admin-routes.ts`) define their own local types:

```typescript
// WRONG - workflow plugin routes.ts
type Bindings = {
  DB: D1Database
  KV: KVNamespace        // Wrong! App uses CACHE_KV
  MEDIA_BUCKET: R2Bucket
  // Missing: ASSETS, ENVIRONMENT, JWT_SECRET, CORS_ORIGINS, etc.
}

type Variables = {
  user: { ... }           // Missing: apiToken, requestId, startTime, etc.
}
```

Every other route file in the codebase imports from `../app`:

```typescript
// CORRECT - how every other route does it
import type { Bindings, Variables } from '../app'
const routes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
```

**Key differences between local and app types:**
- `KV` vs `CACHE_KV` -- KV binding name is wrong
- Missing `ASSETS`, `ENVIRONMENT`, `JWT_SECRET`, `CORS_ORIGINS`, `BUCKET_NAME`, `MEDIA_DOMAIN`, `GOOGLE_MAPS_API_KEY`
- `Variables.user` is required (`user: {...}`) vs optional (`user?: {...}`) in app.ts
- Missing `apiToken`, `requestId`, `startTime`, `appVersion`, `csrfToken`, `adminMenuItems` from Variables

**Fix:** Replace local type definitions with `import type { Bindings, Variables } from '../../../../app'` (relative path from plugin directory to app.ts).

### Template Migration Pattern (renderAdminLayout -> renderAdminLayoutCatalyst)

All 3 workflow templates currently use the OLD layout:

```typescript
// OLD - workflow templates
import { renderAdminLayout } from '@flare-cms/core/templates'
return renderAdminLayout({
  title: 'Workflow Dashboard - Flare CMS',
  pageTitle: 'Workflow Dashboard',
  content,
  user: data.user,
  currentPath: 'workflow'
})
```

They need to use the Catalyst layout:

```typescript
// NEW - matching every other admin page
import { renderAdminLayoutCatalyst, AdminLayoutCatalystData } from '../../../templates/layouts/admin-layout-catalyst.template'
const layoutData: AdminLayoutCatalystData = {
  title: 'Workflow Dashboard - Flare CMS',
  pageTitle: 'Workflow Dashboard',
  currentPath: 'workflow',
  user: {
    name: data.user.email,
    email: data.user.email,
    role: data.user.role
  },
  content
}
return renderAdminLayoutCatalyst(layoutData)
```

**AdminLayoutCatalystData interface shape:**
```typescript
{
  title: string
  pageTitle?: string
  currentPath?: string
  version?: string
  enableExperimentalFeatures?: boolean
  user?: { name: string; email: string; role: string }
  scripts?: string[]
  styles?: string[]
  content: string | HtmlEscapedString
  dynamicMenuItems?: Array<{ label: string; slug: string; collectionId: string; icon: string }>
}
```

### Route Registration Pattern

How other plugins register routes in `app.ts`:

```typescript
// Pattern from emailPlugin, otpLoginPlugin, etc.
if (plugin.routes && plugin.routes.length > 0) {
  for (const route of plugin.routes) {
    app.route(route.path, route.handler as any)
  }
}
```

For the workflow plugin, since routes are standalone Hono instances, register directly:

```typescript
// In app.ts
import { createWorkflowRoutes } from './plugins/core-plugins/workflow-plugin/routes'
import { createWorkflowAdminRoutes } from './plugins/core-plugins/workflow-plugin/admin-routes'

app.route('/api/workflow', createWorkflowRoutes())
app.route('/admin/workflow', createWorkflowAdminRoutes())
```

### Sidebar Navigation Addition

The Catalyst sidebar builds nav items in `admin-layout-catalyst.template.ts` around line 1130-1160. Workflow should be added between Analytics and the System section, similar to how Audit Log is added. Use the existing `icon()` function with a suitable Lucide icon (e.g., `GitBranch` is already imported in the icons module).

### Recommended Structure After Activation
```
packages/core/src/plugins/core-plugins/workflow-plugin/
  index.ts                    # Plugin definition (uncomment route registration)
  routes.ts                   # API routes - fix type imports
  admin-routes.ts             # Admin HTML routes - fix type imports
  manifest.json               # Plugin metadata (no changes needed)
  migrations.ts               # Migration SQL (already run, no changes)
  services/
    workflow-service.ts        # WorkflowEngine - remove @ts-nocheck
    content-workflow.ts        # ContentWorkflow static helpers
    scheduler.ts               # SchedulerService (already active)
    automation.ts              # AutomationEngine - remove @ts-nocheck
    notifications.ts           # NotificationService - remove @ts-nocheck
    webhooks.ts                # WebhookService - remove @ts-nocheck
  templates/
    workflow-dashboard.ts      # Migrate to Catalyst layout
    workflow-content.ts        # Migrate to Catalyst layout
    scheduled-content.ts       # Migrate to Catalyst layout
```

### Anti-Patterns to Avoid
- **Do NOT create new migrations** -- all 7+ tables exist in production already via migration 005
- **Do NOT change the content_state_machine.ts** -- the existing `VALID_TRANSITIONS` (draft/published/archived/deleted) is for the content.status field which is separate from workflow_state_id
- **Do NOT modify the Sync/staging system** -- workflow states are orthogonal to content staging revisions (see Coexistence section below)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Admin layout/sidebar | Custom HTML shell | `renderAdminLayoutCatalyst` | Consistency with all other admin pages |
| Content status validation | Custom validators | `content-state-machine.ts` | Single source of truth for status field |
| Audit logging | Custom workflow audit | `logAudit` service (v1.17.0) | Already wired into content CRUD hooks |
| Permission checking | New permission system | Existing RBAC `checkCollectionPermission` | Already covers editor/author/viewer |
| Notification bell icon | New component | Extend Catalyst layout header | Keep UI consistency |

## Common Pitfalls

### Pitfall 1: Confusing content.status with workflow_state_id
**What goes wrong:** Treating workflow states (draft/pending-review/approved/published/rejected/archived) as the same thing as content.status (draft/published/archived/deleted)
**Why it happens:** They overlap on draft/published/archived but serve different purposes
**How to avoid:** `content.status` controls API visibility and publishing. `content.workflow_state_id` tracks where content is in the approval pipeline. The WorkflowEngine already auto-updates `content.status` to `'published'` when workflow state transitions to `'published'` (line 187-192 of workflow-service.ts).
**Warning signs:** If you find yourself modifying `VALID_TRANSITIONS` in content-state-machine.ts

### Pitfall 2: Workflow vs Staging/Sync Conflict
**What goes wrong:** Unclear whether "Submit for Review" creates a pending revision or changes workflow state
**Why it happens:** Both systems deal with "content review" but at different levels
**How to avoid:** Define clear boundaries:
- **Staging/Sync** = editing published content creates a pending revision (the content itself). About the DATA being changed.
- **Workflow** = moving content through approval pipeline (the STATUS being changed). About WHO can publish.
- When a user edits published content and submits for review: creates a pending revision AND moves workflow state to "pending-review"
- When admin approves via Sync modal: promotes revision data. When admin approves via workflow: moves state to "approved"
**Warning signs:** Duplicate review UIs, confusing user experience

### Pitfall 3: The user_permissions Table Does Not Exist
**What goes wrong:** WorkflowEngine.getAvailableTransitions() queries a `user_permissions` table that was never created
**Why it happens:** The SQL references `user_permissions` but migrations created `permissions`, `role_permissions`, and `team_memberships` -- NOT `user_permissions`
**How to avoid:** Replace the `user_permissions` subquery in getAvailableTransitions() with a query against the existing `role_permissions` table, or simplify to role-based checks using the user's role from the JWT token
**Warning signs:** SQL errors when trying to transition workflow states

### Pitfall 4: @ts-nocheck Hiding Real Type Errors
**What goes wrong:** 4 of the 7 service files have `@ts-nocheck` at the top, masking actual TypeScript errors
**Why it happens:** Services were written quickly and type alignment was deferred
**How to avoid:** Remove `@ts-nocheck` one file at a time, fix the actual type issues. Most are likely `D1Database` import issues or missing type narrowing on `.first()` results
**Warning signs:** Runtime errors that TypeScript should have caught

### Pitfall 5: The notifications Table Requires a Migration Check
**What goes wrong:** NotificationService writes to `notifications` table but the template renders nothing because no notification bell exists in the Catalyst layout
**Why it happens:** Notifications table exists (created by migration 005) but the UI for showing them was never added to the Catalyst layout header
**How to avoid:** Add a notification bell/badge to the Catalyst header that queries unread notifications count. Use HTMX polling or a simple page-load check.
**Warning signs:** Notifications being created but never visible to users

### Pitfall 6: WorkflowManager References content_audit_log Table
**What goes wrong:** `WorkflowManager.performAction()` and `getWorkflowHistory()` reference a `content_audit_log` table that does not exist in migrations
**Why it happens:** The code was written with an assumed table name that was never created. The actual audit log table (from v1.17.0) is called `audit_log`
**How to avoid:** Either use `workflow_history` (which does exist) for workflow-specific audit, or use the `logAudit` service from v1.17.0 for general audit logging
**Warning signs:** SQL errors in WorkflowManager methods

## Code Examples

### Route Type Fix (routes.ts)
```typescript
// Source: codebase pattern from packages/core/src/routes/admin-sync.ts
// BEFORE (current - broken):
type Bindings = { DB: D1Database; KV: KVNamespace; ... }
type Variables = { user: { ... } }

// AFTER (fix):
import type { Bindings, Variables } from '../../../../app'
export function createWorkflowRoutes() {
  const workflowRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  // ... rest unchanged
}
```

### Template Catalyst Migration
```typescript
// Source: codebase pattern from packages/core/src/templates/pages/admin-content-list.template.ts
import { renderAdminLayoutCatalyst, AdminLayoutCatalystData } from '../../../../templates/layouts/admin-layout-catalyst.template'

export function renderWorkflowDashboard(data: WorkflowDashboardData): string {
  const content = `...` // Keep existing HTML content, update styling to Catalyst conventions

  const layoutData: AdminLayoutCatalystData = {
    title: 'Workflow Dashboard - Flare CMS',
    pageTitle: 'Workflow Dashboard',
    currentPath: 'workflow',
    user: data.user ? {
      name: data.user.email,
      email: data.user.email,
      role: data.user.role
    } : undefined,
    content
  }
  return renderAdminLayoutCatalyst(layoutData)
}
```

### Route Registration in app.ts
```typescript
// Source: codebase pattern from app.ts lines 314-330
import { createWorkflowRoutes } from './plugins/core-plugins/workflow-plugin/routes'
import { createWorkflowAdminRoutes } from './plugins/core-plugins/workflow-plugin/admin-routes'

// Register BEFORE admin/plugins to avoid route conflicts (same pattern as AI Search)
app.route('/api/workflow', createWorkflowRoutes())
app.route('/admin/workflow', createWorkflowAdminRoutes())
```

### Sidebar Nav Addition
```typescript
// Source: admin-layout-catalyst.template.ts around line 1130
// Add after analyticsItem, before systemItemsList:
const workflowItem = navLink(
  { label: 'Workflow', path: '/admin/workflow/dashboard', iconHtml: icon(GitBranch, 'h-5 w-5') },
  isActivePath('/admin/workflow')
)
```

### Fix user_permissions Query
```typescript
// Source: workflow-service.ts getAvailableTransitions
// BEFORE (references non-existent user_permissions table):
async getAvailableTransitions(workflowId: string, currentStateId: string, userId: string): Promise<WorkflowTransition[]> {
  const { results } = await this.db.prepare(`
    SELECT wt.* FROM workflow_transitions wt
    WHERE wt.workflow_id = ? AND wt.from_state_id = ?
    AND (wt.required_permission IS NULL OR
         EXISTS (SELECT 1 FROM user_permissions up
                 WHERE up.user_id = ? AND up.permission = wt.required_permission))
  `).bind(workflowId, currentStateId, userId).all()

// AFTER (use role_permissions with user's role):
async getAvailableTransitions(workflowId: string, currentStateId: string, userRole: string): Promise<WorkflowTransition[]> {
  const { results } = await this.db.prepare(`
    SELECT wt.* FROM workflow_transitions wt
    WHERE wt.workflow_id = ? AND wt.from_state_id = ?
    AND (wt.required_permission IS NULL
         OR ? = 'admin'
         OR EXISTS (SELECT 1 FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE rp.role = ? AND p.name = wt.required_permission))
  `).bind(workflowId, currentStateId, userRole, userRole).all()
```

## Coexistence: Workflow vs Staging/Sync

This is the critical architectural question. Here is how the two systems relate:

| System | Purpose | Trigger | Data Changed |
|--------|---------|---------|--------------|
| Staging/Sync (v1.16.0) | Protects published content from accidental edits | User saves changes to published content | `content_versions` table (pending revision) |
| Workflow Engine | Controls who can move content through approval pipeline | User clicks "Submit for Review" / "Approve" / "Publish" | `content_workflow_status` + `workflow_history` tables |

**Decision needed by planner:** Whether the workflow "Approved" state automatically triggers the Sync "approve all revisions" flow, or whether they remain independent actions.

**Recommended approach:** Keep them independent for v1 activation:
- Workflow manages state transitions (who can publish)
- Staging manages data integrity (what changes go live)
- They coexist via the `content.workflow_state_id` column (workflow) and `content_versions` table (staging)
- A content item can be "Approved" (workflow) but still have pending revisions (staging) if its data was edited after approval

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `renderAdminLayout` (v2 layout) | `renderAdminLayoutCatalyst` | v1.15.0 (Admin UI Overhaul) | All 3 workflow templates need migration |
| Local Bindings/Variables types | Import from `../app` | Always was the standard | Routes need type fix |
| `content_audit_log` (assumed) | `audit_log` + `logAudit` service | v1.17.0 | WorkflowManager references wrong table |

**Deprecated/outdated:**
- `renderAdminLayout`: Still exported for backward compatibility but NOT used by any Catalyst-themed page
- Local type definitions in route files: Every other route imports from `app.ts`

## Open Questions

1. **Workflow-Sync Integration Depth**
   - What we know: Both systems exist and operate on different tables/concepts
   - What's unclear: Should "Approve" in workflow automatically approve pending staging revisions?
   - Recommendation: Keep independent for v1 activation, integrate in a future phase

2. **Notification Bell UI**
   - What we know: `notifications` table exists, `NotificationService` can create notifications, no UI exists
   - What's unclear: Should the notification bell be added to the Catalyst header in this phase or deferred?
   - Recommendation: Add a basic notification indicator (badge count) to the Catalyst header as part of this phase, since the workflow creates notifications on transitions

3. **Plugin Registration vs Direct Route Mounting**
   - What we know: index.ts uses PluginBuilder but routes are commented out there too
   - What's unclear: Should routes go through the plugin system or be mounted directly in app.ts?
   - Recommendation: Mount directly in app.ts (same pattern as emailPlugin, cache, otpLoginPlugin) since the PluginBuilder route registration has its own type alignment issues

4. **@ts-nocheck Removal Scope**
   - What we know: 4 service files have `@ts-nocheck`
   - What's unclear: How many actual type errors exist under the suppression
   - Recommendation: Remove `@ts-nocheck` and fix type errors as part of activation, since these will surface as runtime bugs anyway

## Sources

### Primary (HIGH confidence)
- `packages/core/src/app.ts` -- Bindings/Variables interfaces, route registration patterns (lines 63-147, 284-335)
- `packages/core/src/plugins/core-plugins/workflow-plugin/` -- All plugin source files read in full
- `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts` -- AdminLayoutCatalystData interface (line 172-192), sidebar nav structure (line 1130-1160)
- `packages/core/src/services/content-state-machine.ts` -- VALID_TRANSITIONS map
- `packages/core/src/services/revisions.ts` -- Staging/revision system
- `packages/core/src/db/migrations-bundle.ts` -- Migration 005 confirming all tables and seed data exist

### Notes
- No external research needed -- this is entirely an internal codebase activation task
- All findings come from direct source code reading at HIGH confidence

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All code exists in the repository, read directly
- Architecture: HIGH - Type mismatch root cause identified by comparing with working routes
- Pitfalls: HIGH - Discovered by reading actual SQL queries against actual table schemas
- Coexistence: MEDIUM - Architecture recommendation is sound but integration depth is a design decision

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable -- internal codebase, no external dependencies)
