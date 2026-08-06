# EmDash CMS Research — What It Means for FlareCMS

**Date:** April 2, 2026
**Author:** Jaime + Claude (research session)

**Sources:**
- Blog post: https://blog.cloudflare.com/emdash-wordpress/
- GitHub repo: https://github.com/emdash-cms/emdash (MIT, 2,270+ stars day one)

---

## What Is EmDash?

Cloudflare shipped a full open-source CMS built on **Astro 6 + Cloudflare Workers**, positioned as a WordPress successor. MIT licensed. Built in 2 months using AI coding agents. v0.1.0 preview.

**Same DNA as FlareCMS:** Astro, Workers, D1, R2, TypeScript, serverless-first.

---

## Architecture Comparison

| Aspect | FlareCMS (ours) | EmDash (Cloudflare) |
|---|---|---|
| **Framework** | Hono + Astro 5 | Astro 6 (native integration) |
| **Database** | D1 + Drizzle ORM | D1 + Kysely (also Turso, Postgres) |
| **Content Model** | JSON schema objects (`CollectionConfig`) | Dynamic SQL tables (`ec_*`) via admin UI |
| **Rich Text** | Quill (HTML output) | TipTap → Portable Text (structured JSON) |
| **Admin UI** | Server-rendered HTML (Hono templates) | React 18 (TanStack, dnd-kit, Kumo) |
| **Plugin Isolation** | None — plugins get full db/kv/r2 access | Dynamic Workers sandboxing with capability grants |
| **Plugin SDK** | `PluginBuilder` fluent API | `definePlugin()` with manifest |
| **Auth** | JWT + PBKDF2 + OTP | Passkeys + OAuth (GitHub, Google) |
| **WP Migration** | None | WXR import + REST API + Gutenberg→Portable Text |
| **MCP Server** | None built-in | Built-in (content, schema, media, search) |
| **Tests** | 1,200+ Vitest | Unknown (just shipped) |
| **License** | Private | MIT |
| **Maturity** | Production (v2.0, deployed, Lighthouse 97-100) | Preview (v0.1.0) |

---

## What FlareCMS Should Steal

### 1. Plugin Sandboxing (HIGH VALUE)

Current FlareCMS plugins get raw D1/KV/R2 access. EmDash's capability model is superior:

```typescript
// EmDash: plugin declares what it needs
capabilities: ["read:content", "email:send"]
// Runtime ONLY provides those APIs — everything else is null

// FlareCMS today: plugin gets everything
context.db    // full D1 access — dangerous
```

**Action:** Refactor `PluginContext` to gate access based on a `capabilities` array in plugin manifest. Don't need Dynamic Workers — just conditional property injection in `plugin-bootstrap.ts`.

### 2. WordPress Migration (MONEY MAKER — $799 service)

EmDash has two components to adapt:

- **`@emdash-cms/gutenberg-to-portable-text`** — converts WP block content to structured JSON
- **WXR import source** — parses WordPress XML exports (posts, media, taxonomies, custom fields)
- **WordPress REST API source** — connects to live WP site via `/wp-json/`

**Action:** Build a `jja-wp-migrate` skill or FlareCMS plugin:
1. Client exports WP site (WXR file or REST API connect)
2. Posts/pages → FlareCMS collections
3. Media → R2 bucket
4. Taxonomies → tags/categories fields
5. Theme → scaffold/Stitch design → Astro frontend

### 3. Portable Text Instead of HTML (STRATEGIC — NOT URGENT)

EmDash stores rich text as Portable Text (structured JSON) instead of HTML. Benefits:
- Queryable (find all posts with image blocks)
- Multi-target rendering (HTML, email, PDF, native)
- Transformable (add a class to all headings in one query)

**Action:** Future consideration for multi-channel output. Not a blocker now.

### 4. Passkey Auth (MODERNIZE)

EmDash ships WebAuthn passkey auth. Non-technical clients would love "just use your fingerprint."

**Action:** Add as optional auth method alongside existing JWT. Don't replace — augment.

### 5. MCP Server for FlareCMS (AI-NATIVE)

EmDash ships an MCP server for AI agents to manage content, upload media, manage collections.

**Action:** Build `@flare-cms/mcp` package. Manage all client sites via Claude Code.

### 6. Skills for Migration & Plugin Development

EmDash ships 7 Claude Code skills. FlareCMS should have:
- **`jja-flarecms`** — reference skill for FlareCMS development
- **`jja-wp-migrate`** — WordPress → FlareCMS migration pipeline
- **`jja-flarecms-plugin`** — guide for creating FlareCMS plugins

---

## What FlareCMS Already Does Better

| FlareCMS Advantage | Why |
|---|---|
| **Production-proven** | Deployed, 1,200+ tests, Lighthouse 97-100 |
| **Content workflows** | Draft → Review → Approved → Published state machine |
| **Privacy analytics** | Built-in, cookie-free, GDPR-compliant |
| **API tokens** | Scoped, expirable, usage-tracked |
| **Audit logging** | 4 tables of audit trail |
| **CI/CD pipeline** | GitHub Actions → Workers + Pages automated |
| **Scheduled publishing** | Cron-based, built into Worker |

---

## EmDash Plugin Architecture (Reference)

### Capability Types
```typescript
type PluginCapability =
  | "network:fetch"        // Outbound HTTP (with allowedHosts)
  | "network:fetch:any"    // Unrestricted outbound
  | "read:content"         // Content read access
  | "write:content"        // Content write access
  | "read:media"           // Media read access
  | "write:media"          // Media write/upload
  | "read:users"           // User data access
  | "email:send"           // Send emails
  | "email:provide"        // Be the email provider (exclusive)
  | "page:inject"          // Inject scripts/styles
// Storage + KV always available (auto-scoped to plugin)
```

### Plugin Definition Pattern
```typescript
export default definePlugin({
  id: "my-plugin",
  version: "1.0.0",
  capabilities: ["read:content", "email:send"],
  hooks: {
    "content:afterSave": {
      priority: 10,
      timeout: 5000,
      handler: async (event, ctx) => { /* ... */ }
    }
  },
  routes: {
    "webhooks/status": {
      public: true,
      handler: async (ctx) => ({ ok: true })
    }
  },
  admin: {
    pages: [{ path: "/", label: "Dashboard", icon: "chart" }],
    settingsSchema: { apiKey: { type: "secret", label: "API Key" } }
  }
})
```

### Plugin Context (Capability-Gated)
```typescript
interface PluginContext {
  plugin: { id, version }
  storage: PluginStorage      // Always available, scoped to plugin
  kv: KVAccess                // Always available, scoped to plugin
  content?: ContentAccess     // Only if read:content or write:content
  media?: MediaAccess         // Only if read:media or write:media
  http?: HttpAccess           // Only if network:fetch (with allowedHosts)
  users?: UserAccess          // Only if read:users
  email?: EmailAccess         // Only if email:send
  log: LogAccess              // Always available
  cron?: CronAccess           // Task scheduling
}
```

---

## The 915website.com WordPress Migration Play

```
Client: "I'm stuck on WordPress, it's slow, I keep getting hacked"
Jaime: "$799, 1-2 weeks. Here's what happens:"

1. Export WP site (WXR file or REST API connect)
2. Migration script → posts/pages/media → FlareCMS D1/R2
3. Design new frontend via Stitch/scaffold → Astro
4. Deploy to Cloudflare Workers ($0 hosting)
5. Hand over admin + training session

Result: $20/mo shared hosting + security anxiety
     → $0/mo Cloudflare Workers + edge-fast + unhackable
```

---

## Priority Actions

1. **Study EmDash's plugin types** (`packages/core/src/plugins/types.ts`) — 422 lines of capability-based security patterns
2. **Study WP migration** (`packages/gutenberg-to-portable-text/` + `packages/core/src/import/sources/wxr.ts`)
3. **Build `jja-wp-migrate` skill** for 915website.com client migrations
4. **Refactor FlareCMS plugin context** to add capability gating
5. **Build `@flare-cms/mcp`** for AI-native content management

---

## Key EmDash Files to Reference

| File | Purpose |
|---|---|
| `packages/core/src/plugins/types.ts` | Plugin type definitions (422 lines) |
| `packages/core/src/plugins/define-plugin.ts` | Plugin validation & normalization |
| `packages/core/src/plugins/manager.ts` | Plugin lifecycle + hook dispatch |
| `packages/core/src/database/types.ts` | Core DB schema |
| `packages/core/src/schema/registry.ts` | Dynamic collection management |
| `packages/auth/src/passkey/` | WebAuthn implementation |
| `packages/cloudflare/src/sandbox/bridge.ts` | RPC bridge for sandboxed plugins |
| `packages/core/src/import/sources/wxr.ts` | WordPress WXR import |
| `packages/gutenberg-to-portable-text/src/` | Gutenberg → Portable Text |
| `packages/core/src/mcp/server.ts` | MCP server |
| `skills/creating-plugins/SKILL.md` | Plugin dev guide |
| `skills/wordpress-theme-to-emdash/SKILL.md` | WP theme porting |
