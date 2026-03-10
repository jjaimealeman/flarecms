// src/lib/flare.ts — Preview draft content only
// All other content fetching is handled by Astro Content Layer (astro:content)

const API_URL = import.meta.env.PUBLIC_FLARE_API_URL || 'http://localhost:8787'

// --- Preview Drafts ---

export interface DraftContent {
  collectionId: string
  contentId: string
  title: string
  slug: string
  status: string
  data: Record<string, any>
  userId: string
  createdAt: number
}

export async function getDraftContent(token: string): Promise<DraftContent | null> {
  try {
    const response = await fetch(
      `${API_URL}/api/preview/draft/${encodeURIComponent(token)}`,
    )

    if (!response.ok) {
      return null
    }

    const result = await response.json()
    return result.data as DraftContent
  } catch {
    return null
  }
}
