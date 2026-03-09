// Shared MiniSearch configuration
// Used by both server (index builder) and client (index loader)
// CRITICAL: Options must match exactly for MiniSearch.loadJSON() to work

export const SEARCH_FIELDS = ['title', 'content', 'headingText'] as const

export const SEARCH_STORE_FIELDS = [
  'title', 'section', 'sectionSlug', 'slug', 'headingId', 'headingText',
] as const

export const MINISEARCH_OPTIONS = {
  fields: [...SEARCH_FIELDS],
  storeFields: [...SEARCH_STORE_FIELDS],
  searchOptions: {
    boost: { title: 3, headingText: 2 },
    fuzzy: 0.2,
    prefix: true,
    combineWith: 'OR' as const,
  },
}

export interface SearchDocument {
  id: string
  title: string
  content: string
  section: string
  sectionSlug: string
  slug: string
  headingId: string
  headingText: string
}

/**
 * Strip markdown syntax for search indexing.
 * Removes headings, bold, italic, code blocks, inline code,
 * links, images, blockquotes, list markers, and collapses whitespace.
 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')            // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1')       // bold
    .replace(/\*([^*]+)\*/g, '$1')           // italic
    .replace(/`{3}[\s\S]*?`{3}/g, ' ')      // code blocks
    .replace(/`([^`]+)`/g, '$1')             // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // images
    .replace(/>\s+/gm, '')                   // blockquotes
    .replace(/[-*+]\s+/gm, '')              // list markers
    .replace(/\d+\.\s+/gm, '')              // numbered lists
    .replace(/\s+/g, ' ')
    .trim()
}
