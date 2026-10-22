import { CATEGORIES, CATEGORY_LABELS } from '@/domain/article'
import {
  NewsSourceError,
  type FetchContext,
  type NewsSource,
  type SourceCapabilities,
} from '@/domain/news-source'
import type { ArticlePage, ArticleQuery } from '@/domain/query'
import { demoPayload, planRecovery } from '@/sources/demo'
import { apiBase, buildQuery, fetchJson } from '@/sources/http'
import { isUsable, toArticle, toNewsApiCategory } from './mapper'
import type { NewsApiResponse } from './types'

/**
 * `/top-headlines` is the only endpoint that understands `category`, so a query
 * carrying one goes there, keyword included. It accepts `q` alongside
 * `category` (verified live) over a smaller corpus.
 */
function usesTopHeadlines(query: ArticleQuery): boolean {
  return query.categories.length > 0
}

/**
 * NewsAPI.org. 100 requests/day, a 24-hour article delay, and no CORS at all
 * (hence the proxy). Filters are split across two endpoints that cannot be
 * combined:
 *
 *            | /everything       | /top-headlines
 *   keyword  | yes, full archive | yes, headlines only
 *   category | no                | yes, one at a time
 *   dates    | yes               | ignored
 *
 * `capabilities` reports whatever the chosen endpoint could not honour.
 */
export const newsapiSource: NewsSource = {
  id: 'newsapi',
  label: 'NewsAPI',

  capabilities: (query: ArticleQuery): SourceCapabilities => {
    const topHeadlines = usesTopHeadlines(query)
    const first = query.categories[0]
    return {
      // No author parameter on either endpoint.
      authorFilter: false,
      // Only /top-headlines filters by category, and only one at a time.
      categoryFilter: topHeadlines && query.categories.length === 1,
      // /top-headlines silently ignores `from`/`to`.
      dateRangeFilter: !topHeadlines,
      // A second category is not something the browser can re-apply: those
      // articles were never in the response.
      ...(topHeadlines && query.categories.length > 1 && first
        ? {
            caveats: [
              `NewsAPI returns one category per request, so it contributed ${CATEGORY_LABELS[first]} only.`,
            ],
          }
        : {}),
    }
  },

  supportedCategories: CATEGORIES,

  async fetchArticles(query: ArticleQuery, context: FetchContext): Promise<ArticlePage> {
    const keyword = query.keyword.trim()
    const topHeadlines = usesTopHeadlines(query)
    const category = query.categories[0]

    const search = topHeadlines
      ? buildQuery({
          category: category ? toNewsApiCategory(category) : undefined,
          q: keyword || undefined,
          language: 'en',
          page: query.page,
          pageSize: query.pageSize,
        })
      : buildQuery({
          // `/everything` rejects a request with no query at all.
          q: keyword || 'news',
          from: query.dateFrom,
          to: query.dateTo,
          language: 'en',
          sortBy: keyword ? 'relevancy' : 'publishedAt',
          page: query.page,
          pageSize: query.pageSize,
        })

    const endpoint = topHeadlines ? 'top-headlines' : 'everything'
    const url = `${apiBase('newsapi')}/${endpoint}${search}`
    let data = await fetchJson<NewsApiResponse>('newsapi', url, context)

    // NewsAPI reports rate limits and bad keys as HTTP 200 with status:"error",
    // which the shared transport cannot classify.
    if (data.status === 'error') {
      const error = new NewsSourceError(
        'newsapi',
        data.message ?? 'NewsAPI returned an error',
        data.code === 'rateLimited'
          ? 'rate-limited'
          : data.code === 'apiKeyInvalid' ||
              data.code === 'apiKeyMissing' ||
              data.code === 'apiKeyDisabled'
            ? 'auth'
            : 'unknown',
      )
      const recovery = planRecovery(context, error)
      if (!recovery) throw error
      data = demoPayload<NewsApiResponse>('newsapi', url, recovery)
    }

    const raw = (data.articles ?? []).filter(isUsable)
    const total = data.totalResults ?? raw.length

    return {
      // /top-headlines knows the category it was asked for; /everything
      // carries none, which is why a category forces the other endpoint.
      articles: raw.map((item) => toArticle(item, topHeadlines ? category : undefined)),
      totalResults: total,
      hasMore: query.page * query.pageSize < total,
    }
  },
}
