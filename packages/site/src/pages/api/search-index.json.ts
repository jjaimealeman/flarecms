import type { APIRoute } from 'astro'
import MiniSearch from 'minisearch'
import {
  getDocsPages,
  getDocsSections,
  getBlogPosts,
  getNewsArticles,
} from '../../lib/flare'
import {
  MINISEARCH_OPTIONS,
  stripMarkdown,
  type SearchDocument,
} from '../../lib/search-config'

export const GET: APIRoute = async () => {
  try {
    const [sections, docs, blogPosts, newsArticles] = await Promise.all([
      getDocsSections(),
      getDocsPages(),
      getBlogPosts(),
      getNewsArticles(),
    ])

    const sectionMap = new Map(
      sections.map((s) => [s.id, { name: s.data.name, slug: s.data.slug }])
    )

    const documents: SearchDocument[] = []

    // Index docs pages with heading-level sub-documents
    for (const doc of docs) {
      const section = sectionMap.get(doc.data.section)
      if (!section) continue

      const plainContent = stripMarkdown(doc.data.content || '')

      // Main page document
      documents.push({
        id: doc.id,
        title: doc.data.title,
        content: plainContent,
        section: section.name,
        sectionSlug: section.slug,
        slug: doc.data.slug,
        headingId: '',
        headingText: '',
      })

      // Per-heading sub-documents for deep linking
      const headingRegex = /^(#{2,3})\s+(.+)$/gm
      let match
      while ((match = headingRegex.exec(doc.data.content || '')) !== null) {
        const text = match[2].trim()
        const id = text
          .toLowerCase()
          .replace(/[^\w]+/g, '-')
          .replace(/^-|-$/g, '')

        documents.push({
          id: `${doc.id}#${id}`,
          title: doc.data.title,
          content: text,
          section: section.name,
          sectionSlug: section.slug,
          slug: doc.data.slug,
          headingId: id,
          headingText: text,
        })
      }
    }

    // Index blog posts
    for (const post of blogPosts) {
      const plainContent = stripMarkdown(post.data.content || '')

      documents.push({
        id: post.id,
        title: post.data.title,
        content: plainContent,
        section: 'Blog',
        sectionSlug: 'blog',
        slug: post.data.slug || post.slug,
        headingId: '',
        headingText: '',
      })
    }

    // Index news articles
    for (const article of newsArticles) {
      const plainContent = stripMarkdown(article.data.content || '')

      documents.push({
        id: article.id,
        title: article.data.title || article.title,
        content: plainContent,
        section: 'News',
        sectionSlug: 'news',
        slug: article.slug,
        headingId: '',
        headingText: '',
      })
    }

    const miniSearch = new MiniSearch(MINISEARCH_OPTIONS)
    miniSearch.addAll(documents)

    return new Response(JSON.stringify(miniSearch), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    })
  } catch (error) {
    console.error('Failed to build search index:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to build search index' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
