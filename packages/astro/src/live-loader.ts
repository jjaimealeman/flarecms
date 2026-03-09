/**
 * @experimental Live loader for Flare CMS — requires Astro 5.10+ with
 * experimental.liveContentCollections enabled. API may change.
 */
import type { FlareLoaderOptions, FlareContentItem } from './types'
import { FlareClient } from './client'

/**
 * Shape of a live Content Layer loader for Astro SSR.
 *
 * Defined inline rather than imported from astro/loaders because the
 * LiveLoader type is not yet stable across Astro versions.
 */
interface LiveLoader {
  name: string
  loadCollection: (opts: { filter?: Record<string, any> }) => Promise<{
    entries: Array<{ id: string; data: Record<string, unknown> }>
  }>
  loadEntry: (opts: { filter: string | Record<string, any> }) => Promise<
    { id: string; data: Record<string, unknown> } | { error: Error }
  >
}

/**
 * Map a Flare content item to the shape expected by Astro's Content Layer.
 */
function mapItemToEntry(item: FlareContentItem): { id: string; data: Record<string, unknown> } {
  return {
    id: item.id,
    data: {
      title: item.title,
      slug: item.slug,
      ...item.data,
      _status: item.status,
      _createdAt: new Date(item.created_at),
      _updatedAt: new Date(item.updated_at),
    },
  }
}

/**
 * @experimental Live loader for Flare CMS.
 *
 * Fetches content at request time for SSR pages. Requires Astro 5.10+
 * with `experimental.liveContentCollections` enabled in astro.config.
 *
 * @example
 * ```ts
 * import { flareLiveLoader } from '@flare-cms/astro'
 *
 * const posts = defineCollection({
 *   loader: flareLiveLoader({
 *     apiUrl: 'http://localhost:8787',
 *     collection: 'blog-posts',
 *     filter: { status: 'published' },
 *   }),
 * })
 * ```
 */
export function flareLiveLoader(options: FlareLoaderOptions): LiveLoader {
  return {
    name: 'flare-live-loader',

    loadCollection: async ({ filter }) => {
      const client = new FlareClient({
        apiUrl: options.apiUrl,
        apiToken: options.apiToken,
      })

      let items = await client.fetchCollection(options.collection)

      // Client-side filtering (API filters are broken, so we filter here)
      const statusFilter = options.filter?.status || filter?.status
      if (statusFilter) {
        items = items.filter((item) => item.status === statusFilter)
      }

      return {
        entries: items.map(mapItemToEntry),
      }
    },

    loadEntry: async ({ filter }) => {
      const client = new FlareClient({
        apiUrl: options.apiUrl,
        apiToken: options.apiToken,
      })

      const id = typeof filter === 'string' ? filter : (filter as any).id
      const item = await client.fetchItem(options.collection, id)

      if (!item) {
        return { error: new Error(`Entry "${id}" not found in "${options.collection}"`) }
      }

      return mapItemToEntry(item)
    },
  }
}
