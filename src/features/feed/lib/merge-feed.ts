import type { Article, SourceId } from '@/domain/article'
import { NewsSourceError, type NewsSource } from '@/domain/news-source'
import type { ArticlePage, ArticleQuery } from '@/domain/query'
import { mergeArticles } from '@/lib/dedupe'
import { matchesAuthors, matchesCategories, matchesDateRange } from '@/lib/matching'
import { narrowSample } from '@/sources/demo'
import type { SourceDelivery } from '@/store/data-mode'

export interface SourceFailure {
  sourceId: SourceId
  label: string
  message: string
}

/** A filter a provider could not apply upstream, re-applied here. */
export interface ClientFilter {
  label: string
  filters: string[]
}

/** One source, one page. Pairs each query with the source that produced it. */
export interface PageRequest {
  sourceId: SourceId
  page: number
}

/** The slice of a TanStack result this fold reads; plain objects satisfy it. */
export interface PageResult {
  data?: ArticlePage | undefined
  error?: Error | null
  isFetching: boolean
  isPending: boolean
}

export interface MergedFeed {
  articles: Article[]
  failures: SourceFailure[]
  deliveries: SourceDelivery[]
  clientFilters: ClientFilter[]
  caveats: string[]
  hasMore: boolean
  isFetching: boolean
  isPending: boolean
}

/**
 * Enforces every filter the provider reported it could not apply upstream.
 * Without this the capability flags would be documentation rather than
 * behaviour, and a filtered feed would include articles that do not match.
 */
export function applyClientSideFilters(
  page: ArticlePage,
  source: NewsSource,
  query: ArticleQuery,
): Article[] {
  const { categoryFilter, dateRangeFilter, authorFilter } = source.capabilities(query)

  return page.articles.filter(
    (article) =>
      (categoryFilter || matchesCategories(article, query.categories)) &&
      (dateRangeFilter || matchesDateRange(article, query.dateFrom, query.dateTo)) &&
      (authorFilter || matchesAuthors(article, query.authors)),
  )
}

/** Which filters this source needed help with, for the disclosure line. */
export function clientFiltersFor(source: NewsSource, query: ArticleQuery): string[] {
  const { categoryFilter, dateRangeFilter, authorFilter } = source.capabilities(query)
  const filters: string[] = []
  if (query.categories.length > 0 && !categoryFilter) filters.push('category')
  if ((query.dateFrom || query.dateTo) && !dateRangeFilter) filters.push('date')
  if (query.authors.length > 0 && !authorFilter) filters.push('author')
  return filters
}

/** Groups the flat result list back onto the source that produced each entry. */
function groupBySource(
  requests: readonly PageRequest[],
  results: readonly PageResult[],
): Map<SourceId, PageResult[]> {
  const grouped = new Map<SourceId, PageResult[]>()
  requests.forEach((request, index) => {
    const result = results[index]
    if (!result) return
    const existing = grouped.get(request.sourceId)
    if (existing) existing.push(result)
    else grouped.set(request.sourceId, [result])
  })
  return grouped
}

/**
 * Folds every source's pages into one feed.
 *
 * `requests` and `results` are parallel arrays, so the pairing is done once and
 * explicitly here rather than by index arithmetic at each use. Grouping by
 * source id means the fold no longer depends on the order queries were built in.
 */
export function mergeFeedResults(
  requests: readonly PageRequest[],
  results: readonly PageResult[],
  query: ArticleQuery,
  getSource: (id: SourceId) => NewsSource,
): MergedFeed {
  const perSource: Article[][] = []
  const failures: SourceFailure[] = []
  const deliveries: SourceDelivery[] = []
  const clientFilters: ClientFilter[] = []
  const caveats: string[] = []
  let hasMore = false
  let isFetching = false
  let isPending = false

  for (const [sourceId, pages] of groupBySource(requests, results)) {
    const source = getSource(sourceId)

    const filters = clientFiltersFor(source, query)
    if (filters.length > 0) clientFilters.push({ label: source.label, filters })
    caveats.push(...(source.capabilities(query).caveats ?? []))

    const collected: Article[] = []
    let latest: ArticlePage | undefined

    pages.forEach((result, index) => {
      if (result.isFetching) isFetching = true
      if (result.isPending) isPending = true

      // One notice per source, not one per page in flight.
      if (result.error && failures.every((failure) => failure.sourceId !== sourceId)) {
        failures.push({
          sourceId,
          label: source.label,
          message:
            result.error instanceof NewsSourceError
              ? result.error.describe(source.label)
              : `${source.label} is unavailable.`,
        })
      }

      if (!result.data) return
      latest = result.data

      const matched = applyClientSideFilters(result.data, source, query)
      collected.push(
        ...(result.data.delivery.origin === 'demo' ? narrowSample(matched, query) : matched),
      )

      // Only the newest page can say whether another one exists.
      const isLastPage = index === pages.length - 1
      if (isLastPage && result.data.hasMore && result.data.delivery.origin !== 'demo') {
        hasMore = true
      }
    })

    if (latest) {
      perSource.push(collected)
      deliveries.push({ sourceId, label: source.label, ...latest.delivery })
    }
  }

  return {
    articles: mergeArticles(perSource),
    failures,
    deliveries,
    clientFilters,
    caveats,
    hasMore,
    isFetching,
    isPending,
  }
}
