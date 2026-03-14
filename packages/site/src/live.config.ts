import { defineLiveCollection } from 'astro:content'
import { flareLiveLoader } from '@flare-cms/astro'

const API_URL = import.meta.env.PUBLIC_FLARE_API_URL || 'http://localhost:8787'
const API_TOKEN = import.meta.env.PUBLIC_FLARE_API_TOKEN

// All collections use flareLiveLoader for real-time content updates.
// Content is fetched from the CMS API at request time (SSR).
// No rebuild needed — Go Live in the admin and refresh the page.

// Blog posts collection — powered by Flare CMS
const blogPosts = defineLiveCollection({
  loader: flareLiveLoader({
    apiUrl: API_URL,
    collection: 'blog-posts',
    apiToken: API_TOKEN,
    filter: { status: 'published' },
  }),
})

// News articles collection
const news = defineLiveCollection({
  loader: flareLiveLoader({
    apiUrl: API_URL,
    collection: 'news',
    apiToken: API_TOKEN,
    filter: { status: 'published' },
  }),
})

// Documentation pages
const docs = defineLiveCollection({
  loader: flareLiveLoader({
    apiUrl: API_URL,
    collection: 'docs',
    apiToken: API_TOKEN,
    filter: { status: 'published' },
  }),
})

// Documentation sections (for navigation)
const docsSections = defineLiveCollection({
  loader: flareLiveLoader({
    apiUrl: API_URL,
    collection: 'docs-sections',
    apiToken: API_TOKEN,
    filter: { status: 'published' },
  }),
})

// Dynamic pages (about, terms, etc.)
const pages = defineLiveCollection({
  loader: flareLiveLoader({
    apiUrl: API_URL,
    collection: 'pages',
    apiToken: API_TOKEN,
    filter: { status: 'published' },
  }),
})

export const collections = { blogPosts, news, docs, docsSections, pages }
