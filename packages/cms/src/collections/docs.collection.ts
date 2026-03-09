/**
 * Documentation Collection
 *
 * Documentation pages with markdown content, organized by section
 */

import type { CollectionConfig } from '@flare-cms/core'

export default {
  name: 'docs',
  displayName: 'Documentation',
  description: 'Documentation pages with markdown content',

  schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Title',
        required: true,
        maxLength: 200
      },
      slug: {
        type: 'slug',
        title: 'URL Slug',
        required: true,
        maxLength: 200
      },
      excerpt: {
        type: 'textarea',
        title: 'Excerpt / Meta Description',
        maxLength: 300,
        helpText: 'Brief summary for SEO and page previews'
      },
      content: {
        type: 'mdxeditor',
        title: 'Content',
        required: true,
        helpText: 'Write documentation in Markdown'
      },
      section: {
        type: 'reference',
        title: 'Section',
        required: true,
        collection: 'docs-sections',
        helpText: 'Which documentation section this page belongs to'
      },
      order: {
        type: 'number',
        title: 'Sort Order',
        default: 0,
        helpText: 'Position within the section. Lower numbers appear first.'
      },
      status: {
        type: 'select',
        title: 'Status',
        enum: ['draft', 'published'],
        enumLabels: ['Draft', 'Published'],
        default: 'draft'
      },
      lastUpdated: {
        type: 'datetime',
        title: 'Last Updated',
        helpText: 'When this page was last modified'
      }
    },
    required: ['title', 'slug', 'content', 'section']
  },

  listFields: ['title', 'section', 'status', 'order'],
  searchFields: ['title', 'excerpt'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'desc'
} satisfies CollectionConfig
