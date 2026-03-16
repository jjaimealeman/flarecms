export interface Setting {
  id: string
  category: string
  key: string
  value: string // JSON string
  created_at: number
  updated_at: number
}

export interface GeneralSettings {
  siteName: string
  siteDescription: string
  adminEmail: string
  timezone: string
  language: string
  maintenanceMode: boolean
  trashRetentionDays: number  // 0=keep forever, 7,14,30,60,90
}

export interface SecuritySettings {
  idleTimeout: number          // minutes: 0=disabled, 5,10,15,30,60,120
  sessionDuration: number      // hours: 1,4,8,12,24,48,168(7d)
  allowRememberMe: boolean
  rememberMeDuration: number   // days: 7,14,30,60,90
  maxSessions: number          // 0=unlimited, 1-10
  idleWarningMinutes: number   // minutes before timeout to show warning: 1-10
  minPasswordLength: number    // 6-128
  requireUppercase: boolean
  requireNumbers: boolean
  requireSymbols: boolean
  passwordExpiryDays: number   // 0=never, 30,60,90,180,365
  maxFailedAttempts: number    // 3-20
  lockoutDuration: number      // minutes: 5,15,30,60
  ipWhitelist: string[]
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto'
  primaryColor: string
  logoUrl: string
  favicon: string
  customCSS: string
}

export const APPEARANCE_DEFAULTS: AppearanceSettings = {
  theme: 'dark',
  primaryColor: '#465FFF',
  logoUrl: '',
  favicon: '',
  customCSS: ''
}

export interface NotificationSettings {
  emailNotifications: boolean
  contentUpdates: boolean
  systemAlerts: boolean
  userRegistrations: boolean
  emailFrequency: 'immediate' | 'daily' | 'weekly'
}

export const NOTIFICATION_DEFAULTS: NotificationSettings = {
  emailNotifications: true,
  contentUpdates: true,
  systemAlerts: true,
  userRegistrations: false,
  emailFrequency: 'immediate'
}

export interface StorageSettings {
  maxFileSize: number
  allowedFileTypes: string[]
  storageProvider: 'local' | 'cloudflare' | 's3'
  backupFrequency: 'daily' | 'weekly' | 'monthly'
  retentionPeriod: number
}

export const STORAGE_DEFAULTS: StorageSettings = {
  maxFileSize: 10,
  allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'docx'],
  storageProvider: 'cloudflare',
  backupFrequency: 'daily',
  retentionPeriod: 30
}

export const SECURITY_DEFAULTS: SecuritySettings = {
  idleTimeout: 30,
  sessionDuration: 24,
  allowRememberMe: true,
  rememberMeDuration: 30,
  maxSessions: 0,
  idleWarningMinutes: 5,
  minPasswordLength: 8,
  requireUppercase: true,
  requireNumbers: true,
  requireSymbols: false,
  passwordExpiryDays: 0,
  maxFailedAttempts: 5,
  lockoutDuration: 15,
  ipWhitelist: []
}

export class SettingsService {
  constructor(private db: D1Database) {}

  /**
   * Get a setting value by category and key
   */
  async getSetting(category: string, key: string): Promise<any | null> {
    try {
      const result = await this.db
        .prepare('SELECT value FROM settings WHERE category = ? AND key = ?')
        .bind(category, key)
        .first()

      if (!result) {
        return null
      }

      return JSON.parse((result as any).value)
    } catch (error) {
      console.error(`Error getting setting ${category}.${key}:`, error)
      return null
    }
  }

  /**
   * Get all settings for a category
   */
  async getCategorySettings(category: string): Promise<Record<string, any>> {
    try {
      const { results } = await this.db
        .prepare('SELECT key, value FROM settings WHERE category = ?')
        .bind(category)
        .all()

      const settings: Record<string, any> = {}
      for (const row of results || []) {
        const r = row as any
        settings[r.key] = JSON.parse(r.value)
      }

      return settings
    } catch (error) {
      console.error(`Error getting category settings for ${category}:`, error)
      return {}
    }
  }

  /**
   * Set a setting value
   */
  async setSetting(category: string, key: string, value: any): Promise<boolean> {
    try {
      const now = Date.now()
      const jsonValue = JSON.stringify(value)

      await this.db
        .prepare(`
          INSERT INTO settings (id, category, key, value, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(category, key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
        `)
        .bind(crypto.randomUUID(), category, key, jsonValue, now, now)
        .run()

      return true
    } catch (error) {
      console.error(`Error setting ${category}.${key}:`, error)
      return false
    }
  }

  /**
   * Set multiple settings at once
   */
  async setMultipleSettings(category: string, settings: Record<string, any>): Promise<boolean> {
    try {
      const now = Date.now()

      // Use a transaction-like approach with batch operations
      for (const [key, value] of Object.entries(settings)) {
        const jsonValue = JSON.stringify(value)

        await this.db
          .prepare(`
            INSERT INTO settings (id, category, key, value, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(category, key) DO UPDATE SET
              value = excluded.value,
              updated_at = excluded.updated_at
          `)
          .bind(crypto.randomUUID(), category, key, jsonValue, now, now)
          .run()
      }

      return true
    } catch (error) {
      console.error(`Error setting multiple settings for ${category}:`, error)
      return false
    }
  }

  /**
   * Get general settings with defaults
   */
  async getGeneralSettings(userEmail?: string): Promise<GeneralSettings> {
    const settings = await this.getCategorySettings('general')

    return {
      siteName: settings.siteName || 'Flare CMS',
      siteDescription: settings.siteDescription || 'Edge-native headless CMS for Cloudflare Workers. Built on D1, R2, and Hono.',
      adminEmail: settings.adminEmail || userEmail || 'admin@example.com',
      timezone: settings.timezone || 'UTC',
      language: settings.language || 'en',
      maintenanceMode: settings.maintenanceMode || false,
      trashRetentionDays: settings.trashRetentionDays ?? 30
    }
  }

  /**
   * Save general settings
   */
  async saveGeneralSettings(settings: Partial<GeneralSettings>): Promise<boolean> {
    const settingsToSave: Record<string, any> = {}

    if (settings.siteName !== undefined) settingsToSave.siteName = settings.siteName
    if (settings.siteDescription !== undefined) settingsToSave.siteDescription = settings.siteDescription
    if (settings.adminEmail !== undefined) settingsToSave.adminEmail = settings.adminEmail
    if (settings.timezone !== undefined) settingsToSave.timezone = settings.timezone
    if (settings.language !== undefined) settingsToSave.language = settings.language
    if (settings.maintenanceMode !== undefined) settingsToSave.maintenanceMode = settings.maintenanceMode
    if (settings.trashRetentionDays !== undefined) settingsToSave.trashRetentionDays = settings.trashRetentionDays

    return await this.setMultipleSettings('general', settingsToSave)
  }

  /**
   * Get security settings with defaults
   */
  async getSecuritySettings(): Promise<SecuritySettings> {
    const settings = await this.getCategorySettings('security')

    return {
      idleTimeout: settings.idleTimeout ?? SECURITY_DEFAULTS.idleTimeout,
      sessionDuration: settings.sessionDuration ?? SECURITY_DEFAULTS.sessionDuration,
      allowRememberMe: settings.allowRememberMe ?? SECURITY_DEFAULTS.allowRememberMe,
      rememberMeDuration: settings.rememberMeDuration ?? SECURITY_DEFAULTS.rememberMeDuration,
      maxSessions: settings.maxSessions ?? SECURITY_DEFAULTS.maxSessions,
      idleWarningMinutes: settings.idleWarningMinutes ?? SECURITY_DEFAULTS.idleWarningMinutes,
      minPasswordLength: settings.minPasswordLength ?? SECURITY_DEFAULTS.minPasswordLength,
      requireUppercase: settings.requireUppercase ?? SECURITY_DEFAULTS.requireUppercase,
      requireNumbers: settings.requireNumbers ?? SECURITY_DEFAULTS.requireNumbers,
      requireSymbols: settings.requireSymbols ?? SECURITY_DEFAULTS.requireSymbols,
      passwordExpiryDays: settings.passwordExpiryDays ?? SECURITY_DEFAULTS.passwordExpiryDays,
      maxFailedAttempts: settings.maxFailedAttempts ?? SECURITY_DEFAULTS.maxFailedAttempts,
      lockoutDuration: settings.lockoutDuration ?? SECURITY_DEFAULTS.lockoutDuration,
      ipWhitelist: settings.ipWhitelist ?? SECURITY_DEFAULTS.ipWhitelist
    }
  }

  /**
   * Save security settings
   */
  async saveSecuritySettings(settings: Partial<SecuritySettings>): Promise<boolean> {
    const settingsToSave: Record<string, any> = {}

    if (settings.idleTimeout !== undefined) settingsToSave.idleTimeout = settings.idleTimeout
    if (settings.sessionDuration !== undefined) settingsToSave.sessionDuration = settings.sessionDuration
    if (settings.allowRememberMe !== undefined) settingsToSave.allowRememberMe = settings.allowRememberMe
    if (settings.rememberMeDuration !== undefined) settingsToSave.rememberMeDuration = settings.rememberMeDuration
    if (settings.maxSessions !== undefined) settingsToSave.maxSessions = settings.maxSessions
    if (settings.idleWarningMinutes !== undefined) settingsToSave.idleWarningMinutes = settings.idleWarningMinutes
    if (settings.minPasswordLength !== undefined) settingsToSave.minPasswordLength = settings.minPasswordLength
    if (settings.requireUppercase !== undefined) settingsToSave.requireUppercase = settings.requireUppercase
    if (settings.requireNumbers !== undefined) settingsToSave.requireNumbers = settings.requireNumbers
    if (settings.requireSymbols !== undefined) settingsToSave.requireSymbols = settings.requireSymbols
    if (settings.passwordExpiryDays !== undefined) settingsToSave.passwordExpiryDays = settings.passwordExpiryDays
    if (settings.maxFailedAttempts !== undefined) settingsToSave.maxFailedAttempts = settings.maxFailedAttempts
    if (settings.lockoutDuration !== undefined) settingsToSave.lockoutDuration = settings.lockoutDuration
    if (settings.ipWhitelist !== undefined) settingsToSave.ipWhitelist = settings.ipWhitelist

    return await this.setMultipleSettings('security', settingsToSave)
  }

  /**
   * Get appearance settings with defaults
   */
  async getAppearanceSettings(): Promise<AppearanceSettings> {
    const settings = await this.getCategorySettings('appearance')

    return {
      theme: settings.theme ?? APPEARANCE_DEFAULTS.theme,
      primaryColor: settings.primaryColor ?? APPEARANCE_DEFAULTS.primaryColor,
      logoUrl: settings.logoUrl ?? APPEARANCE_DEFAULTS.logoUrl,
      favicon: settings.favicon ?? APPEARANCE_DEFAULTS.favicon,
      customCSS: settings.customCSS ?? APPEARANCE_DEFAULTS.customCSS
    }
  }

  /**
   * Save appearance settings
   */
  async saveAppearanceSettings(settings: Partial<AppearanceSettings>): Promise<boolean> {
    const settingsToSave: Record<string, any> = {}

    if (settings.theme !== undefined) settingsToSave.theme = settings.theme
    if (settings.primaryColor !== undefined) settingsToSave.primaryColor = settings.primaryColor
    if (settings.logoUrl !== undefined) settingsToSave.logoUrl = settings.logoUrl
    if (settings.favicon !== undefined) settingsToSave.favicon = settings.favicon
    if (settings.customCSS !== undefined) settingsToSave.customCSS = settings.customCSS

    return await this.setMultipleSettings('appearance', settingsToSave)
  }

  /**
   * Get notification settings with defaults
   */
  async getNotificationSettings(): Promise<NotificationSettings> {
    const settings = await this.getCategorySettings('notifications')

    return {
      emailNotifications: settings.emailNotifications ?? NOTIFICATION_DEFAULTS.emailNotifications,
      contentUpdates: settings.contentUpdates ?? NOTIFICATION_DEFAULTS.contentUpdates,
      systemAlerts: settings.systemAlerts ?? NOTIFICATION_DEFAULTS.systemAlerts,
      userRegistrations: settings.userRegistrations ?? NOTIFICATION_DEFAULTS.userRegistrations,
      emailFrequency: settings.emailFrequency ?? NOTIFICATION_DEFAULTS.emailFrequency
    }
  }

  /**
   * Save notification settings
   */
  async saveNotificationSettings(settings: Partial<NotificationSettings>): Promise<boolean> {
    const settingsToSave: Record<string, any> = {}

    if (settings.emailNotifications !== undefined) settingsToSave.emailNotifications = settings.emailNotifications
    if (settings.contentUpdates !== undefined) settingsToSave.contentUpdates = settings.contentUpdates
    if (settings.systemAlerts !== undefined) settingsToSave.systemAlerts = settings.systemAlerts
    if (settings.userRegistrations !== undefined) settingsToSave.userRegistrations = settings.userRegistrations
    if (settings.emailFrequency !== undefined) settingsToSave.emailFrequency = settings.emailFrequency

    return await this.setMultipleSettings('notifications', settingsToSave)
  }

  /**
   * Get storage settings with defaults
   */
  async getStorageSettings(): Promise<StorageSettings> {
    const settings = await this.getCategorySettings('storage')

    return {
      maxFileSize: settings.maxFileSize ?? STORAGE_DEFAULTS.maxFileSize,
      allowedFileTypes: settings.allowedFileTypes ?? STORAGE_DEFAULTS.allowedFileTypes,
      storageProvider: settings.storageProvider ?? STORAGE_DEFAULTS.storageProvider,
      backupFrequency: settings.backupFrequency ?? STORAGE_DEFAULTS.backupFrequency,
      retentionPeriod: settings.retentionPeriod ?? STORAGE_DEFAULTS.retentionPeriod
    }
  }

  /**
   * Save storage settings
   */
  async saveStorageSettings(settings: Partial<StorageSettings>): Promise<boolean> {
    const settingsToSave: Record<string, any> = {}

    if (settings.maxFileSize !== undefined) settingsToSave.maxFileSize = settings.maxFileSize
    if (settings.allowedFileTypes !== undefined) settingsToSave.allowedFileTypes = settings.allowedFileTypes
    if (settings.storageProvider !== undefined) settingsToSave.storageProvider = settings.storageProvider
    if (settings.backupFrequency !== undefined) settingsToSave.backupFrequency = settings.backupFrequency
    if (settings.retentionPeriod !== undefined) settingsToSave.retentionPeriod = settings.retentionPeriod

    return await this.setMultipleSettings('storage', settingsToSave)
  }
}
