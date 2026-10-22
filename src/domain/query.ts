import type { Article, Category, SourceId } from './article'

/**
 * A provider-agnostic description of what the user is asking for. Adapters
 * translate it; anything a provider cannot express server-side is declared in
 * its `SourceCapabilities` and applied client-side instead.
 */
export interface ArticleQuery {
  /** Free-text search. Empty string means "no keyword constraint". */
  keyword: string
  /** Inclusive lower bound, `YYYY-MM-DD`. */
  dateFrom?: string
  /** Inclusive upper bound, `YYYY-MM-DD`. */
  dateTo?: string
  /** Empty means "any category". */
  categories: Category[]
  /** Author names to narrow to. Empty means "any author". */
  authors: string[]
  /** 1-based. */
  page: number
  /** Requested page size; providers clamp this to their own maximum. */
  pageSize: number
}

export interface ArticlePage {
  articles: Article[]
  /** Total matches reported by the provider, when it reports one. */
  totalResults?: number
  /** Whether another page is available. */
  hasMore: boolean
}

export const DEFAULT_PAGE_SIZE = 12

export function createEmptyQuery(): ArticleQuery {
  return {
    keyword: '',
    categories: [],
    authors: [],
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}

/**
 * Stable cache key for a query as seen by one source. Arrays are sorted so a
 * different selection order is not a cache miss, which costs real quota
 * against NewsAPI's 100/day and the NYT's 5/minute.
 */
export function queryCacheKey(sourceId: SourceId, query: ArticleQuery): unknown[] {
  return [
    'articles',
    sourceId,
    query.keyword.trim().toLowerCase(),
    query.dateFrom ?? null,
    query.dateTo ?? null,
    [...query.categories].sort(),
    [...query.authors].map((a) => a.toLowerCase()).sort(),
    query.page,
    query.pageSize,
  ]
}
