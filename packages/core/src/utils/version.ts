/**
 * Version utility
 *
 * Provides the current version of @flare-cms/core package
 * with optional git commit hash for build identification
 */

import pkg from '../../package.json'

export const FLARE_VERSION = pkg.version
export const GIT_HASH = process.env.GIT_HASH || ''

/**
 * Get the current Flare CMS core version
 */
export function getCoreVersion(): string {
  return FLARE_VERSION
}

/**
 * Get version string with git hash for display (e.g. "v1.0.0 · e7cd9f2")
 */
export function getVersionDisplay(): string {
  return GIT_HASH ? `v${FLARE_VERSION} · ${GIT_HASH}` : `v${FLARE_VERSION}`
}
