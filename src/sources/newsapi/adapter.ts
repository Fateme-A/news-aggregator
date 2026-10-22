import { CATEGORIES } from '@/domain/article'
import { NewsSourceError, type NewsSource } from '@/domain/news-source'
import type { ArticlePage, ArticleQuery } from '@/domain/query'
import { recoverDemoPayload } from '@/sources/demo'
import { apiBase, buildQuery, fetchJson } from '@/sources/http'
import { isUsable, toArticle, toNewsApiCategory } from './mapper'
import type { NewsApiResponse } from './types'

/**
 * NewsAPI.org.
 *
 * The only provider of the three that aggregates many outlets, which is what
 * makes the result set look like an actual news aggregator rather than two
 * newspapers. It is also by far the most constrained: 100 requests/day, a 24-hour
 * article delay, and no cross-origin access at all (hence the proxy).
 *
 * It additionally splits functionality across two endpoints that cannot be
 * combined — `/everything` searches by keyword and date but knows nothing about
 * categories, while `/top-headlines` filters by category but ignores date ranges
 * and behaves poorly with a keyword. The adapter picks the right one and hides
 * the distinction entirely; callers only ever see an `ArticleQuery`.
 */
export const newsapiSource: NewsSource = {
  id: 'newsapi',
  label: 'NewsAPI',

  capabilities: {
    // NewsAPI has no author query parameter at all — filtering happens client-side.
    authorFilter: false,
    // Only on /top-headlines, and only for a single category at a time.
    categoryFilter: true,
    // Only on /everything.
    dateRangeFilter: true,
  },

  supportedCategories: CATEGORIES,

  async fetchArticles(query: ArticleQuery, signal?: AbortSignal): Promise<ArticlePage> {
    const keyword = query.keyword.trim()
    // `/top-headlines` is the only endpoint that understands categories, but it
    // is a poor keyword search. Prefer it only when a category is the user's
    // primary intent and no keyword was given.
    const useTopHeadlines = !keyword && query.categories.length > 0
    const category = query.categories[0]

    const search = useTopHeadlines
      ? buildQuery({
          category: category ? toNewsApiCategory(category) : undefined,
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

    const endpoint = useTopHeadlines ? 'top-headlines' : 'everything'
    const url = `${apiBase('newsapi')}/${endpoint}${search}`
    let data = await fetchJson<NewsApiResponse>('newsapi', url, signal)

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
      const recovered = recoverDemoPayload<NewsApiResponse>('newsapi', url, error)
      if (!recovered) throw error
      data = recovered
    }

    const raw = (data.articles ?? []).filter(isUsable)
    const total = data.totalResults ?? raw.length

    return {
      articles: raw.map((item) => toArticle(item, useTopHeadlines ? category : undefined)),
      totalResults: total,
      hasMore: query.page * query.pageSize < total,
    }
  },
}
