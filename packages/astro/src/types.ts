/**
 * Astro Content Layer Loader Types for Flare CMS
 */

/**
 * Configuration options for the Flare CMS Astro loader.
 */
export interface FlareLoaderOptions {
  /** CMS API base URL (e.g., 'http://localhost:8787') */
  apiUrl: string

  /** Collection name in Flare CMS (e.g., 'blog-posts') */
  collection: string

  /** Optional API token for authenticated access */
  apiToken?: string

  /** Filter content by status or custom fields */
  filter?: {
    status?: 'draft' | 'published' | 'archived'
    [key: string]: string | undefined
  }

  /** Override auto-generated Zod schema */
  schema?: any
}

/**
 * Shape of a content item returned by the Flare CMS API.
 */
export interface FlareContentItem {
  id: string
  title: string
  slug: string
  status: string
  data: Record<string, unknown>
  created_at: number
  updated_at: number
}

/**
 * Shape of a paginated API response from Flare CMS.
 */
export interface FlareApiResponse<T> {
  data: T[]
  meta: {
    count: number
    timestamp: string
    cache: {
      hit: boolean
      source: string
    }
  }
}
