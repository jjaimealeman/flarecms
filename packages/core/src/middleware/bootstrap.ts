import { Context, Hono, Next, Env } from "hono";
import { syncCollections } from "../services/collection-sync";
import { MigrationService } from "../services/migrations";
import { PluginBootstrapService } from "../services/plugin-bootstrap";
import type { FlareConfig } from "../app";

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
};

// Track if bootstrap has been run in this worker instance
let bootstrapComplete = false;

// Module-level app reference — set by createFlareApp() so PluginManager
// can include it in PluginContext during initialize()
// Typed as Hono<any> to accept any Hono app regardless of env generics
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let appReference: Hono<any> | undefined;

/**
 * Get the Hono app reference stored during bootstrap.
 * Used by PluginManager to thread app into PluginContext.activate().
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAppReference(): Hono<any> | undefined {
  return appReference;
}

/**
 * Bootstrap middleware that ensures system initialization
 * Runs once per worker instance
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function bootstrapMiddleware(config: FlareConfig = {}, app?: Hono<any>) {
  // Store app reference at module level so PluginManager can access it
  if (app) {
    appReference = app;
  }
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    // Skip if already bootstrapped in this worker instance
    if (bootstrapComplete) {
      return next();
    }

    // Skip bootstrap for static assets and health checks
    const path = c.req.path;
    if (
      path.startsWith("/images/") ||
      path.startsWith("/assets/") ||
      path === "/health" ||
      path.endsWith(".js") ||
      path.endsWith(".css") ||
      path.endsWith(".png") ||
      path.endsWith(".jpg") ||
      path.endsWith(".ico")
    ) {
      return next();
    }

    try {
      console.log("[Bootstrap] Starting system initialization...");

      // 1. Run database migrations first
      console.log("[Bootstrap] Running database migrations...");
      const migrationService = new MigrationService(c.env.DB);
      await migrationService.runPendingMigrations();

      // 2. Sync collection configurations
      console.log("[Bootstrap] Syncing collection configurations...");
      try {
        await syncCollections(c.env.DB);
      } catch (error) {
        console.error("[Bootstrap] Error syncing collections:", error);
        // Continue bootstrap even if collection sync fails
      }

      // 3. Bootstrap core plugins (unless disableAll is set)
      if (!config.plugins?.disableAll) {
        console.log("[Bootstrap] Bootstrapping core plugins...");
        const bootstrapService = new PluginBootstrapService(c.env.DB);

        // Check if bootstrap is needed
        const needsBootstrap = await bootstrapService.isBootstrapNeeded();
        if (needsBootstrap) {
          await bootstrapService.bootstrapCorePlugins();
        }
      } else {
        console.log("[Bootstrap] Plugin bootstrap skipped (disableAll is true)");
      }

      // Mark bootstrap as complete for this worker instance
      bootstrapComplete = true;
      console.log("[Bootstrap] System initialization completed");
    } catch (error) {
      console.error("[Bootstrap] Error during system initialization:", error);
      // Don't prevent the app from starting, but log the error
    }

    return next();
  };
}

/**
 * Reset bootstrap flag (useful for testing)
 */
export function resetBootstrap() {
  bootstrapComplete = false;
}
