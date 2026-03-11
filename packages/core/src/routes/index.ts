/**
 * Routes Module Exports
 *
 * Routes are being migrated incrementally from the monolith.
 * Each route is refactored to remove monolith-specific dependencies.
 */

// API routes
export { default as apiRoutes } from './api'
export { default as apiContentCrudRoutes } from './api-content-crud'
export { default as apiMediaRoutes } from './api-media'
export { default as apiSystemRoutes } from './api-system'
export { default as adminApiRoutes } from './admin-api'

// Auth routes
export { default as authRoutes } from './auth'

// Test routes (only for development/test environments)
export { default as testCleanupRoutes } from './test-cleanup'

// Admin UI routes
export { default as adminContentRoutes } from './admin-content'
export { userRoutes as adminUsersRoutes } from './admin-users'
export { adminMediaRoutes } from './admin-media'
export { adminPluginRoutes } from './admin-plugins'
export { adminLogsRoutes } from './admin-logs'
export { default as adminTestimonialsRoutes } from './admin-testimonials'
export { default as adminCodeExamplesRoutes } from './admin-code-examples'
export { adminDashboardRoutes } from './admin-dashboard'
export { adminCollectionsRoutes } from './admin-collections'
export { adminSettingsRoutes } from './admin-settings'
export { adminFormsRoutes } from './admin-forms'
export { adminFaqRoutes } from './admin-faq'
export { default as apiFaqRoutes } from './api-faq'
export { default as publicFormsRoutes } from './public-forms'
export { adminApiReferenceRoutes } from './admin-api-reference'
export { adminApiTokensRoutes } from './admin-api-tokens'
export { adminPreviewRoutes } from './admin-preview'
export { adminSchemaMigrationsRoutes } from './admin-schema-migrations'

export const ROUTES_INFO = {
  message: 'Core routes available',
  available: [
    'apiRoutes',
    'apiContentCrudRoutes',
    'apiMediaRoutes',
    'apiSystemRoutes',
    'adminApiRoutes',
    'authRoutes',
    'testCleanupRoutes',
    'adminContentRoutes',
    'adminUsersRoutes',
    'adminMediaRoutes',
    'adminPluginRoutes',
    'adminLogsRoutes',
    'adminTestimonialsRoutes',
    'adminCodeExamplesRoutes',
    'adminDashboardRoutes',
    'adminCollectionsRoutes',
    'adminSettingsRoutes',
    'adminFormsRoutes',
    'adminFaqRoutes',
    'apiFaqRoutes',
    'publicFormsRoutes',
    'adminApiReferenceRoutes',
    'adminApiTokensRoutes',
    'adminPreviewRoutes',
    'adminSchemaMigrationsRoutes'
  ],
  status: 'Core package routes ready',
  reference: 'https://github.com/jjaimealeman/flarecms'
} as const
