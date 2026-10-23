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
 * NYT Article Search v2. Deepest archive (1851), tightest rate limit —
 * 5 requests/minute, 500/day — which is why the keyword is debounced and
 * `staleTime` is long.
 *
 * No `fq` is sent. The documented Lucene filter returns nothing on the free
 * tier; measured live with a valid key, same minute, HTTP 200 throughout:
 *
 *   q=climate                            -> 10,000 hits
 *   q=climate & fq=news_desk:("Climate") ->      0 hits, docs: null
 *   fq=news_desk:("Foreign")             ->      0 hits  (desk exists in the data)
 *   fq=document_type:("article")         ->      0 hits  (trivially true)
 *   fq=glocations:("Iraq")               ->      0 hits  (NYT's own example)
 *
 * Sending it would drop the NYT out of every filtered feed, so category and
 * author are declared unsupported and narrowed in the browser instead.
 * `begin_date`/`end_date` are unaffected and still go upstream.
 */
export const nytimesSource: NewsSource = {
  id: 'nytimes',
  label: 'The New York Times',

  capabilities: (): SourceCapabilities => ({
    authorFilter: false,
    categoryFilter: false,
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

    const { data, delivery } = await fetchJson<NytSearchResponse>(
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
      delivery,
    }
  },
}
