/**
 * Build-time Astro Content Layer Loader for Flare CMS.
 *
 * Fetches content from the CMS API at build time and stores it
 * in Astro's content store for type-safe `getCollection()` queries.
 */
import type { Loader } from 'astro/loaders'
import type { FlareLoaderOptions } from './types'
import { FlareClient } from './client'
import { flareSchemaToZod } from './schema'

/**
 * Create an Astro Content Layer loader for a Flare CMS collection.
 *
 * @example
 * ```ts
 * // content.config.ts
 * import { defineCollection } from 'astro:content'
 * import { flareLoader } from '@flare-cms/astro'
 *
 * export const collections = {
 *   posts: defineCollection({
 *     loader: flareLoader({
 *       apiUrl: 'http://localhost:8787',
 *       collection: 'blog-posts',
 *       filter: { status: 'published' },
 *     }),
 *   }),
 * }
 * ```
 */
export function flareLoader(options: FlareLoaderOptions): Loader {
  return {
    name: 'flare-loader',

    load: async ({ store, meta, logger, parseData, generateDigest }) => {
      const client = new FlareClient({
        apiUrl: options.apiUrl,
        apiToken: options.apiToken,
      })

      logger.info(`Fetching "${options.collection}" from ${options.apiUrl}`)

      // FlareClient returns empty array on network/API errors
      // (it logs errors internally). We treat an empty response
      // differently from a fetch failure — check meta for staleness.
      let items
      try {
        items = await client.fetchCollection(options.collection)
      } catch (error) {
        logger.warn(`Failed to fetch "${options.collection}" from CMS: ${error}`)
        logger.warn('Build will continue with cached content if available')
        return
      }

      if (!items || items.length === 0) {
        logger.info(`No content found for "${options.collection}"`)
        store.clear()
        return
      }

      // Client-side filtering (API filters are broken — known bug)
      let filtered = items
      if (options.filter?.status) {
        filtered = items.filter((item) => item.status === options.filter!.status)
      }

      logger.info(`Processing ${filtered.length} entries for "${options.collection}"`)

      store.clear()

      for (const item of filtered) {
        // Flatten item.data to top level, merge top-level fields and system fields
        // The CMS API returns title/slug at root level AND user fields inside item.data
        const flatData: Record<string, any> = {
          title: item.title,
          slug: item.slug,
          ...item.data,
          _status: item.status,
          _createdAt: new Date(item.created_at),
          _updatedAt: new Date(item.updated_at),
        }

        // Sanitize invalid dates — CMS may store empty strings for date fields
        // which produce Invalid Date and crash Astro's Zod validation
        for (const [key, val] of Object.entries(flatData)) {
          if (val instanceof Date && isNaN(val.getTime())) {
            flatData[key] = undefined
          } else if (typeof val === 'string' && val === '') {
            // Empty strings on date/datetime schema fields also crash z.coerce.date()
            // Safe to convert to undefined — Zod .optional() handles it
            flatData[key] = undefined
          }
        }

        const data = await parseData({
          id: item.id,
          data: flatData,
        })

        store.set({
          id: item.id,
          data,
          digest: generateDigest(data),
        })
      }

      meta.set('lastModified', new Date().toISOString())
      logger.info(`Stored ${filtered.length} entries for "${options.collection}"`)
    },

    schema: async () => {
      // If user provided a custom schema, use it
      if (options.schema) {
        return options.schema
      }

      // Otherwise, dynamically fetch from CMS and convert
      const client = new FlareClient({
        apiUrl: options.apiUrl,
        apiToken: options.apiToken,
      })

      try {
        const collectionSchema = await client.fetchCollectionSchema(options.collection)
        if (collectionSchema) {
          return flareSchemaToZod(collectionSchema)
        }
      } catch {
        // Schema fetch failed — fall through to permissive schema
      }

      // Fallback: permissive schema that accepts any data
      const { z } = await import('astro/zod')
      const safeDate = z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? undefined : val),
        z.coerce.date(),
      )
      return z.object({
        _status: z.string().optional(),
        _createdAt: safeDate.optional(),
        _updatedAt: safeDate.optional(),
      }).passthrough()
    },
  }
}
