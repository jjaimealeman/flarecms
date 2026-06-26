/**
 * @flare-cms/core - Main Entry Point
 *
 * Core framework for Flare CMS (forked from SonicJS)
 * Built for Cloudflare's edge platform with TypeScript
 *
 * Phase 2 Migration Status:
 * - Week 1: Types, Utils, Database (COMPLETED ✓)
 * - Week 2: Services, Middleware, Plugins (COMPLETED ✓)
 * - Week 3: Routes, Templates (COMPLETED ✓)
 * - Week 4: Integration & Testing (COMPLETED ✓)
 *
 * Test Coverage:
 * - Utilities: 48 tests (sanitize, query-filter, metrics)
 * - Middleware: 51 tests (auth, logging, security, performance)
 * - Total: 99 tests passing
 */

// ============================================================================
// Main Application API (Phase 2 Week 1)
// ============================================================================

export { createFlareApp, setupCoreMiddleware, setupCoreRoutes } from './app'
export type { FlareConfig, FlareApp, Bindings, Variables } from './app'

// ============================================================================
// Placeholders - To be populated in Phase 2
// ============================================================================

// Services - Week 2 (COMPLETED)
export {
  // Collection Management
  loadCollectionConfigs,
  loadCollectionConfig,
  getAvailableCollectionNames,
  validateCollectionConfig,
  registerCollections,
  syncCollections,
  syncCollection,
  isCollectionManaged,
  getManagedCollections,
  cleanupRemovedCollections,
  fullCollectionSync,
  // Database Migrations
  MigrationService,
  // Logging
  Logger,
  getLogger,
  initLogger,
  // Plugin Services - Class implementations
  PluginService as PluginServiceClass,
  PluginBootstrapService,
  // Content State Machine
  VALID_TRANSITIONS,
  validateStatusTransition,
  isSlugLocked,
  getUnpublishUpdates,
  // API Token Service
  hashToken,
  createApiToken,
  validateApiToken,
  revokeApiToken,
  listApiTokens,
  // Scheduler Service
  SchedulerService,
  // Audit Trail Service
  computeFieldDiff,
  logStatusChange,
  logContentEdit,
} from './services'

export type { Migration, MigrationStatus, LogLevel, LogCategory, LogEntry, LogFilter, CorePlugin } from './services'
export type { ApiTokenRecord, ApiTokenSafe, CreateApiTokenParams, CreateApiTokenResult, ValidateApiTokenResult } from './services'
export type { ScheduledContent } from './services'

// Middleware - Week 2 (COMPLETED)
export {
  // Authentication
  AuthManager,
  requireAuth,
  requireRole,
  optionalAuth,
  // Logging
  loggingMiddleware,
  detailedLoggingMiddleware,
  securityLoggingMiddleware,
  performanceLoggingMiddleware,
  // Performance
  cacheHeaders,
  compressionMiddleware,
  securityHeaders,
  // Permissions
  PermissionManager,
  requirePermission,
  requireAnyPermission,
  logActivity,
  // Plugin middleware
  requireActivePlugin,
  requireActivePlugins,
  getActivePlugins,
  isPluginActive,
  // Bootstrap
  bootstrapMiddleware,
} from './middleware'

export type { Permission, UserPermissions } from './middleware'

// Plugins - Week 2 (COMPLETED)
export {
  // Hook System - Class implementations
  HookSystemImpl,
  ScopedHookSystem as ScopedHookSystemClass,
  HookUtils,
  // Hooks Singleton - importable by route files
  getHookSystem,
  resetHookSystem,
  // Plugin Registry
  PluginRegistryImpl,
  // Plugin Manager - Class implementation
  PluginManager as PluginManagerClass,
  // Plugin Validator - Class implementation
  PluginValidator as PluginValidatorClass,
} from './plugins'

// Routes - Week 3 (COMPLETED)
export {
  ROUTES_INFO,
  apiRoutes,
  apiContentCrudRoutes,
  apiMediaRoutes,
  apiSystemRoutes,
  adminApiRoutes,
  authRoutes,
  adminContentRoutes,
  adminUsersRoutes,
  adminMediaRoutes,
  adminLogsRoutes,
  adminPluginRoutes,
  adminTestimonialsRoutes,
  adminCodeExamplesRoutes,
  adminDashboardRoutes,
  adminCollectionsRoutes,
  adminSettingsRoutes,
  adminApiTokensRoutes,
  adminAnalyticsRoutes,
  apiAnalyticsRoutes,
} from './routes'

// Templates - Week 3 (COMPLETED)
export {
  // Form templates
  renderForm,
  renderFormField,
  // Table templates
  renderTable,
  // Pagination templates
  renderPagination,
  // Alert templates
  renderAlert,
  // Confirmation dialog templates
  renderConfirmationDialog,
  getConfirmationDialogScript,
  // Filter bar templates
  renderFilterBar,
} from './templates'

export type {
  FormField,
  FormData,
  TableColumn,
  TableData,
  PaginationData,
  AlertData,
  ConfirmationDialogOptions,
  FilterBarData,
  Filter,
  FilterOption,
} from './templates'

// Types - Week 1 (COMPLETED)
export type {
  // Collection types
  FieldType,
  FieldConfig,
  CollectionSchema,
  CollectionConfig,
  CollectionConfigModule,
  CollectionSyncResult,
  // Plugin types
  Plugin,
  PluginContext,
  PluginConfig,
  PluginRoutes,
  PluginMiddleware,
  PluginModel,
  PluginService,
  PluginAdminPage,
  PluginComponent,
  PluginMenuItem,
  PluginHook,
  HookHandler,
  HookContext,
  HookSystem,
  ScopedHookSystem,
  PluginRegistry,
  PluginManager,
  PluginStatus,
  AuthService,
  ContentService,
  MediaService,
  PluginLogger,
  PluginBuilderOptions,
  PluginValidator,
  PluginValidationResult,
  HookName,
  // Plugin manifest
  PluginManifest,
} from './types'

export { HOOKS } from './types'

// Utils - Week 1 (COMPLETED)
export {
  // Sanitization
  escapeHtml,
  sanitizeInput,
  sanitizeObject,
  // Template rendering
  TemplateRenderer,
  templateRenderer,
  renderTemplate,
  // Query filtering
  QueryFilterBuilder,
  buildQuery,
  // Metrics
  metricsTracker,
  // Version
  FLARE_VERSION,
  getCoreVersion,
} from './utils'

export type {
  FilterOperator,
  FilterCondition,
  FilterGroup,
  QueryFilter,
  QueryResult,
} from './utils'

// Database - Week 1 (COMPLETED)
export {
  createDb,
  // Schema exports
  users,
  collections,
  content,
  contentVersions,
  media,
  apiTokens,
  workflowHistory,
  plugins,
  pluginHooks,
  pluginRoutes,
  pluginAssets,
  pluginActivityLog,
  systemLogs,
  logConfig,
  // Zod validation schemas
  insertUserSchema,
  selectUserSchema,
  insertCollectionSchema,
  selectCollectionSchema,
  insertContentSchema,
  selectContentSchema,
  insertMediaSchema,
  selectMediaSchema,
  insertWorkflowHistorySchema,
  selectWorkflowHistorySchema,
  insertPluginSchema,
  selectPluginSchema,
  insertPluginHookSchema,
  selectPluginHookSchema,
  insertPluginRouteSchema,
  selectPluginRouteSchema,
  insertPluginAssetSchema,
  selectPluginAssetSchema,
  insertPluginActivityLogSchema,
  selectPluginActivityLogSchema,
  insertSystemLogSchema,
  selectSystemLogSchema,
  insertLogConfigSchema,
  selectLogConfigSchema,
} from './db'

// Lib - Lightweight utilities (Phase 5+)
export { log } from './lib/logger'

export type {
  User,
  NewUser,
  Collection,
  NewCollection,
  Content,
  NewContent,
  Media,
  NewMedia,
  WorkflowHistory,
  NewWorkflowHistory,
  Plugin as DbPlugin,
  NewPlugin,
  PluginHook as DbPluginHook,
  NewPluginHook,
  PluginRoute,
  NewPluginRoute,
  PluginAsset,
  NewPluginAsset,
  PluginActivityLog,
  NewPluginActivityLog,
  SystemLog,
  NewSystemLog,
  LogConfig,
  NewLogConfig,
} from './db'

// Plugin SDK (Beta)
export { PluginBuilder, PluginHelpers } from './plugins/sdk'

// ============================================================================
// Version
// ============================================================================

// Import version from package.json
import packageJson from '../package.json'
export const VERSION = packageJson.version

// ============================================================================
// Phase 2 Migration Notes
// ============================================================================

/**
 * This is a work-in-progress package being extracted from the main codebase.
 *
 * Current Phase: 2 (Core Module Migration)
 * Current Week: 1 (Types, Utils, Database)
 *
 * Expected completion: 4 weeks from 2025-01-17
 *
 * DO NOT USE IN PRODUCTION - Alpha release for development only
 */
