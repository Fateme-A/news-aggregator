import { CATEGORIES } from '@/domain/article'
import type { FetchContext, NewsSource, SourceCapabilities } from '@/domain/news-source'
import type { ArticlePage, ArticleQuery } from '@/domain/query'
import { apiBase, buildQuery, fetchJson } from '@/sources/http'
import { sectionsParam, toArticle } from './mapper'
import type { GuardianSearchResponse } from './types'

/**
 * The Guardian Content API.
 *
 * The most capable of the three providers: it filters by keyword, date range,
 * section and contributor server-side, caps at 5,000 requests/day, and reaches
 * back to 1999.
 */
export const guardianSource: NewsSource = {
  id: 'guardian',
  label: 'The Guardian',

  // The only provider of the three that honours every filter server-side, for
  // any combination of them. Verified against the live API.
  capabilities: (): SourceCapabilities => ({
    authorFilter: true,
    categoryFilter: true,
    dateRangeFilter: true,
  }),

  // The section mapping covers every canonical category.
  supportedCategories: CATEGORIES,

  async fetchArticles(query: ArticleQuery, context: FetchContext): Promise<ArticlePage> {
    const search = buildQuery({
      // The Guardian rejects an empty `q`; omitting it returns the latest instead,
      // which is exactly the behaviour we want for an unfiltered feed.
      q: query.keyword.trim() || undefined,
      'from-date': query.dateFrom,
      'to-date': query.dateTo,
      section: sectionsParam(query.categories),
      // `tag` accepts pipe-separated contributor profiles.
      tag: query.authors.length
        ? query.authors.map((a) => `profile/${toProfileSlug(a)}`).join('|')
        : undefined,
      page: query.page,
      'page-size': query.pageSize,
      'order-by': query.keyword.trim() ? 'relevance' : 'newest',
      'show-fields': 'trailText,byline,thumbnail',
      'show-tags': 'contributor',
    })

    const data = await fetchJson<GuardianSearchResponse>(
      'guardian',
      `${apiBase('guardian')}/search${search}`,
      context,
    )

    const { results, total, currentPage, pages } = data.response

    return {
      articles: results.map(toArticle),
      totalResults: total,
      hasMore: currentPage < pages,
    }
  },
}

/** "Fiona Harvey" → "fiona-harvey", matching Guardian contributor profile ids. */
function toProfileSlug(author: string): string {
  return author
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
