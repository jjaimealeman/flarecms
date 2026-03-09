/**
 * Docs Sections Collection
 *
 * Organizes documentation pages into navigable groups (e.g., Getting Started, API Reference)
 */

import type { CollectionConfig } from '@flare-cms/core'

export default {
  name: 'docs-sections',
  displayName: 'Docs Sections',
  description: 'Documentation sections for organizing docs pages',

  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Section Name',
        required: true,
        maxLength: 100,
        placeholder: 'Getting Started'
      },
      slug: {
        type: 'slug',
        title: 'URL Slug',
        required: true,
        maxLength: 100
      },
      description: {
        type: 'textarea',
        title: 'Description',
        maxLength: 300,
        helpText: 'Brief description of this section'
      },
      icon: {
        type: 'textarea',
        title: 'Icon (SVG)',
        helpText: 'Paste SVG markup here. No emojis — SVG icons only.',
        maxLength: 2000
      },
      color: {
        type: 'color',
        title: 'Accent Color',
        helpText: 'Subtle accent color for this section (hex code)'
      },
      order: {
        type: 'number',
        title: 'Sort Order',
        default: 0,
        helpText: 'Lower numbers appear first'
      }
    },
    required: ['name', 'slug']
  },

  listFields: ['name', 'order'],
  searchFields: ['name', 'description'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'asc'
} satisfies CollectionConfig
