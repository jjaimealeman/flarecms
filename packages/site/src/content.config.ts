import { defineCollection } from 'astro:content'
import { flareLoader } from '@flare-cms/astro'

const API_URL = import.meta.env.PUBLIC_FLARE_API_URL || 'http://localhost:8787'
const API_TOKEN = import.meta.env.PUBLIC_FLARE_API_TOKEN

// Blog posts collection — powered by Flare CMS
const blogPosts = defineCollection({
  loader: flareLoader({
    apiUrl: API_URL,
    collection: 'blog-posts',
    apiToken: API_TOKEN,
    filter: { status: 'published' },
  }),
})

// News articles collection
const news = defineCollection({
  loader: flareLoader({
    apiUrl: API_URL,
    collection: 'news',
    apiToken: API_TOKEN,
    filter: { status: 'published' },
  }),
})

// Documentation pages
const docs = defineCollection({
  loader: flareLoader({
    apiUrl: API_URL,
    collection: 'docs',
    apiToken: API_TOKEN,
    filter: { status: 'published' },
  }),
})

// Documentation sections (for navigation)
const docsSections = defineCollection({
  loader: flareLoader({
    apiUrl: API_URL,
    collection: 'docs-sections',
    apiToken: API_TOKEN,
    filter: { status: 'published' },
  }),
})

export const collections = { blogPosts, news, docs, docsSections }
