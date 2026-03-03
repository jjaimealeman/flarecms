/**
 * Hooks Singleton
 *
 * Module-level singleton for the hook system.
 * Workers isolates persist module state across requests within the same
 * cold start window — this pattern matches services/cache.ts kvInitialized.
 *
 * Usage:
 *   import { getHookSystem } from './hooks-singleton'
 *   const hooks = getHookSystem()
 *   hooks.register(HOOKS.BEFORE_CONTENT_CREATE, handler)
 */

import { HookSystemImpl } from './hook-system'

// Module-level singleton — persists per Workers isolate
let hookSystemInstance: HookSystemImpl | null = null

/**
 * Get (or create) the module-level HookSystemImpl singleton.
 * Route handlers import this to fire before/after lifecycle hooks.
 */
export function getHookSystem(): HookSystemImpl {
  if (!hookSystemInstance) {
    hookSystemInstance = new HookSystemImpl()
  }
  return hookSystemInstance
}

/**
 * Reset the singleton (useful for testing).
 * Clears all registered hooks and destroys the instance.
 */
export function resetHookSystem(): void {
  if (hookSystemInstance) {
    hookSystemInstance.clear()
  }
  hookSystemInstance = null
}
