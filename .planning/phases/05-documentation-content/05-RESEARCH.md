# Phase 5: Documentation Content - Research

**Researched:** 2026-03-08
**Domain:** CMS documentation authoring, seed scripting, markdown content pipeline
**Confidence:** HIGH

## Summary

This phase is about authoring all 8 documentation sections with substantive technical content, building a reproducible seed script that pushes content through the CMS API, and creating a prompt generator for LLM-assisted content creation. The phase is fundamentally a content engineering and tooling task, not a frontend or infrastructure task.

The existing infrastructure is fully in place: CMS collections for `docs` and `docs-sections` already exist, the Astro site renders markdown with syntax highlighting (rehype-pretty-code + Shiki), callouts (rehype-callouts with GitHub theme), tab groups, and table of contents. The docs layout with sidebar navigation, breadcrumbs, and prev/next are all implemented. This phase fills those containers with content.

The primary technical challenge is accuracy: every code example must reflect the actual FlareCMS API surface, which was fully investigated during this research. The seed script must authenticate with the CMS, create sections, then create pages with correct `section` references (foreign key IDs). The `content` field uses the `mdxeditor` type, which stores raw markdown strings.

**Primary recommendation:** Structure content as markdown files in `content/docs/` organized by section, build a TypeScript seed script that authenticates via `/auth/login`, reads the files, and POSTs them to the CMS API in the correct order (sections first, then pages).

## Standard Stack

### Core (already in place - no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Astro | 5.x | Site framework (SSR on Cloudflare Pages) | Already used |
| rehype-pretty-code | latest | Syntax highlighting in docs | Already configured |
| rehype-callouts | latest | Callout/admonition blocks | Already configured, GitHub theme |
| Shiki | latest (JS engine) | Code highlighting engine | Already configured, no WASM |

### Seed Script Tooling (new)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | latest | Run TypeScript seed script directly | `npx tsx scripts/seed-docs.ts` |
| gray-matter | 4.x | Parse frontmatter from markdown files | Seed script reads .md files |
| glob | latest | Find markdown files by pattern | Seed script file discovery |

### Prompt Generator (new)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | latest | Run TypeScript prompt generator | `npx tsx scripts/generate-prompt.ts` |

**Installation:**
```bash
pnpm add -D gray-matter glob tsx --filter @flare-cms/cms
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| gray-matter | Manual regex parsing | gray-matter handles edge cases, well-tested |
| tsx | ts-node | tsx is faster, zero-config |
| glob | fast-glob | glob is simpler, sufficient for this use case |

## Architecture Patterns

### Recommended Content Directory Structure
```
packages/cms/
  content/
    docs/
      getting-started/
        _section.md          # Section metadata (frontmatter only)
        quickstart.md
        installation.md
        project-structure.md
      core-concepts/
        _section.md
        architecture.md
        collections.md
        content-workflow.md
        media.md
      api-reference/
        _section.md
        rest-endpoints.md
        filtering.md
        authentication.md
        api-tokens.md
      admin/
        _section.md
        dashboard.md
        content-management.md
        collection-builder.md
        media-library.md
        plugins.md
      security/
        _section.md
        auth-system.md
        rate-limiting.md
        csrf-cors.md
        security-headers.md
      plugins/
        _section.md
        plugin-system.md
        core-plugins.md
        building-plugins.md
      deployment/
        _section.md
        cloudflare-workers.md
        d1-database.md
        r2-storage.md
        wrangler-config.md
        ci-cd.md
      configuration/
        _section.md
        environment-variables.md
        bindings.md
        settings.md
  scripts/
    seed-docs.ts             # Seed script
    generate-prompt.ts       # Prompt generator
```

### Pattern 1: Markdown File with Frontmatter
**What:** Each doc page is a markdown file with YAML frontmatter containing metadata.
**When to use:** Every documentation page.
**Example:**
```markdown
---
title: Quickstart
slug: quickstart
excerpt: Get a Flare CMS instance running in under 5 minutes
section: getting-started
order: 1
status: published
---

# Quickstart

Get your first Flare CMS instance running in under 5 minutes.

## Prerequisites

You'll need these installed:
- Node.js 18+
- pnpm
- Wrangler CLI (`npm install -g wrangler`)
```

### Pattern 2: Section Metadata File
**What:** `_section.md` files define section-level metadata (name, slug, description, order).
**When to use:** One per section directory.
**Example:**
```markdown
---
name: Getting Started
slug: getting-started
description: Everything you need to get Flare CMS up and running
order: 1
---
```

### Pattern 3: Seed Script Authentication Flow
**What:** The seed script authenticates via the CMS login endpoint to get a JWT, then uses Bearer auth for all write operations.
**When to use:** The seed script.
**Example:**
```typescript
// Authenticate with CMS
async function authenticate(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      email: process.env.FLARE_ADMIN_EMAIL || 'jjaimealeman@gmail.com',
      password: process.env.FLARE_ADMIN_PASSWORD || '',
    }),
    redirect: 'manual', // Don't follow redirect, capture the cookie
  })

  // The auth system sets a JWT cookie named 'token'
  const cookies = res.headers.getSetCookie?.() || []
  const tokenCookie = cookies.find(c => c.startsWith('token='))
  if (!tokenCookie) throw new Error('Login failed - no token cookie')
  const token = tokenCookie.split('=')[1].split(';')[0]
  return token
}
```

### Pattern 4: Seed Script Create Order
**What:** Sections must be created before pages (pages have a `section` FK reference to section ID).
**When to use:** Seed script execution.
**Example flow:**
```
1. Authenticate -> get JWT
2. Delete all existing docs content (wipe & reseed for idempotency)
3. Delete all existing docs-sections
4. Create sections from _section.md files -> capture returned IDs
5. Create pages with section IDs from step 4
6. Verify all content is published and navigable
```

### Pattern 5: Callout Syntax for Known Bugs
**What:** Use GitHub-style callout syntax for warnings, notes, cautions.
**When to use:** Known bugs, important notes, tips.
**Example:**
```markdown
> [!WARNING]
> **Known issue:** API filters are currently broken. Filter results client-side instead.
> See [GitHub issue #XX] for status.

> [!NOTE]
> API tokens are read-only. You'll need user credentials (JWT) for write operations.

> [!TIP]
> Use `pnpm` as your package manager - it's what Flare CMS uses internally.
```

### Pattern 6: Tab Groups for Code Examples
**What:** The markdown pipeline supports tab groups for showing alternative code.
**When to use:** Package manager commands, language alternatives.
**Example:**
````markdown
```bash tab="pnpm"
pnpm install @flare-cms/core
```

```bash tab="npm"
npm install @flare-cms/core
```

```bash tab="yarn"
yarn add @flare-cms/core
```
````

### Anti-Patterns to Avoid
- **Aspirational documentation:** Never document features that don't exist. Every code example must be verified against the actual codebase.
- **Broken filter examples:** The API filter system has a known bug. Do NOT show filter query parameters as working examples. Document the workaround (client-side filtering).
- **Assuming collection_id:** API endpoints use collection *name* in the URL path (`/api/collections/blog-posts/content`), not collection ID. The ID is only used in the POST body for content creation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frontmatter parsing | Regex to extract YAML | gray-matter | Handles edge cases, multiline values, nested objects |
| Markdown to HTML | Custom parser | Existing `renderMarkdown()` in `packages/site/src/lib/markdown.ts` | Already configured with Shiki, callouts, tab groups |
| API client for seed script | Fetch wrapper library | Plain `fetch()` with helpers | The CMS API is simple REST, no need for abstraction |
| Slug generation | Custom slug function | CMS auto-generates slugs from title if not provided | Let the CMS handle it, or provide explicit slugs in frontmatter |

**Key insight:** The entire rendering pipeline already exists. This phase only needs to create markdown content files and a script to push them to the CMS. No frontend work is needed.

## Common Pitfalls

### Pitfall 1: Section Reference IDs
**What goes wrong:** Creating doc pages with section *slug* instead of section *ID* in the `section` field.
**Why it happens:** The `section` field in the docs collection is a `reference` type pointing to `docs-sections`. The CMS stores the referenced record's UUID, not its slug.
**How to avoid:** After creating each section via the API, capture the returned `id` from the response and use that when creating pages.
**Warning signs:** Pages render but show no section association; sidebar grouping breaks.

### Pitfall 2: Content Field is Raw Markdown String
**What goes wrong:** Sending HTML or structured data in the `content` field.
**Why it happens:** The field type is `mdxeditor` which might suggest structured content, but it stores plain markdown strings.
**How to avoid:** The seed script should read `.md` file content (after stripping frontmatter) and send it as a raw string in the `data.content` field.
**Warning signs:** Content renders with HTML entities, double-escaped characters.

### Pitfall 3: Status Default is Draft
**What goes wrong:** Seeded content doesn't appear on the site.
**Why it happens:** The default status is `draft`. The site client (`flare.ts`) filters for `status === 'published'`.
**How to avoid:** Always set `status: 'published'` when creating content via the seed script.
**Warning signs:** API returns content but site shows empty docs.

### Pitfall 4: Windows-style Line Endings
**What goes wrong:** Code blocks break or meta string parsing fails.
**Why it happens:** CMS stores `\r\n` which breaks rehype-pretty-code meta string parsing.
**How to avoid:** The `renderMarkdown()` function already strips `\r\n` to `\n`. But when sending content via the seed script, normalize line endings before POSTing.
**Warning signs:** Tab groups or syntax highlighting breaks on specific code blocks.

### Pitfall 5: Auth Endpoint is Form-Encoded, Not JSON
**What goes wrong:** Seed script auth call returns 400 or HTML error page.
**Why it happens:** The `/auth/login` POST endpoint expects `application/x-www-form-urlencoded`, not JSON. It's an HTML form handler that sets a cookie.
**How to avoid:** Use `URLSearchParams` for the login body and handle redirect manually.
**Warning signs:** Login returns HTML instead of JSON; no token in response.

### Pitfall 6: Wipe Order for Idempotency
**What goes wrong:** Foreign key constraint errors when deleting sections before pages.
**Why it happens:** Pages reference sections via FK. D1/SQLite may enforce constraints.
**How to avoid:** Delete pages first, then sections. Or use the content API which does hard deletes.
**Warning signs:** 500 errors during re-seed with "FOREIGN KEY constraint" messages.

### Pitfall 7: API Token vs JWT Auth
**What goes wrong:** Trying to create content with an API token.
**Why it happens:** API tokens are read-only by design. The middleware explicitly blocks POST/PUT/DELETE for API token auth.
**How to avoid:** The seed script must use JWT auth (login with email/password), not an API token.
**Warning signs:** 403 "API tokens are read-only" error.

## Code Examples

### CMS API: Create a Section
```typescript
// POST /api/content
// Requires JWT Bearer token
const response = await fetch(`${baseUrl}/api/content`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': `token=${jwt}`,
  },
  body: JSON.stringify({
    collectionId: docsSecionsCollectionId,  // UUID from /api/collections
    title: 'Getting Started',
    slug: 'getting-started',
    status: 'published',
    data: {
      name: 'Getting Started',
      slug: 'getting-started',
      description: 'Everything you need to get Flare CMS up and running',
      order: 1,
    },
  }),
})
const { data } = await response.json()
// data.id is the section UUID to reference in pages
```

### CMS API: Create a Doc Page
```typescript
// POST /api/content
const response = await fetch(`${baseUrl}/api/content`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': `token=${jwt}`,
  },
  body: JSON.stringify({
    collectionId: docsCollectionId,  // UUID of the 'docs' collection
    title: 'Quickstart',
    slug: 'quickstart',
    status: 'published',
    data: {
      title: 'Quickstart',
      slug: 'quickstart',
      excerpt: 'Get a Flare CMS instance running in under 5 minutes',
      content: markdownContent,  // Raw markdown string
      section: sectionId,        // UUID from creating the section
      order: 1,
      status: 'published',
      lastUpdated: new Date().toISOString(),
    },
  }),
})
```

### CMS API: List All Collections (to get collection IDs)
```typescript
// GET /api/collections
const response = await fetch(`${baseUrl}/api/collections`)
const { data } = await response.json()
// data is array of { id, name, display_name, schema, is_active }
const docsCollection = data.find((c: any) => c.name === 'docs')
const docsSectionsCollection = data.find((c: any) => c.name === 'docs-sections')
```

### CMS API: Delete All Content in a Collection
```typescript
// First, list all content in the collection
const listRes = await fetch(
  `${baseUrl}/api/collections/docs/content?limit=1000`,
  { headers: { 'Cookie': `token=${jwt}` } }
)
const { data: items } = await listRes.json()

// Then delete each item
for (const item of items) {
  await fetch(`${baseUrl}/api/content/${item.id}`, {
    method: 'DELETE',
    headers: { 'Cookie': `token=${jwt}` },
  })
}
```

### Prompt Generator Structure
```typescript
// scripts/generate-prompt.ts
// Reads collection schemas from the CMS API and generates a PROMPT.md

async function generatePrompt(baseUrl: string) {
  const { data: collections } = await fetch(`${baseUrl}/api/collections`).then(r => r.json())

  let prompt = `# Flare CMS Content Generation Prompt\n\n`
  prompt += `## Available Collections\n\n`

  for (const collection of collections) {
    const schema = collection.schema
    prompt += `### ${collection.display_name} (\`${collection.name}\`)\n\n`
    prompt += `Fields:\n`
    for (const [fieldName, fieldConfig] of Object.entries(schema.properties || {})) {
      const fc = fieldConfig as any
      prompt += `- **${fieldName}** (${fc.type})${fc.required ? ' *required*' : ''}: ${fc.title || ''}\n`
    }
    prompt += `\n`
  }

  prompt += `## API Endpoints\n\n`
  prompt += `- \`GET /api/collections\` - List all collections\n`
  prompt += `- \`GET /api/collections/{name}/content\` - List content in collection\n`
  prompt += `- \`POST /api/content\` - Create content (requires JWT auth)\n`
  prompt += `- \`PUT /api/content/{id}\` - Update content (requires JWT auth)\n`
  prompt += `- \`DELETE /api/content/{id}\` - Delete content (requires JWT auth)\n`

  return prompt
}
```

## Full API Surface to Document

### Public API Endpoints (DOCS-03: API Reference)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/` | None | OpenAPI 3.0 specification |
| GET | `/api/health` | None | Basic health check |
| GET | `/api/collections` | None/API Key | List all active collections |
| GET | `/api/collections/:collection/content` | None/API Key | List content in collection (with filtering) |
| GET | `/api/content` | None/API Key | List all content (with filtering) |
| GET | `/api/content/check-slug` | None | Check slug availability |
| GET | `/api/content/:id` | None/API Key | Get content by ID |
| POST | `/api/content` | JWT | Create content |
| PUT | `/api/content/:id` | JWT | Update content |
| DELETE | `/api/content/:id` | JWT | Delete content |
| GET | `/api/media` | JWT | List media files |
| POST | `/api/media/upload` | JWT | Upload single file |
| POST | `/api/media/upload-multiple` | JWT | Upload multiple files |
| POST | `/api/media/bulk-delete` | JWT | Bulk delete files |
| POST | `/api/media/bulk-move` | JWT | Move files to folder |
| POST | `/api/media/create-folder` | JWT | Create virtual folder |
| DELETE | `/api/media/:id` | JWT | Delete single file |
| PATCH | `/api/media/:id` | JWT | Update file metadata |

### System API Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/system/health` | None | Detailed health (DB, KV, R2 status) |
| GET | `/api/system/info` | None | System info and features |
| GET | `/api/system/stats` | None | Content, media, user stats |
| GET | `/api/system/ping` | None | DB ping with latency |
| GET | `/api/system/env` | None | Environment feature flags |

### Auth Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/auth/login` | None | Login page (HTML) |
| POST | `/auth/login` | None | Login (form-encoded) |
| GET | `/auth/register` | None | Registration page (HTML) |
| POST | `/auth/register` | None | Register (form-encoded) |
| GET/POST | `/auth/logout` | JWT | Logout |
| GET | `/auth/me` | JWT | Current user info |
| POST | `/auth/change-password` | JWT | Change password |

### Query Parameters for Content Endpoints
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Max items (default 50, max 1000) |
| `offset` | integer | Skip N items |
| `status` | string | Filter: draft, published, archived |
| `collection` | string | Filter by collection name (on `/api/content`) |
| `sort` | string | Sort field (prefix `-` for descending) |
| `filter[field][operator]` | string | Advanced filtering (KNOWN BUG - unreliable) |

### Response Envelope
```json
{
  "data": [...],
  "meta": {
    "count": 10,
    "timestamp": "2026-03-08T00:00:00.000Z",
    "cache": { "hit": false, "source": "database" },
    "timing": { "total": 45, "execution": 30, "unit": "ms" }
  }
}
```

## Content Topics by Section

### DOCS-01: Getting Started
1. **Quickstart** - Clone, install, configure, run locally (5 min)
2. **Installation** - Detailed prerequisites, pnpm workspaces, Cloudflare setup
3. **Project Structure** - Monorepo layout, package roles, key files

### DOCS-02: Core Concepts
1. **Architecture** - Cloudflare Workers, Hono, D1, R2, KV bindings, edge-first design
2. **Collections** - Schema definition, field types (34 types!), CollectionConfig, auto-sync
3. **Content Workflow** - Status state machine (draft -> published -> archived), slug locking, versioning
4. **Media** - R2 storage, upload pipeline, image dimensions, virtual folders

### DOCS-03: API Reference
1. **REST Endpoints** - Complete endpoint table, request/response examples
2. **Filtering & Pagination** - Query params, limit/offset, sort (with known bug callout)
3. **Authentication** - JWT auth flow, login/register, cookie-based auth
4. **API Tokens** - Read-only tokens, collection scoping, X-API-Key header

### DOCS-04: Admin
1. **Dashboard** - Overview, quick stats
2. **Content Management** - CRUD, rich editors (Quill, MDX), status transitions
3. **Collection Builder** - UI-based schema creation, field types, managed vs dynamic
4. **Media Library** - Upload, bulk ops, folders, metadata editing
5. **Plugins** - Plugin management UI, activation/deactivation

### DOCS-05: Security
1. **Auth System** - JWT (HS256, 24h expiry), PBKDF2 password hashing, role-based access (admin/editor/author/viewer), RBAC per collection
2. **Rate Limiting** - KV-based sliding window, configurable per route
3. **CSRF & CORS** - CSRF token cookie, CORS via CORS_ORIGINS env var
4. **Security Headers** - X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy

### DOCS-06: Plugins
1. **Plugin System** - Hook system, lifecycle hooks (30+ hook types), blocking vs non-blocking
2. **Core Plugins** - Cache, Turnstile, Email, OTP Login, AI Search, Seed Data, Database Tools, etc.
3. **Building Plugins** - PluginBuilder SDK, fluent API, routes/hooks/middleware/admin pages

### DOCS-07: Deployment
1. **Cloudflare Workers** - wrangler.toml config, environments (dev/staging/production)
2. **D1 Database** - Migrations, Drizzle schema, local vs remote
3. **R2 Storage** - Media bucket setup, custom domain (images.flarecms.dev)
4. **Wrangler Config** - Full wrangler.toml reference, bindings, triggers
5. **CI/CD** - GitHub Actions workflow, build pipeline, secrets

### DOCS-08: Configuration
1. **Environment Variables** - Complete env var reference (JWT_SECRET, CORS_ORIGINS, MEDIA_DOMAIN, WEBHOOK_URLS, etc.)
2. **Bindings** - D1 (DB), R2 (MEDIA_BUCKET), KV (CACHE_KV), all binding configs
3. **Settings** - FlareConfig object, collection autoSync, plugin directory, middleware config

## Known Bugs to Document Honestly

| Bug | Section | Callout |
|-----|---------|---------|
| API filters broken | API Reference - Filtering | WARNING callout with client-side filtering workaround |
| Select field `default` ignored | Core Concepts - Collections | NOTE callout |
| Status is one-way (can't unpublish) | Core Concepts - Content Workflow | WARNING callout |
| Soft-delete doesn't cascade | Core Concepts - Content Workflow | CAUTION callout |

## Seed Script Design

### Idempotency: Wipe & Reseed
**Recommendation:** Use wipe-and-reseed approach rather than upsert.

**Rationale:**
- The CMS API has no upsert endpoint
- Matching by slug requires fetching all content and comparing
- Wipe-and-reseed is simpler, more reliable, and produces a known state
- Delete order: docs pages first (have FK to sections), then docs-sections

### Script Interface
```bash
# Default: seed via CMS API (localhost)
npx tsx scripts/seed-docs.ts http://localhost:8787

# Seed to production
npx tsx scripts/seed-docs.ts https://flare-cms.jjaimealeman.workers.dev

# Direct D1 inserts (fast local reset)
npx tsx scripts/seed-docs.ts --direct
```

### Direct D1 Mode
For `--direct` flag, use `wrangler d1 execute` or `getPlatformProxy()` (already used in `seed-admin.ts`) to insert directly into D1. This bypasses the HTTP API for faster iteration during development.

## Prompt Generator Design

The prompt generator reads the live CMS schema and outputs a markdown file that any LLM can use to generate seed content for any Flare CMS instance.

**Output format:** A single `PROMPT.md` file containing:
1. System context (what Flare CMS is, how the API works)
2. Available collections with full schema details
3. API endpoint reference for content creation
4. Example request/response pairs
5. Instructions for the LLM to generate content

**Key design principle:** The prompt must be self-contained. A developer should be able to feed just the PROMPT.md to any LLM tool and get working seed content back.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SonicJS naming | Flare CMS naming | Phase 1 rebrand | All code references updated, 4 historical refs preserved |
| Quill editor | MDX Editor (mdxeditor type) | Docs collection | Markdown-native editing for docs |
| No API tokens | Read-only API tokens with collection scoping | Phase 3 | Public API access pattern |

**Deprecated/outdated:**
- `createSonicJSApp` -> use `createFlareApp` (alias still works)
- `SonicJSConfig` -> use `FlareConfig` (alias still works)

## Open Questions

1. **Auth for seed script password**
   - What we know: The seed script needs admin credentials. The existing `seed-admin.ts` hardcodes them.
   - What's unclear: Whether to use env vars, a `.env` file, or prompt for password.
   - Recommendation: Use env vars (`FLARE_ADMIN_EMAIL`, `FLARE_ADMIN_PASSWORD`) with fallback to the known dev admin account.

2. **Content accuracy verification**
   - What we know: Code examples should reflect the actual API surface.
   - What's unclear: How to validate examples stay accurate as the codebase evolves.
   - Recommendation: Deferred (per CONTEXT.md - automated drift detection is deferred). For now, examples are written by reading actual source code.

3. **Section ordering**
   - What we know: User wants "natural learning progression."
   - Recommendation: Getting Started (1) -> Core Concepts (2) -> Configuration (3) -> Admin (4) -> API Reference (5) -> Plugins (6) -> Security (7) -> Deployment (8). This mirrors the developer journey: install -> understand -> configure -> use -> integrate -> secure -> ship.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all source files in `packages/core/src/routes/`, `packages/core/src/middleware/`, `packages/core/src/types/`, `packages/core/src/services/`, `packages/core/src/plugins/`
- CMS collection schemas: `packages/cms/src/collections/docs.collection.ts`, `packages/cms/src/collections/docs-sections.collection.ts`
- Site rendering pipeline: `packages/site/src/lib/markdown.ts`, `packages/site/src/pages/docs/[...slug].astro`
- Existing seed script: `packages/cms/scripts/seed-admin.ts`
- API route definitions with OpenAPI spec: `packages/core/src/routes/api.ts`
- Auth implementation: `packages/core/src/routes/auth.ts`, `packages/core/src/middleware/auth.ts`
- wrangler.toml configuration: `packages/cms/wrangler.toml`

### Secondary (MEDIUM confidence)
- gray-matter and tsx are well-established npm packages (training data, widely used)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; seed tooling is straightforward
- Architecture: HIGH - Content structure and seed script design derived directly from existing CMS API and collection schemas
- Pitfalls: HIGH - Identified from actual code analysis (auth flow, FK references, status defaults, line endings)
- API surface: HIGH - Complete endpoint list extracted from actual route files

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable - content and APIs unlikely to change)
