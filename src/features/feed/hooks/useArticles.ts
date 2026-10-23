import type { Article, SourceId } from '@/domain/article'
import { NewsSourceError, type FetchContext } from '@/domain/news-source'
import type { ArticlePage, ArticleQuery } from '@/domain/query'
import { queryCacheKey } from '@/domain/query'
import {
  mergeFeedResults,
  type ClientFilter,
  type PageRequest,
  type PageResult,
  type SourceFailure,
} from '@/features/feed/lib/merge-feed'
import { getSource } from '@/sources/registry'
import { useDataMode, type SourceDelivery } from '@/store/data-mode'
import { keepPreviousData, useQueries } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

export type { ClientFilter, SourceFailure }

/** Caps infinite scroll so a long session cannot drain a daily quota. */
export const MAX_PAGES = 25

const STALE_TIME_MS = 5 * 60 * 1000
const GC_TIME_MS = 30 * 60 * 1000

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

/**
 * One page of the merged feed, or pages 1…N when accumulating.
 *
 * Infinite scroll asks for 1…N rather than N; every page but the newest is
 * already cached, so no extra request leaves the browser and the list needs no
 * accumulator state to drift out of sync with.
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

  /** Every (source, page) pair this feed needs, in query order. */
  const requests = useMemo<PageRequest[]>(() => {
    const pages = accumulate ? Array.from({ length: page }, (_, index) => index + 1) : [page]
    return selectedSources.flatMap((sourceId) =>
      pages.map((number) => ({ sourceId, page: number })),
    )
  }, [selectedSources, accumulate, page])

  /**
   * Folds the results in `combine` rather than a `useMemo`: `useQueries`
   * returns a fresh array each render, so a memo keyed on it would never hit.
   * At the page cap this merges and dedupes ~900 articles on every keystroke.
   */
  const combine = useCallback(
    (results: PageResult[]) => mergeFeedResults(requests, results, query, getSource),
    [requests, query],
  )

  const derived = useQueries({
    queries: requests.map(({ sourceId, page: pageNumber }) => {
      const pageQuery: ArticleQuery = { ...query, page: pageNumber }
      return {
        queryKey: [...queryCacheKey(sourceId, pageQuery), mode],
        queryFn: ({ signal }: { signal: AbortSignal }): Promise<ArticlePage> => {
          const { suppressed, suppress } = useDataMode.getState()
          const context: FetchContext = {
            signal,
            mode,
            suppressed,
            onSuppress: suppress,
            ...(configured ? { configured } : {}),
          }
          return getSource(sourceId).fetchArticles(pageQuery, context)
        },
        enabled: ready,
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
        // Keep the current feed on screen while the next page or a changed
        // filter loads, instead of tearing it down for a skeleton.
        placeholderData: keepPreviousData,
        retry: (failureCount: number, error: Error) =>
          error instanceof NewsSourceError && error.kind !== 'network' ? false : failureCount < 1,
      }
    }),
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
