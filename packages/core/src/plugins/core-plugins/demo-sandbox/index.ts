/**
 * Demo Sandbox Plugin
 *
 * Provides a public-facing sandbox experience for visitors to explore Flare CMS.
 * Creates scoped demo users (viewer role + editor permission on demo-sandbox-collection).
 *
 * Routes (Phase 12): POST /demo/signup — creates demo user and returns token
 */

import { PluginBuilder } from '../../sdk/plugin-builder'
import type { Plugin } from '@flare-cms/core'

export function createDemoSandboxPlugin(): Plugin {
  const builder = PluginBuilder.create({
    name: 'demo-sandbox',
    version: '1.0.0',
    description: 'Public demo sandbox for visitors to explore Flare CMS'
  })

  builder.metadata({
    author: {
      name: 'Flare CMS Team',
      email: 'team@flarecms.dev'
    },
    license: 'MIT',
    compatibility: '^2.1.0'
  })

  // Lifecycle hooks
  builder.lifecycle({
    activate: async () => {
      console.info('[demo-sandbox] plugin activated')
    },
    deactivate: async () => {
      console.info('[demo-sandbox] plugin deactivated')
    }
  })

  return builder.build() as Plugin
}

export const demoSandboxPlugin = createDemoSandboxPlugin()
