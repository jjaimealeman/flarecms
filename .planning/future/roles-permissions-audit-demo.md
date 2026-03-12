# Roles, Permissions, Audit Logging & Live Demo

## Overview

Three related features that build on each other: a roles/permissions system,
audit logging for accountability, and a public live demo with OTP access.

---

## 1. Roles & Permissions (CORE)

This is a core feature — every CMS needs it. Not a plugin.

### Built-in Roles

| Role | Description |
|------|-------------|
| `admin` | Full access to everything (existing) |
| `editor` | CRUD on content + media, no system settings |
| `viewer` | Read-only access to admin panel |
| `demo` | Read-only + CRUD on sandbox collection only |

### Implementation

- New `roles` table: `id, name, permissions (JSON)`
- Add `role_id` column to `users` table (default: `admin` for backwards compat)
- Middleware checks role permissions before every mutation
- Admin UI hides/disables buttons based on role (no edit button for viewers)
- Permissions are resource-level: `content:read`, `content:create`, `content:update`, `content:delete`, `media:*`, `users:*`, `settings:*`, `collections:*`

### Why Core (not plugin)

- Every multi-user CMS needs this
- Middleware integration is too deep for a plugin boundary
- UI changes span every admin template
- The demo system, client sites, and team workflows all depend on it

---

## 2. Audit Logging (CORE)

Core feature — essential for security, compliance, and accountability.

### Schema

```sql
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL
);
```

### What Gets Logged

- All CRUD operations on content, media, users, collections
- Login/logout events (with IP)
- Settings changes
- Deploy triggers
- Failed auth attempts

### Use Cases

- Owner accountability: "Who changed the pricing on Product X?"
- Security: Track suspicious activity from demo users or compromised accounts
- Compliance: Audit trail for regulated industries
- Debugging: Trace what happened before a bug report

### Admin UI

- `/admin/audit-log` — filterable table (by user, action, resource, date range)
- Content edit page shows recent changes ("Last edited by X, 2 hours ago")

### Why Core (not plugin)

- Needs hooks into every mutation path
- Security feature — cannot be optional
- Required for the demo system to track abuse

---

## 3. Live Demo System (PLUGIN)

This CAN be a plugin — it is an optional feature that uses core roles + audit logging.

### Flow

1. User visits `flarecms.dev/demo`
2. Landing page explains what they will see + email disclaimer
3. User enters email, OTP plugin sends code, user logs in
4. Auto-assigned `demo` role
5. Can browse all admin pages (read-only)
6. Can full CRUD on `demo-sandbox` collection
7. Session expires after 30 minutes
8. Cron resets sandbox data every 6 hours

### Email Capture

- Stored in a `demo_signups` table: `email, ip_address, created_at`
- Used to track demo popularity and for future marketing (with consent)
- Transparent disclaimer on the demo page

### Sandbox Safeguards

- Demo role middleware: block all mutations except on `demo-sandbox`
- File uploads: images only, max 2MB, sanitized filenames
- Rate limit: max 50 operations per session
- Content input sanitized (already handled by Hono middleware)
- Audit log captures every action with IP for abuse paper trail

### Cron Reset (Cloudflare Workers Cron Triggers)

```toml
[triggers]
crons = ["0 */6 * * *"]
```

The scheduled handler deletes sandbox content and re-seeds with clean demo data.

### Why Plugin (not core)

- Not every Flare CMS installation needs a public demo
- The OTP + sandbox + cron are specific to this use case
- Core provides the foundation (roles, audit log), plugin builds on it

---

## Dependency Chain

```
Roles and Permissions (core)
    |
    v
Audit Logging (core)
    |
    v
Live Demo Plugin (plugin) — uses roles + audit + OTP plugin
```

## Priority

This is a prerequisite for:
- The public demo at flarecms.dev/demo
- 915website.com client deployments (multi-user with accountability)
- The workflow engine (which also needs roles for approval chains)
