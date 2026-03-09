# Phase 7: Astro Content Layer Loader (`@flare-cms/astro`) - Research

**Researched:** 2026-03-09
**Domain:** Astro Content Layer API, custom loaders, TypeScript type generation
**Confidence:** HIGH

## Summary

The Astro Content Layer API (stable since Astro 5.0) provides a well-defined `Loader` interface for fetching content from external sources into type-safe collections. A custom loader is a small object with `name`, `load()`, and optional `schema` properties. The site already runs Astro 5.18.0, which also supports the experimental `liveContentCollections` feature (added in 5.10) for runtime fetching -- ideal for SSR on Cloudflare Pages.

The Flare CMS already has a well-structured REST API (`/api/collections/:name/content`) and a `CollectionConfig` type with a `CollectionSchema` that maps field types. The loader needs to: (1) fetch from the CMS API at build-time using the standard `Loader` interface, (2) optionally support live collections for SSR, and (3) convert Flare's `CollectionSchema` to Zod schemas for Astro's type system.

**Primary recommendation:** Build a single `@flare-cms/astro` package exporting a `flareLoader()` function (build-time) and a `flareLiveLoader()` function (SSR/live). Use tsup for building, matching the existing `@flare-cms/core` package patterns. Convert Flare's `FieldConfig` types to Zod schemas programmatically.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| astro | ^5.10.0 | Peer dep - Content Layer + live collections | Already installed at 5.18.0 |
| zod | ^3.0.0 (via `astro/zod`) | Schema validation & type generation | Astro provides this; use `astro/zod` import |
| tsup | ^8.5.0 | Build the package | Same tooling as @flare-cms/core |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @flare-cms/core | workspace:* | Import `CollectionConfig`, `FieldConfig` types | Schema-to-Zod conversion |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Two loaders (build + live) | Single live-only loader | Build-time loader gives static generation benefits; live is experimental |
| Dynamic schema from API | Manual Zod schemas per collection | Dynamic is the whole selling point -- "zero config" |

**Installation (consumer side):**
```bash
pnpm add @flare-cms/astro
```

## Architecture Patterns

### Recommended Package Structure
```
packages/astro/
  src/
    index.ts              # Main exports: flareLoader, flareLiveLoader
    loader.ts             # Build-time Loader implementation
    live-loader.ts        # Live/SSR LiveLoader implementation
    schema.ts             # CollectionSchema -> Zod schema converter
    client.ts             # Lightweight fetch wrapper for CMS API
    types.ts              # Shared types (FlareLoaderOptions, etc.)
  tsup.config.ts
  package.json
  tsconfig.json
```

### Pattern 1: Build-Time Loader (Standard Loader interface)
**What:** Fetches all content at `astro build` time, stores in Astro's data layer
**When to use:** Static pages, pre-rendered content, build-time optimization
**Example:**
```typescript
// Source: https://docs.astro.build/en/reference/content-loader-reference/
import type { Loader } from 'astro/loaders'

export function flareLoader(options: FlareLoaderOptions): Loader {
  return {
    name: 'flare-loader',
    load: async ({ store, meta, logger, parseData, generateDigest }) => {
      const lastSync = meta.get('lastModified')

      // Fetch collections list or specific collection
      const headers: Record<string, string> = {}
      if (options.apiToken) headers['X-API-Key'] = options.apiToken
      if (lastSync) headers['If-Modified-Since'] = lastSync

      const response = await fetch(
        `${options.apiUrl}/api/collections/${options.collection}/content`,
        { headers }
      )

      if (response.status === 304) {
        logger.info('Content unchanged, skipping update')
        return
      }

      const result = await response.json()
      store.clear()

      for (const item of result.data) {
        const data = await parseData({
          id: item.id,
          data: {
            ...item.data,
            _status: item.status,
            _createdAt: new Date(item.created_at),
            _updatedAt: new Date(item.updated_at),
          },
        })

        store.set({
          id: item.id,
          data,
          digest: generateDigest(data),
        })
      }

      meta.set('lastModified', new Date().toISOString())
    },
    schema: async () => {
      // Fetch collection config and convert to Zod schema
      const schemaResponse = await fetch(
        `${options.apiUrl}/api/collections`
      )
      const collections = await schemaResponse.json()
      const config = collections.data.find(c => c.name === options.collection)
      return flareSchemaToZod(config.schema)
    },
  }
}
```

### Pattern 2: Live Loader (Experimental, SSR)
**What:** Fetches content at request time with `getLiveCollection()`/`getLiveEntry()`
**When to use:** SSR pages that need fresh content, dynamic filtering
**Example:**
```typescript
// Source: https://docs.astro.build/en/reference/experimental-flags/live-content-collections/
import type { LiveLoader } from 'astro/loaders'

export function flareLiveLoader(options: FlareLoaderOptions): LiveLoader {
  return {
    name: 'flare-live-loader',
    loadCollection: async ({ filter }) => {
      const params = new URLSearchParams()
      if (filter?.status) params.set('filter[status][equals]', filter.status)

      const response = await fetch(
        `${options.apiUrl}/api/collections/${options.collection}/content?${params}`,
        options.apiToken ? { headers: { 'X-API-Key': options.apiToken } } : {}
      )
      const result = await response.json()

      return {
        entries: result.data.map(item => ({
          id: item.id,
          data: { ...item.data, _status: item.status },
        })),
      }
    },
    loadEntry: async ({ filter }) => {
      const id = typeof filter === 'string' ? filter : filter.id
      const response = await fetch(
        `${options.apiUrl}/api/collections/${options.collection}/content/${id}`,
        options.apiToken ? { headers: { 'X-API-Key': options.apiToken } } : {}
      )

      if (!response.ok) return { error: new Error('Entry not found') }
      const item = await response.json()

      return {
        id: item.data.id,
        data: { ...item.data.data, _status: item.data.status },
      }
    },
  }
}
```

### Pattern 3: Schema Conversion (Flare FieldConfig to Zod)
**What:** Programmatically converts Flare's `CollectionSchema` to Zod schemas
**When to use:** Always -- this is the core type-safety mechanism
**Example:**
```typescript
import { z } from 'astro/zod'
import type { FieldConfig, CollectionSchema } from '@flare-cms/core'

const FIELD_TYPE_MAP: Record<string, () => z.ZodTypeAny> = {
  string: () => z.string(),
  number: () => z.number(),
  boolean: () => z.boolean(),
  date: () => z.coerce.date(),
  datetime: () => z.coerce.date(),
  email: () => z.string().email(),
  url: () => z.string().url(),
  richtext: () => z.string(),
  markdown: () => z.string(),
  quill: () => z.string(),     // HTML content from Quill editor
  tinymce: () => z.string(),
  mdxeditor: () => z.string(),
  textarea: () => z.string(),
  json: () => z.unknown(),
  select: () => z.string(),    // Refined with .enum() if enum provided
  multiselect: () => z.array(z.string()),
  checkbox: () => z.boolean(),
  radio: () => z.string(),
  slug: () => z.string(),
  color: () => z.string(),
  media: () => z.string(),     // URL/path to media
  file: () => z.string(),
  reference: () => z.string(), // ID of referenced item
  array: () => z.array(z.unknown()),
  object: () => z.record(z.unknown()),
}

export function flareSchemaToZod(schema: CollectionSchema): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const [key, field] of Object.entries(schema.properties)) {
    let zodField = FIELD_TYPE_MAP[field.type]?.() ?? z.string()

    // Add enum constraint for select fields
    if (field.type === 'select' && field.enum?.length) {
      zodField = z.enum(field.enum as [string, ...string[]])
    }

    // Make optional unless in required array
    if (!schema.required?.includes(key)) {
      zodField = zodField.optional()
    }

    shape[key] = zodField
  }

  // Add system fields
  shape._status = z.string().optional()
  shape._createdAt = z.coerce.date().optional()
  shape._updatedAt = z.coerce.date().optional()

  return z.object(shape)
}
```

### Consumer Usage in content.config.ts
```typescript
// packages/site/src/content.config.ts
import { defineCollection } from 'astro:content'
import { flareLoader } from '@flare-cms/astro'

const blogPosts = defineCollection({
  loader: flareLoader({
    apiUrl: 'http://localhost:8787',
    collection: 'blog-posts',
    // Optional: override schema, filter by status, etc.
    filter: { status: 'published' },
  }),
})

const news = defineCollection({
  loader: flareLoader({
    apiUrl: 'http://localhost:8787',
    collection: 'news',
    filter: { status: 'published' },
  }),
})

export const collections = { blogPosts, news }
```

### Anti-Patterns to Avoid
- **Bundling `astro` in the package:** Astro must be a peer dependency, never bundled
- **Importing `zod` directly:** Use `astro/zod` re-export to avoid version conflicts
- **Fetching schema on every page load:** Schema conversion should happen once at build-time/startup, not per-request
- **Hardcoding collection names:** The loader should be collection-agnostic, taking the name as a parameter

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zod schema validation | Custom validation logic | `parseData()` from LoaderContext | Astro's parseData validates + generates types automatically |
| Content caching between builds | Custom cache files | `meta` store from LoaderContext | Astro provides per-collection metadata persistence |
| Change detection | Custom diffing | `generateDigest()` from LoaderContext | Astro's digest mechanism handles incremental updates |
| Type generation | Custom .d.ts file generation | Zod schema in loader's `schema` property | Astro auto-generates TypeScript types from Zod schemas |
| HTTP conditional requests | Custom ETags | `meta.get()`/`meta.set()` + If-Modified-Since | Standard HTTP caching pattern with Astro's meta store |

**Key insight:** Astro's Content Layer provides all the caching, validation, type-generation, and digest primitives. The loader is thin -- it just maps CMS API responses into `store.set()` calls and converts schemas.

## Common Pitfalls

### Pitfall 1: Zod Version Mismatch
**What goes wrong:** Package imports `zod` directly while Astro bundles its own version, causing runtime type errors
**Why it happens:** Zod 3 and Zod 4 have incompatible schema objects
**How to avoid:** Import from `astro/zod`, never from `zod` directly. Do NOT list `zod` as a dependency.
**Warning signs:** "ZodError: Expected ZodType" or schema validation silently failing

### Pitfall 2: Schema Fetch at Wrong Time
**What goes wrong:** Trying to fetch CMS schema during Vite's module resolution, before env vars are available
**Why it happens:** The `schema` property on a loader can be a function, but timing matters
**How to avoid:** Use the function form `schema: async () => { ... }` which Astro calls at the right time. Or hardcode a fallback schema and let `parseData()` handle validation.
**Warning signs:** "fetch is not defined" or empty env variables during build

### Pitfall 3: Not Handling CMS Downtime
**What goes wrong:** Build fails completely when CMS API is unreachable
**Why it happens:** No error handling in the loader's `load()` function
**How to avoid:** Wrap fetches in try/catch, use `logger.warn()`, and consider returning cached data from meta store
**Warning signs:** Builds failing in CI when CMS is restarting

### Pitfall 4: Content Data Shape Mismatch
**What goes wrong:** Flare CMS returns `{ data: { title, slug, ... } }` nested inside each item, but Astro expects flat data
**Why it happens:** The CMS stores user fields inside a `data` JSON column, so API returns `item.data.title` not `item.title`
**How to avoid:** The loader must flatten: spread `item.data` as the top-level data, merge in system fields like status
**Warning signs:** All fields showing as `undefined` in Astro templates

### Pitfall 5: Peer Dependency on Astro
**What goes wrong:** Package installs its own copy of Astro internals
**Why it happens:** Astro listed as regular dependency instead of peer dependency
**How to avoid:** List `astro` as `peerDependencies: { "astro": ">=5.10.0" }`. For the monorepo, this works automatically since `astro` is installed in `packages/site/`.
**Warning signs:** Duplicate module errors, "cannot resolve astro:content"

### Pitfall 6: Live Loader is Experimental
**What goes wrong:** Breaking API changes between Astro minor versions
**Why it happens:** `experimental.liveContentCollections` is not stable
**How to avoid:** Build the standard build-time loader first (stable API). Live loader as opt-in bonus. Version-gate live loader exports.
**Warning signs:** Astro changelog mentioning breaking changes to live collections API

## Code Examples

### Complete Loader Options Interface
```typescript
export interface FlareLoaderOptions {
  /** CMS API base URL (e.g., 'http://localhost:8787') */
  apiUrl: string
  /** Collection name in Flare CMS (e.g., 'blog-posts') */
  collection: string
  /** Optional API token for authenticated access */
  apiToken?: string
  /** Filter content by status (default: 'published') */
  filter?: {
    status?: 'draft' | 'published' | 'archived'
    [key: string]: string | undefined
  }
  /** Override auto-generated schema with custom Zod schema */
  schema?: z.ZodObject<any>
}
```

### Package.json for @flare-cms/astro
```json
{
  "name": "@flare-cms/astro",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch"
  },
  "peerDependencies": {
    "astro": ">=5.10.0"
  },
  "dependencies": {
    "@flare-cms/core": "workspace:*"
  },
  "devDependencies": {
    "astro": "^5.18.0",
    "tsup": "^8.5.0",
    "typescript": "^5.9.3"
  }
}
```

### tsup.config.ts for the Package
```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['astro', 'astro/zod', 'astro:content', '@flare-cms/core'],
  target: 'es2022',
})
```

### Consumer Migration Example (before/after)
```typescript
// BEFORE: packages/site/src/pages/blog/index.astro
---
import { getBlogPosts } from '../../lib/flare'
const posts = await getBlogPosts()
---
{posts.map(post => <h2>{post.data.title}</h2>)}

// AFTER: packages/site/src/pages/blog/index.astro
---
import { getCollection } from 'astro:content'
const posts = await getCollection('blogPosts')
---
{posts.map(post => <h2>{post.data.title}</h2>)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `src/content/config.ts` | `src/content.config.ts` (top-level) | Astro 5.0 (Dec 2024) | Config file moved out of content dir |
| `type: 'content'` / `type: 'data'` | `loader: glob()` / `loader: file()` | Astro 5.0 | Loaders replace content types |
| No remote content | Custom `Loader` objects | Astro 5.0 | Full external CMS support |
| Build-time only | `liveContentCollections` experimental | Astro 5.10 (June 2025) | SSR runtime fetching |
| `getCollection()` only | `getLiveCollection()` + `getLiveEntry()` | Astro 5.10 | Runtime querying API |
| `defineLiveCollection` in `live.config.ts` | Stable in Astro 6 | Astro 6 (2026) | Will stabilize live API |

**Deprecated/outdated:**
- `src/content/config.ts` location: Replaced by `src/content.config.ts` in Astro 5
- `type: 'content'` / `type: 'data'` collection types: Replaced by loader-based collections
- Manual `.astro` content directory structure: No longer required for remote content

## Open Questions

1. **Collections API Endpoint Structure**
   - What we know: `/api/collections/:name/content` returns `{ data: [...], meta: {...} }`
   - What's unclear: Is there an endpoint to fetch a single collection's config/schema? The loader needs schema info to generate Zod types.
   - Recommendation: Check if `/api/collections` returns schema info. If not, add a `/api/collections/:name` endpoint that returns the `CollectionConfig` including schema. Alternatively, import collection configs directly from `@flare-cms/core` if they're exported.

2. **Single Item API Endpoint**
   - What we know: The current `flare.ts` fetches ALL items and filters client-side (noted as a known bug)
   - What's unclear: Does `/api/collections/:name/content/:id` work for single-item fetches?
   - Recommendation: Verify single-item endpoint works before building the live loader's `loadEntry()`.

3. **Monorepo Peer Dependency Resolution**
   - What we know: `astro` is installed in `packages/site/`, `@flare-cms/astro` would be in `packages/astro/`
   - What's unclear: Will pnpm correctly resolve `astro/zod` imports from the astro package when the loader is a workspace dependency?
   - Recommendation: Test early. May need to use `astro/zod` in the consumer's content.config.ts rather than inside the loader itself, passing the `z` object in.

4. **Live Loader API Stability**
   - What we know: Experimental in Astro 5.10+, stabilizing in Astro 6
   - What's unclear: Will the `LiveLoader` interface change before stabilization?
   - Recommendation: Build the standard build-time loader first (stable). Add live loader as clearly-marked experimental export.

## Sources

### Primary (HIGH confidence)
- [Astro Content Loader API Reference](https://docs.astro.build/en/reference/content-loader-reference/) - Complete Loader interface, LoaderContext, store API
- [Astro Content Collections Guide](https://docs.astro.build/en/guides/content-collections/) - defineCollection, getCollection, content.config.ts
- [Astro Live Content Collections](https://docs.astro.build/en/reference/experimental-flags/live-content-collections/) - LiveLoader interface, defineLiveCollection, getLiveCollection/getLiveEntry
- [Astro Content Layer Deep Dive](https://astro.build/blog/content-layer-deep-dive/) - Data store, metadata, caching, digest mechanism
- [Live Content Collections Deep Dive](https://astro.build/blog/live-content-collections-deep-dive/) - LiveLoader implementation details, cache hints

### Secondary (MEDIUM confidence)
- [PocketBase Astro Loader](https://github.com/pawcoding/astro-loader-pocketbase) - Real-world loader package structure, schema generation patterns
- [Community Loaders Blog Post](https://astro.build/blog/community-loaders/) - Ecosystem patterns, loader conventions
- [How to Build an Astro Collection Loader](https://dev.to/nuro/how-to-build-an-astro-collection-loader-3no1) - Step-by-step implementation guide

### Tertiary (LOW confidence)
- [Astro 5.10 Release](https://astro.build/blog/astro-5100/) - Live collections release announcement
- [Live Content Loaders Roadmap Issue](https://github.com/withastro/roadmap/issues/1151) - LiveLoader interface proposal

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Astro Content Layer API is stable and well-documented since 5.0
- Architecture: HIGH - Multiple community loaders confirm the pattern; Flare CMS API is well-understood from codebase
- Schema conversion: MEDIUM - The FieldConfig-to-Zod mapping is straightforward but untested; edge cases with nested objects/arrays/blocks need validation
- Live loader: MEDIUM - API is experimental; documented but may change
- Pitfalls: HIGH - Based on official docs warnings and community loader experiences

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (30 days - Astro's Content Layer API is stable; live collections may evolve)
