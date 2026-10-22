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
 * `/top-headlines` is the only endpoint that understands `category`, so any
 * query carrying one has to go there — keyword included. It accepts `q`
 * alongside `category` (verified live), it just searches a much smaller corpus.
 * Serving a narrow, correct result beats serving a broad, unfiltered one.
 */
function usesTopHeadlines(query: ArticleQuery): boolean {
  return query.categories.length > 0
}

/**
 * NewsAPI.org.
 *
 * The only provider of the three that aggregates many outlets, which is what
 * makes the result set look like an actual news aggregator rather than two
 * newspapers. It is also by far the most constrained: 100 requests/day, a 24-hour
 * article delay, and no cross-origin access at all (hence the proxy).
 *
 * It splits functionality across two endpoints that cannot be combined, and the
 * split is lopsided:
 *
 * | | `/everything` | `/top-headlines` |
 * | --- | --- | --- |
 * | keyword  | yes, full archive | yes, headlines only |
 * | category | **no**            | yes, one at a time |
 * | dates    | yes               | **ignored** |
 *
 * The adapter picks the endpoint and reports, through `capabilities`, which
 * filters it could not honour for that particular query — so `useArticles`
 * applies those in the browser rather than returning results that ignore them.
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
      // A second category is not a filter the browser can re-apply — those
      // articles were never in the response. Say so instead of looking broken.
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
          // `/everything` rejects a request with no query at all, so fall back to
          // a broad term when the user has not typed anything.
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

    // NewsAPI reports rate limiting and bad keys as HTTP 200 with status:"error",
    // so the shared transport layer cannot classify them; do it here.
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
      // /top-headlines knows the category it was asked for, so every article it
      // returns can be tagged. /everything cannot: it carries no category data,
      // which is exactly why a category forces the other endpoint.
      articles: raw.map((item) => toArticle(item, topHeadlines ? category : undefined)),
      totalResults: total,
      hasMore: query.page * query.pageSize < total,
    }
  },
}
