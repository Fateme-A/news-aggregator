import type { Article, SourceId } from '@/domain/article'
import {
  NewsSourceError,
  type Delivery,
  type FetchContext,
  type NewsSource,
} from '@/domain/news-source'
import type { ArticlePage, ArticleQuery } from '@/domain/query'
import { queryCacheKey } from '@/domain/query'
import { mergeArticles } from '@/lib/dedupe'
import { normaliseAuthor } from '@/lib/text'
import { narrowSample, readDelivery } from '@/sources/demo'
import { getSource } from '@/sources/registry'
import { useDataMode, type SourceDelivery } from '@/store/data-mode'
import { keepPreviousData, useQueries, type UseQueryResult } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

/** Upper bound on infinite scroll, so a long session cannot drain a daily quota. */
export const MAX_PAGES = 25

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

export interface UseArticlesResult {
  articles: Article[]
  isLoading: boolean
  isFetching: boolean
  failures: SourceFailure[]
  allFailed: boolean
  hasMore: boolean
  /** Filters narrowed in the browser because a provider could not do it upstream. */
  clientFilters: ClientFilter[]
  /** Coverage the browser cannot recover, stated rather than hidden. */
  caveats: string[]
  deliveries: SourceDelivery[]
  isResolvingMode: boolean
  atPageCap: boolean
}

function withinRange(iso: string, from?: string, to?: string): boolean {
  const day = iso.slice(0, 10)
  if (from && day < from) return false
  if (to && day > to) return false
  return true
}

/**
 * Re-apply, in the browser, every filter this provider did not apply upstream.
 *
 * This is the other half of `SourceCapabilities`: a provider declares what it
 * honoured for this query, and anything it did not is enforced here. Without
 * this the flags would be documentation rather than behaviour — and a filtered
 * feed would quietly include articles that do not match.
 */
function applyClientSideFilters(
  page: ArticlePage,
  source: NewsSource,
  query: ArticleQuery,
): Article[] {
  const capabilities = source.capabilities(query)
  let articles = page.articles

  if (!capabilities.categoryFilter && query.categories.length > 0) {
    articles = articles.filter(
      (article) => article.category !== undefined && query.categories.includes(article.category),
    )
  }

  if (!capabilities.dateRangeFilter && (query.dateFrom || query.dateTo)) {
    articles = articles.filter((article) =>
      withinRange(article.publishedAt, query.dateFrom, query.dateTo),
    )
  }

  if (!capabilities.authorFilter && query.authors.length > 0) {
    const wanted = query.authors.map(normaliseAuthor)
    articles = articles.filter((article) => {
      if (!article.author) return false
      const actual = normaliseAuthor(article.author)
      return wanted.some((name) => actual.includes(name))
    })
  }

  return articles
}

/** Which filters this source needed help with, for the disclosure line. */
function clientFiltersFor(source: NewsSource, query: ArticleQuery): string[] {
  const capabilities = source.capabilities(query)
  const filters: string[] = []
  if (query.categories.length > 0 && !capabilities.categoryFilter) filters.push('category')
  if ((query.dateFrom || query.dateTo) && !capabilities.dateRangeFilter) filters.push('date')
  if (query.authors.length > 0 && !capabilities.authorFilter) filters.push('author')
  return filters
}

interface FetchedPage extends ArticlePage {
  delivery: Delivery
}

/**
 * One page of the merged feed, or every page up to `page` when accumulating.
 *
 * Infinite scroll is not a second data path: it asks for pages 1…N instead of
 * page N. Every page but the newest is already in the TanStack Query cache, so
 * re-requesting them costs nothing and no request leaves the browser — which is
 * why the feed needs no accumulator state, no refs mirroring state, and no
 * effect to keep them in step. The rendered list is derived from the cache.
 */
export function useArticles(
  query: ArticleQuery,
  selectedSources: SourceId[],
  options: { enabled?: boolean; accumulate?: boolean } = {},
): UseArticlesResult {
  const { enabled = true, accumulate = false } = options

  const mode = useDataMode((state) => state.preference)
  const availability = useDataMode((state) => state.availability)
  const isResolvingMode = enabled && mode === 'auto' && availability === 'pending'
  const ready = enabled && !isResolvingMode

  const configured =
    availability === 'pending' || availability === 'unknown' ? undefined : availability

  const page = Math.min(query.page, MAX_PAGES)
  const pageCount = accumulate ? page : 1
  const pages = useMemo(
    () => (accumulate ? Array.from({ length: page }, (_, index) => index + 1) : [page]),
    [accumulate, page],
  )

  /**
   * Fold the per-source, per-page results into one feed.
   *
   * This runs inside `combine` rather than a `useMemo` in the component body
   * because `useQueries` hands back a fresh array every render while the
   * results inside it keep their identity. TanStack re-runs `combine` only when
   * one of those results actually changes, which is the memoisation we want —
   * and it is worth having: at the page cap this merges, sorts and dedupes up
   * to 900 articles, and the component re-renders on every keystroke.
   */
  const combine = useCallback(
    (results: UseQueryResult<FetchedPage, Error>[]) => {
      const perSource: Article[][] = []
      const failures: SourceFailure[] = []
      const deliveries: SourceDelivery[] = []
      const clientFilters: ClientFilter[] = []
      const caveats: string[] = []
      let hasMore = false
      let isFetching = false
      let isPending = false

      selectedSources.forEach((sourceId, sourceIndex) => {
        const source = getSource(sourceId)
        const sourceResults = results.slice(
          sourceIndex * pageCount,
          sourceIndex * pageCount + pageCount,
        )

        const filters = clientFiltersFor(source, query)
        if (filters.length > 0) clientFilters.push({ label: source.label, filters })
        for (const caveat of source.capabilities(query).caveats ?? []) caveats.push(caveat)

        const collected: Article[] = []
        let latest: FetchedPage | undefined

        sourceResults.forEach((result, pageIndex) => {
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
          const isLastPage = pageIndex === sourceResults.length - 1
          if (isLastPage && result.data.hasMore && result.data.delivery.origin !== 'demo') {
            hasMore = true
          }
        })

        if (latest) {
          perSource.push(collected)
          deliveries.push({ sourceId, label: source.label, ...latest.delivery })
        }
      })

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
    },
    [selectedSources, pageCount, query],
  )

  const derived = useQueries({
    queries: selectedSources.flatMap((sourceId) =>
      pages.map((pageNumber) => {
        const source = getSource(sourceId)
        const pageQuery: ArticleQuery = { ...query, page: pageNumber }
        return {
          queryKey: [...queryCacheKey(sourceId, pageQuery), mode],
          queryFn: async ({ signal }: { signal: AbortSignal }): Promise<FetchedPage> => {
            const context: FetchContext = { signal, mode, ...(configured ? { configured } : {}) }
            const fetched = await source.fetchArticles(pageQuery, context)
            return { ...fetched, delivery: readDelivery(sourceId) }
          },
          enabled: ready,
          staleTime: 5 * 60 * 1000,
          gcTime: 30 * 60 * 1000,
          // Keep the current feed on screen while the next page or a changed
          // filter loads, instead of tearing it down for a skeleton.
          placeholderData: keepPreviousData,
          retry: (failureCount: number, error: Error) =>
            error instanceof NewsSourceError && error.kind !== 'network' ? false : failureCount < 1,
        }
      }),
    ),
    combine,
  })

  return {
    ...derived,
    isLoading: isResolvingMode || (derived.isPending && derived.articles.length === 0),
    allFailed: selectedSources.length > 0 && derived.failures.length === selectedSources.length,
    isResolvingMode,
    atPageCap: accumulate && page >= MAX_PAGES,
  }
}
