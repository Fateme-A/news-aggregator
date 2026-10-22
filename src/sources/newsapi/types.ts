/**
 * NewsAPI.org wire format.
 *
 * Derived from recorded live responses (`src/test/fixtures/newsapi-*.json`).
 * `/everything` and `/top-headlines` return an identical article shape, which is
 * what lets one mapper serve both endpoints.
 */

export interface NewsApiArticle {
  source: { id: string | null; name: string }
  author: string | null
  title: string | null
  description: string | null
  url: string
  urlToImage: string | null
  publishedAt: string
  content: string | null
}

export interface NewsApiResponse {
  status: 'ok' | 'error'
  totalResults?: number
  articles?: NewsApiArticle[]
  /** Present only when `status === 'error'`. */
  code?: string
  message?: string
}

/** The seven categories `/top-headlines` accepts. */
export type NewsApiCategory =
  'business' | 'entertainment' | 'general' | 'health' | 'science' | 'sports' | 'technology'
