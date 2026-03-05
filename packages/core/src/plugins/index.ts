/**
 * Plugins Module Exports
 *
 * Plugin system and SDK for Flare CMS
 */

// Hook System
export { HookSystemImpl, ScopedHookSystem, HookUtils } from './hook-system'

// Hooks Singleton
export { getHookSystem, resetHookSystem } from './hooks-singleton'

// Plugin Registry
export { PluginRegistryImpl } from './plugin-registry'

// Plugin Manager
export { PluginManager } from './plugin-manager'

// Plugin Validator
export { PluginValidator } from './plugin-validator'

// Core Plugins
export { 
  verifyTurnstile, 
  createTurnstileMiddleware, 
  TurnstileService 
} from './core-plugins/turnstile-plugin'
