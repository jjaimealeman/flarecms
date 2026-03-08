import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeCallouts from 'rehype-callouts'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeRaw from 'rehype-raw'
import rehypeStringify from 'rehype-stringify'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import type { Root, Element, ElementContent } from 'hast'
import type { Plugin } from 'unified'

// Shiki JS engine -- no WASM, works on Cloudflare Workers
const jsEngine = createJavaScriptRegexEngine()

// ---------- Custom rehype plugin: tab groups ----------

const CATEGORY_MAP: Record<string, string> = {
  typescript: 'language',
  javascript: 'language',
  ts: 'language',
  js: 'language',
  python: 'language',
  ruby: 'language',
  go: 'language',
  rust: 'language',
  npm: 'package-manager',
  pnpm: 'package-manager',
  yarn: 'package-manager',
  bun: 'package-manager',
}

function inferCategory(labels: string[]): string {
  const normalized = labels.map((l) => l.toLowerCase().trim())
  const categories = normalized
    .map((l) => CATEGORY_MAP[l])
    .filter(Boolean)
  if (categories.length === normalized.length && new Set(categories).size === 1) {
    return categories[0]
  }
  return ''
}

function getTabLabel(figure: Element): string | null {
  // Check figure-level data-tab property
  const figTab = figure.properties?.['dataTab'] as string | undefined
  if (figTab) return figTab

  // Check pre and code elements inside the figure
  for (const child of figure.children) {
    if (child.type === 'element' && child.tagName === 'pre') {
      const preTab = child.properties?.['dataTab'] as string | undefined
      if (preTab) return preTab
      for (const inner of child.children) {
        if (inner.type === 'element' && inner.tagName === 'code') {
          const codeTab = inner.properties?.['dataTab'] as string | undefined
          if (codeTab) return codeTab
        }
      }
    }
  }

  return null
}

let tabGroupCounter = 0

const rehypeTabGroups: Plugin<[], Root> = () => {
  return (tree: Root) => {
    tabGroupCounter = 0
    processChildren(tree)
  }
}

function processChildren(node: Root | Element): void {
  const children = node.children
  if (!children) return

  // First, recurse into child elements
  for (const child of children) {
    if (child.type === 'element') {
      processChildren(child)
    }
  }

  // Then, look for consecutive tab figures at this level
  let i = 0
  while (i < children.length) {
    const child = children[i]

    if (
      child.type === 'element' &&
      child.properties?.['dataRehypePrettyCodeFigure'] !== undefined &&
      getTabLabel(child)
    ) {
      const group: { figure: Element; label: string }[] = []
      let j = i

      while (j < children.length) {
        const el = children[j]
        if (
          el.type === 'element' &&
          el.properties?.['dataRehypePrettyCodeFigure'] !== undefined
        ) {
          const label = getTabLabel(el)
          if (label) {
            group.push({ figure: el, label })
            j++
            continue
          }
        }
        break
      }

      if (group.length >= 2) {
        const labels = group.map((g) => g.label)
        let category = inferCategory(labels)
        if (!category) {
          category = `auto-${tabGroupCounter++}`
        }

        const buttons: ElementContent[] = group.map((g, idx) => ({
          type: 'element' as const,
          tagName: 'button',
          properties: {
            dataTab: g.label,
            className: idx === 0 ? ['tab-btn', 'active'] : ['tab-btn'],
            type: 'button',
          },
          children: [{ type: 'text' as const, value: g.label }],
        }))

        const buttonBar: Element = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['tab-bar'] },
          children: buttons,
        }

        const panels: ElementContent[] = group.map((g, idx) => ({
          type: 'element' as const,
          tagName: 'div',
          properties: {
            dataTabPanel: g.label,
            className: idx === 0 ? ['tab-panel'] : ['tab-panel', 'hidden'],
          },
          children: [g.figure as ElementContent],
        }))

        const wrapper: Element = {
          type: 'element',
          tagName: 'div',
          properties: {
            className: ['tab-group'],
            dataTabGroup: category,
          },
          children: [buttonBar, ...panels],
        }

        children.splice(i, group.length, wrapper as ElementContent)
        i++
        continue
      }
    }

    i++
  }
}

// ---------- Pipeline (module-level singleton) ----------

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeCallouts, { theme: 'github' })
  .use(rehypePrettyCode, {
    theme: {
      dark: 'catppuccin-mocha',
      light: 'catppuccin-latte',
    },
    defaultLang: { block: 'plaintext' },
    keepBackground: false,
    filterMetaString(meta: string) {
      // Strip tab="..." from meta so rehype-pretty-code ignores it
      return meta.replace(/tab="[^"]*"/g, '').trim()
    },
    getHighlighter: async (options) => {
      const { createHighlighter } = await import('shiki')
      return createHighlighter({ ...options, engine: jsEngine })
    },
  })
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, {
    behavior: 'append',
    properties: {
      className: ['heading-anchor'],
      ariaHidden: true,
      tabIndex: -1,
    },
    content: {
      type: 'element',
      tagName: 'span',
      properties: { className: ['anchor-icon'] },
      children: [{ type: 'text', value: '#' }],
    },
  })
  .use(rehypeRaw)
  .use(rehypeExternalLinks, {
    target: '_blank',
    rel: ['noopener', 'noreferrer'],
  })
  .use(rehypeTabGroups)
  .use(rehypeStringify)

// ---------- Public API ----------

export interface RenderResult {
  html: string
  headings: Array<{ id: string; text: string; level: number }>
}

export async function renderMarkdown(markdown: string): Promise<RenderResult> {
  // Strip \r from Windows-style line endings (CMS stores \r\n which breaks meta string parsing)
  const result = await processor.process(markdown.replace(/\r\n?/g, '\n'))
  const html = String(result)
  const headings = extractHeadings(html)
  return { html, headings }
}

export function extractHeadings(
  html: string,
): Array<{ id: string; text: string; level: number }> {
  const headings: Array<{ id: string; text: string; level: number }> = []
  const regex = /<h([23])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h[23]>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    const text = match[3]
      .replace(/<a[^>]*class="heading-anchor"[^>]*>[\s\S]*?<\/a>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim()
    headings.push({ id: match[2], text, level: parseInt(match[1]) })
  }
  return headings
}
