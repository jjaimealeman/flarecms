/**
 * @flare-cms/astro — Astro Content Layer integration for Flare CMS
 *
 * Provides a build-time Content Layer loader, schema conversion,
 * and API client for fetching CMS content at build time.
 */

export { flareLoader } from './loader'
/** @experimental Requires Astro 5.10+ with experimental.liveContentCollections */
export { flareLiveLoader } from './live-loader'
export { flareSchemaToZod } from './schema'
export { FlareClient } from './client'
export type { FlareLoaderOptions, FlareContentItem, FlareApiResponse } from './types'
