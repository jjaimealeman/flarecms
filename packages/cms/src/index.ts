/**
 * Flare CMS Application
 *
 * Entry point for your Flare CMS headless application
 */

import { createFlareApp, registerCollections, SchedulerService } from '@flare-cms/core'
import type { FlareConfig } from '@flare-cms/core'
import { validateBindingsMiddleware } from './middleware/validate-bindings'

// Import your collection configurations
// Add new collections here after creating them in src/collections/
import blogPostsCollection from './collections/blog-posts.collection'
import docsSectionsCollection from './collections/docs-sections.collection'
import docsCollection from './collections/docs.collection'

// Register collections BEFORE creating the app
// This ensures they are synced to the database on startup
registerCollections([
  blogPostsCollection,
  docsSectionsCollection,
  docsCollection,
])

// Application configuration
const config: FlareConfig = {
  collections: {
    autoSync: true
  },
  plugins: {
    directory: './src/plugins',
    autoLoad: false  // Set to true to auto-load custom plugins
  },
  middleware: {
    beforeAuth: [validateBindingsMiddleware()]
  }
}

// Create the application
const app = createFlareApp(config)

// Export Workers module with both fetch and scheduled handlers
export default {
  fetch: app.fetch.bind(app),
  async scheduled(controller: ScheduledController, env: any, ctx: ExecutionContext) {
    const scheduler = new SchedulerService(env.DB, env, ctx)
    ctx.waitUntil(scheduler.processScheduledContent())
  },
}
