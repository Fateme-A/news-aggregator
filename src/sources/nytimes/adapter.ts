import { CATEGORIES } from '@/domain/article'
import type { NewsSource } from '@/domain/news-source'
import type { ArticlePage, ArticleQuery } from '@/domain/query'
import { apiBase, buildQuery, fetchJson } from '@/sources/http'
import { buildFilterQuery, toArticle, toNytDate } from './mapper'
import type { NytSearchResponse } from './types'

/** Article Search returns a fixed 10 documents per page and ignores any page-size hint. */
const NYT_PAGE_SIZE = 10

/**
 * NYT Article Search v2.
 *
 * Deepest archive of the three (back to 1851) and the richest byline data, but
 * the tightest rate limit — 5 requests/minute, 500/day. That ceiling is why the
 * keyword input is debounced and why TanStack Query is configured with a long
 * `staleTime`; this adapter would otherwise trip a 429 during normal typing.
 */
export const nytimesSource: NewsSource = {
  id: 'nytimes',
  label: 'The New York Times',

  capabilities: {
    authorFilter: true,
    categoryFilter: true,
    dateRangeFilter: true,
  },

  supportedCategories: CATEGORIES,

  async fetchArticles(query: ArticleQuery, signal?: AbortSignal): Promise<ArticlePage> {
    const search = buildQuery({
      q: query.keyword.trim() || undefined,
      begin_date: toNytDate(query.dateFrom),
      end_date: toNytDate(query.dateTo),
      fq: buildFilterQuery(query.categories, query.authors),
      // The API is 0-indexed; our domain is 1-indexed.
      page: query.page - 1,
      sort: query.keyword.trim() ? 'relevance' : 'newest',
    })

    const data = await fetchJson<NytSearchResponse>(
      'nytimes',
      `${apiBase('nytimes')}/articlesearch.json${search}`,
      signal,
    )

    const docs = data.response?.docs ?? []
    const hits = data.response?.metadata?.hits

    return {
      articles: docs.map(toArticle),
      ...(hits === undefined ? {} : { totalResults: hits }),
      // The API caps pagination at 100 pages regardless of reported hits.
      hasMore: docs.length === NYT_PAGE_SIZE && query.page < 100,
    }
  },
}
