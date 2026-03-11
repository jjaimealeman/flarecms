/**
 * Plugin Configuration Management
 * 
 * Handles plugin configuration loading, validation, and management
 */

import { z } from 'zod'
import { PluginConfig } from '@flare-cms/core'

// Configuration schema for plugin settings
const PluginConfigSchema = z.object({
  enabled: z.boolean().default(true),
  priority: z.number().optional(),
  config: z.record(z.string(), z.any()).optional(),
  installedAt: z.number().optional(),
  updatedAt: z.number().optional(),
  version: z.string().optional(),
  
  // Environment-specific settings
  environments: z.array(z.enum(['development', 'staging', 'production'])).optional(),
  
  // Feature flags
  features: z.record(z.string(), z.boolean()).optional(),
  
  // Resource limits
  limits: z.object({
    memory: z.number().optional(),
    cpu: z.number().optional(),
    requests: z.number().optional()
  }).optional()
})

export class PluginConfigManager {
  private configs: Map<string, PluginConfig> = new Map()
  private defaultConfigs: Map<string, PluginConfig> = new Map()

  /**
   * Load plugin configuration from various sources
   */
  async loadConfig(source: 'file' | 'database' | 'environment' = 'file'): Promise<void> {
    console.info(`Loading plugin configuration from ${source}...`)

    switch (source) {
      case 'file':
        await this.loadFromFile()
        break
      case 'database':
        await this.loadFromDatabase()
        break
      case 'environment':
        await this.loadFromEnvironment()
        break
    }
  }

  /**
   * Load configuration from file
   */
  private async loadFromFile(): Promise<void> {
    try {
      // In a real implementation, this would read from a config file
      const defaultConfig = {
        plugins: [] as Array<{ name: string; enabled: boolean; priority: number; config: Record<string, any> }>
      }

      for (const pluginConfig of defaultConfig.plugins) {
        this.setConfig(pluginConfig.name, pluginConfig)
      }

      console.info('Plugin configuration loaded from file')
    } catch (error) {
      console.error('Failed to load plugin configuration from file:', error)
    }
  }

  /**
   * Load configuration from database
   */
  private async loadFromDatabase(): Promise<void> {
    // In a real implementation, this would query the database
    console.info('Loading plugin configuration from database (not implemented)')
  }

  /**
   * Load configuration from environment variables
   */
  private async loadFromEnvironment(): Promise<void> {
    // Safe environment access for Cloudflare Workers compatibility
    let env: Record<string, string | undefined> = {}
    try {
      if (typeof process !== 'undefined' && process.env) {
        env = process.env
      }
    } catch {
      // process is not defined in this runtime (e.g., Cloudflare Workers)
      console.info('Environment variables not available in this runtime')
      return
    }

    // Parse environment variables for plugin configuration
    const pluginConfigs: Array<{ name: string } & PluginConfig> = []

    for (const pluginConfig of pluginConfigs) {
      const { name, ...config } = pluginConfig
      this.setConfig(name, config)
    }

    console.info('Plugin configuration loaded from environment')
  }

  /**
   * Get plugin configuration
   */
  getConfig(pluginName: string): PluginConfig | undefined {
    return this.configs.get(pluginName)
  }

  /**
   * Set plugin configuration
   */
  setConfig(pluginName: string, config: PluginConfig): void {
    // Validate configuration
    const validation = PluginConfigSchema.safeParse(config)
    if (!validation.success) {
      throw new Error(`Invalid plugin configuration for ${pluginName}: ${validation.error.message}`)
    }

    // Merge with existing configuration
    const existing = this.configs.get(pluginName) || {}
    const merged = {
      ...existing,
      ...validation.data,
      updatedAt: Date.now()
    }

    this.configs.set(pluginName, merged)
    console.debug(`Configuration updated for plugin: ${pluginName}`)
  }

  /**
   * Get all plugin configurations
   */
  getAllConfigs(): Map<string, PluginConfig> {
    return new Map(this.configs)
  }

  /**
   * Get enabled plugin configurations
   */
  getEnabledConfigs(): Array<{ name: string } & PluginConfig> {
    const enabled: Array<{ name: string } & PluginConfig> = []
    
    for (const [name, config] of this.configs) {
      if (config.enabled) {
        enabled.push({ name, ...config })
      }
    }

    // Sort by priority
    return enabled.sort((a, b) => (a.priority || 10) - (b.priority || 10))
  }

  /**
   * Update plugin configuration
   */
  updateConfig(pluginName: string, updates: Partial<PluginConfig>): void {
    const current = this.configs.get(pluginName)
    if (!current) {
      throw new Error(`Plugin configuration not found: ${pluginName}`)
    }

    this.setConfig(pluginName, { ...current, ...updates })
  }

  /**
   * Enable plugin
   */
  enablePlugin(pluginName: string): void {
    this.updateConfig(pluginName, { enabled: true })
  }

  /**
   * Disable plugin
   */
  disablePlugin(pluginName: string): void {
    this.updateConfig(pluginName, { enabled: false })
  }

  /**
   * Reset plugin configuration to defaults
   */
  resetConfig(pluginName: string): void {
    const defaultConfig = this.defaultConfigs.get(pluginName)
    if (defaultConfig) {
      this.setConfig(pluginName, { ...defaultConfig })
    } else {
      this.configs.delete(pluginName)
    }
  }

  /**
   * Set default configuration for a plugin
   */
  setDefaultConfig(pluginName: string, config: PluginConfig): void {
    this.defaultConfigs.set(pluginName, config)
  }

  /**
   * Export configuration
   */
  exportConfig(): { plugins: Array<{ name: string } & PluginConfig> } {
    const plugins: Array<{ name: string } & PluginConfig> = []
    
    for (const [name, config] of this.configs) {
      plugins.push({ name, ...config })
    }
    
    return { plugins }
  }

  /**
   * Import configuration
   */
  importConfig(data: { plugins: Array<{ name: string } & PluginConfig> }): void {
    for (const pluginConfig of data.plugins) {
      const { name, ...config } = pluginConfig
      this.setConfig(name, config)
    }
  }

  /**
   * Validate plugin configuration against schema
   */
  validateConfig(_pluginName: string, config: PluginConfig): { valid: boolean; errors: string[] } {
    const validation = PluginConfigSchema.safeParse(config)
    
    if (validation.success) {
      return { valid: true, errors: [] }
    }
    
    const errors = validation.error.issues.map((err: any) =>
      `${err.path.join('.')}: ${err.message}`
    )
    
    return { valid: false, errors }
  }

  /**
   * Get configuration schema for a plugin
   */
  getConfigSchema(_pluginName: string): z.ZodSchema | undefined {
    // This would return plugin-specific configuration schemas
    // For now, return the general schema
    return PluginConfigSchema
  }

  /**
   * Clear all configurations
   */
  clear(): void {
    this.configs.clear()
    this.defaultConfigs.clear()
  }

  /**
   * Get configuration statistics
   */
  getStats(): {
    total: number
    enabled: number
    disabled: number
    configured: number
  } {
    const total = this.configs.size
    const enabled = Array.from(this.configs.values()).filter(c => c.enabled).length
    const disabled = total - enabled
    const configured = Array.from(this.configs.values()).filter(c => c.config && Object.keys(c.config).length > 0).length
    
    return { total, enabled, disabled, configured }
  }
}
