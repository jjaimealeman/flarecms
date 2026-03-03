/**
 * Services Module Exports
 *
 * Core business logic services for SonicJS
 */

// Collection Management
export {
  loadCollectionConfigs,
  loadCollectionConfig,
  getAvailableCollectionNames,
  validateCollectionConfig,
  registerCollections,
} from './collection-loader'

export {
  syncCollections,
  syncCollection,
  isCollectionManaged,
  getManagedCollections,
  cleanupRemovedCollections,
  fullCollectionSync,
} from './collection-sync'

// Database Migrations
export { MigrationService } from './migrations'
export type { Migration, MigrationStatus } from './migrations'

// Logging
export { Logger, getLogger, initLogger } from './logger'
export type { LogLevel, LogCategory, LogEntry, LogFilter } from './logger'

// Plugin Services
export { PluginService } from './plugin-service'
export { PluginBootstrapService } from './plugin-bootstrap'
export type { CorePlugin } from './plugin-bootstrap'

// Cache Service
export { CacheService, getCacheService, CACHE_CONFIGS, setGlobalKVNamespace } from './cache'
export type { CacheConfig } from './cache'

// Settings Service
export { SettingsService } from './settings'
export type { Setting, GeneralSettings } from './settings'

// Telemetry Service
export {
  TelemetryService,
  getTelemetryService,
  initTelemetry,
  createInstallationIdentity
} from './telemetry-service'

// Content State Machine
export {
  VALID_TRANSITIONS,
  validateStatusTransition,
  isSlugLocked,
  getUnpublishUpdates,
} from './content-state-machine'

// RBAC Service — Collection-Level Permissions
export {
  checkCollectionPermission,
  getCollectionPermissions,
  grantCollectionPermission,
  revokeCollectionPermission,
  isAuthorAllowedToEdit,
} from './rbac'
export type { CollectionAction, CollectionRole } from './rbac'

// API Token Service
export {
  hashToken,
  createApiToken,
  validateApiToken,
  revokeApiToken,
  listApiTokens,
} from './api-tokens'

// Scheduler Service
export { SchedulerService } from '../plugins/core-plugins/workflow-plugin/services/scheduler'
export type { ScheduledContent } from '../plugins/core-plugins/workflow-plugin/services/scheduler'

export type {
  ApiTokenRecord,
  ApiTokenSafe,
  CreateApiTokenParams,
  CreateApiTokenResult,
  ValidateApiTokenResult,
} from './api-tokens'

// Audit Trail Service — Workflow History Logging
export {
  computeFieldDiff,
  logStatusChange,
  logContentEdit,
} from './audit-trail'

// Webhook Delivery Service — Outbound HTTP webhooks on publish/unpublish events
export {
  deliverWebhooks,
} from './webhook-delivery'
export type { WebhookPayload } from './webhook-delivery'
