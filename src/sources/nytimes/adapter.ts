import { CATEGORIES } from '@/domain/article'
import type { FetchContext, NewsSource, SourceCapabilities } from '@/domain/news-source'
import type { ArticlePage, ArticleQuery } from '@/domain/query'
import { apiBase, buildQuery, fetchJson } from '@/sources/http'
import { toArticle, toNytDate } from './mapper'
import type { NytSearchResponse } from './types'

/** Article Search returns a fixed 10 documents per page and ignores any page-size hint. */
const NYT_PAGE_SIZE = 10

/** The API stops paginating past this point regardless of the hit count it reports. */
const NYT_MAX_PAGES = 100

/**
 * NYT Article Search v2.
 *
 * Deepest archive of the three (back to 1851) and the richest byline data, but
 * the tightest rate limit — 5 requests/minute, 500/day. That ceiling is why the
 * keyword input is debounced and why TanStack Query is configured with a long
 * `staleTime`; this adapter would otherwise trip a 429 during normal typing.
 *
 * ## Why there is no `fq`
 *
 * Article Search documents a Lucene `fq` parameter for filtering by news desk,
 * section and byline, and an earlier version of this adapter used it. It does
 * not work on the free tier. Measured against the live API with a valid key,
 * same minute, HTTP 200 on every call:
 *
 *   q=climate                              -> 10,000 hits
 *   q=climate & fq=news_desk:("Climate")   ->      0 hits, docs: null
 *   fq=news_desk:("Foreign")               ->      0 hits   (desk exists in the data)
 *   fq=section_name:("World")              ->      0 hits
 *   fq=document_type:("article")           ->      0 hits   (trivially true filter)
 *   fq=glocations:("Iraq")                 ->      0 hits   (NYT's own doc example)
 *
 * Any `fq` empties the result set, including filters that cannot possibly match
 * nothing. Sending it would silently drop the NYT out of every filtered feed,
 * which is worse than not filtering, so category and author are declared
 * unsupported and `useArticles` narrows this provider's results in the browser
 * instead. `begin_date`/`end_date` are unaffected and still applied upstream.
 */
export const nytimesSource: NewsSource = {
  id: 'nytimes',
  label: 'The New York Times',

  capabilities: (): SourceCapabilities => ({
    // See the `fq` note above: both of these are applied client-side.
    authorFilter: false,
    categoryFilter: false,
    // begin_date/end_date work; verified against the live API.
    dateRangeFilter: true,
  }),

  supportedCategories: CATEGORIES,

  async fetchArticles(query: ArticleQuery, context: FetchContext): Promise<ArticlePage> {
    const search = buildQuery({
      q: query.keyword.trim() || undefined,
      begin_date: toNytDate(query.dateFrom),
      end_date: toNytDate(query.dateTo),
      // The API is 0-indexed; our domain is 1-indexed.
      page: query.page - 1,
      sort: query.keyword.trim() ? 'relevance' : 'newest',
    })

    const data = await fetchJson<NytSearchResponse>(
      'nytimes',
      `${apiBase('nytimes')}/articlesearch.json${search}`,
      context,
    )

    // `docs` is genuinely `null` on an empty result set, not an empty array.
    const docs = data.response?.docs ?? []
    const hits = data.response?.metadata?.hits

    return {
      articles: docs.map(toArticle),
      ...(hits === undefined ? {} : { totalResults: hits }),
      hasMore: docs.length === NYT_PAGE_SIZE && query.page < NYT_MAX_PAGES,
    }
  },
}
