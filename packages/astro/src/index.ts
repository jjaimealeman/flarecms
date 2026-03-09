/**
 * @flare-cms/astro — Astro Content Layer integration for Flare CMS
 *
 * Provides schema conversion, API client, and (in future plans)
 * build-time and live Content Layer loaders.
 */

export { flareSchemaToZod } from './schema'
export { FlareClient } from './client'
export type { FlareLoaderOptions, FlareContentItem, FlareApiResponse } from './types'
