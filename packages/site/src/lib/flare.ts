// src/lib/flare.ts

const API_URL = import.meta.env.FLARE_API_URL || "http://localhost:8787";
const API_TOKEN = import.meta.env.FLARE_API_TOKEN;

interface FlareResponse<T> {
  data: T;
  meta: {
    count: number;
    timestamp: string;
    cache: {
      hit: boolean;
      source: string;
    };
  };
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  data: {
    title: string;
    slug: string;
    excerpt?: string;
    content: string;
    featuredImage?: string;
    publishedAt?: string;
  };
  created_at: number;
  updated_at: number;
}

// Fetch all blog posts
export async function getBlogPosts(): Promise<BlogPost[]> {
  const response = await fetch(
    `${API_URL}/api/collections/blog-posts/content?filter[status][equals]=published&sort=-created_at`,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.statusText}`);
  }

  const result: FlareResponse<BlogPost[]> = await response.json();
  // return result.data;
  return result.data.filter((post) => post.status === "published");
}

export async function getBlogPostBySlug(
  slug: string,
): Promise<BlogPost | null> {
  const response = await fetch(`${API_URL}/api/collections/blog-posts/content`);

  if (!response.ok) {
    throw new Error(`Failed to fetch post: ${response.statusText}`);
  }

  const result: FlareResponse<BlogPost[]> = await response.json();
  // return result.data.find((post) => post.data.slug === slug) || null;
  return (
    result.data.find(
      (post) => post.data.slug === slug && post.status === "published",
    ) || null
  );
}

// --- News ---

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  status: string;
  data: {
    title: string;
    content: string;
    publish_date?: string;
    author?: string;
    category?: 'technology' | 'business' | 'general';
  };
  created_at: number;
  updated_at: number;
}

export async function getNewsArticles(): Promise<NewsArticle[]> {
  const response = await fetch(
    `${API_URL}/api/collections/news/content`,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch news: ${response.statusText}`);
  }

  const result: FlareResponse<NewsArticle[]> = await response.json();
  return result.data.filter((article) => article.status === 'published');
}

export async function getNewsArticleBySlug(
  slug: string,
): Promise<NewsArticle | null> {
  const response = await fetch(`${API_URL}/api/collections/news/content`);

  if (!response.ok) {
    throw new Error(`Failed to fetch news article: ${response.statusText}`);
  }

  const result: FlareResponse<NewsArticle[]> = await response.json();
  return (
    result.data.find(
      (article) => article.slug === slug && article.status === 'published',
    ) || null
  );
}

// --- Pages ---

interface Page {
  id: string;
  title: string;
  slug: string;
  status: string;
  data: {
    title: string;
    slug?: string;
    content: string;
    meta_description?: string;
  };
  created_at: number;
  updated_at: number;
}

export async function getPages(): Promise<Page[]> {
  const response = await fetch(`${API_URL}/api/collections/pages/content`);

  if (!response.ok) {
    throw new Error(`Failed to fetch pages: ${response.statusText}`);
  }

  const result: FlareResponse<Page[]> = await response.json();
  return result.data.filter((page) => page.status === 'published');
}

export async function getPageBySlug(
  slug: string,
): Promise<Page | null> {
  const response = await fetch(`${API_URL}/api/collections/pages/content`);

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.statusText}`);
  }

  const result: FlareResponse<Page[]> = await response.json();
  return (
    result.data.find(
      (page) => page.slug === slug && page.status === 'published',
    ) || null
  );
}

// Fetch all collections
export async function getCollections() {
  const response = await fetch(`${API_URL}/api/collections`);

  if (!response.ok) {
    throw new Error(`Failed to fetch collections: ${response.statusText}`);
  }

  return response.json();
}

// Generic content fetcher
export async function getContent<T>(
  collection: string,
  options?: {
    limit?: number;
    offset?: number;
    sort?: string;
    filters?: Record<string, string>;
  },
): Promise<FlareResponse<T[]>> {
  const params = new URLSearchParams();

  if (options?.limit) params.set("limit", options.limit.toString());
  if (options?.offset) params.set("offset", options.offset.toString());
  if (options?.sort) params.set("sort", options.sort);
  if (options?.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      params.set(`filter[${key}]`, value);
    });
  }

  const url = `${API_URL}/api/collections/${collection}/content?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.statusText}`);
  }

  return response.json();
}
