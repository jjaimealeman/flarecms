// src/lib/docs-nav.ts

/** Minimal shape expected by buildNavTree for section entries */
export interface DocsSectionEntry {
  id: string
  title?: string
  slug?: string
  data: {
    name?: string
    slug?: string
    icon?: string
    order?: number
    [key: string]: any
  }
}

/** Minimal shape expected by buildNavTree for doc page entries */
export interface DocsPageEntry {
  id: string
  title?: string
  slug?: string
  data: {
    title?: string
    slug?: string
    section?: string
    order?: number
    content?: string
    [key: string]: any
  }
}

export interface NavPage {
  title: string
  slug: string
  href: string
  sectionSlug: string
  sectionName: string
}

export interface NavSection {
  name: string
  slug: string
  icon?: string
  pages: NavPage[]
}

/**
 * Build a navigation tree from sections and pages.
 * Groups pages under their parent section using doc.data.section (content ID).
 */
export function buildNavTree(
  sections: DocsSectionEntry[],
  docs: DocsPageEntry[],
): NavSection[] {
  return sections.map((section) => {
    const sectionSlug = section.data.slug || section.slug
    const sectionName = section.data.name || section.title

    const pages = docs
      .filter((doc) => doc.data.section === section.id)
      .map((doc) => {
        const pageSlug = doc.data.slug || doc.slug
        return {
          title: doc.data.title || doc.title,
          slug: pageSlug,
          href: `/docs/${sectionSlug}/${pageSlug}`,
          sectionSlug,
          sectionName,
        }
      })

    return {
      name: sectionName,
      slug: sectionSlug,
      icon: section.data.icon,
      pages,
    }
  })
}

/**
 * Flatten all pages from all sections into a single ordered array
 * for prev/next navigation. Order is preserved from the sorted input.
 */
export function flattenForPrevNext(navSections: NavSection[]): NavPage[] {
  return navSections.flatMap((section) => section.pages)
}
