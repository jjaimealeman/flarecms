import type { APIRoute } from 'astro'
import MiniSearch from 'minisearch'
import { getLiveCollection } from 'astro:content'
import {
  MINISEARCH_OPTIONS,
  stripMarkdown,
  type SearchDocument,
} from '../../lib/search-config'

export const GET: APIRoute = async () => {
  try {
    const [sectionsResult, docsResult, blogPostsResult, newsResult] = await Promise.all([
      getLiveCollection('docsSections'),
      getLiveCollection('docs'),
      getLiveCollection('blogPosts'),
      getLiveCollection('news'),
    ])
    const sections = sectionsResult?.entries || []
    const docs = docsResult?.entries || []
    const blogPosts = blogPostsResult?.entries || []
    const newsArticles = newsResult?.entries || []

    const sectionMap = new Map(
      sections.map((s) => [s.id, { name: s.data.name, slug: s.data.slug }])
    )

    const documents: SearchDocument[] = []

    // Index docs pages split by heading sections for deep linking
    for (const doc of docs) {
      const section = sectionMap.get(doc.data.section)
      if (!section) continue

      const rawContent = doc.data.content || ''

      // Split content into sections by h2/h3 headings
      // Each section = heading + body text until next heading
      const sectionRegex = /^(#{2,3})\s+(.+)$/gm
      const headingSplits: { text: string; id: string; startIdx: number }[] = []
      let match
      const seenIds = new Set<string>()

      while ((match = sectionRegex.exec(rawContent)) !== null) {
        const text = match[2].trim()
        const id = text
          .toLowerCase()
          .replace(/[^\w]+/g, '-')
          .replace(/^-|-$/g, '')

        // Skip duplicate heading IDs within same page
        if (seenIds.has(id)) continue
        seenIds.add(id)

        headingSplits.push({ text, id, startIdx: match.index })
      }

      if (headingSplits.length === 0) {
        // No headings — index full page as one document
        documents.push({
          id: doc.id,
          title: doc.data.title,
          content: stripMarkdown(rawContent),
          section: section.name,
          sectionSlug: section.slug,
          slug: doc.data.slug,
          headingId: '',
          headingText: '',
        })
      } else {
        // Content before first heading → main page document
        const preHeadingContent = rawContent.slice(0, headingSplits[0].startIdx)
        if (preHeadingContent.trim()) {
          documents.push({
            id: doc.id,
            title: doc.data.title,
            content: stripMarkdown(preHeadingContent),
            section: section.name,
            sectionSlug: section.slug,
            slug: doc.data.slug,
            headingId: '',
            headingText: '',
          })
        }

        // Each heading section: heading text + body until next heading
        for (let i = 0; i < headingSplits.length; i++) {
          const h = headingSplits[i]
          const endIdx = i + 1 < headingSplits.length
            ? headingSplits[i + 1].startIdx
            : rawContent.length
          const sectionBody = rawContent.slice(h.startIdx, endIdx)

          documents.push({
            id: `${doc.id}#${h.id}`,
            title: doc.data.title,
            content: stripMarkdown(sectionBody),
            section: section.name,
            sectionSlug: section.slug,
            slug: doc.data.slug,
            headingId: h.id,
            headingText: h.text,
          })
        }
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
        slug: post.data.slug || '',
        headingId: '',
        headingText: '',
      })
    }

    // Index news articles
    for (const article of newsArticles) {
      const plainContent = stripMarkdown(article.data.content || '')

      documents.push({
        id: article.id,
        title: article.data.title || '',
        content: plainContent,
        section: 'News',
        sectionSlug: 'news',
        slug: article.data.slug || '',
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
