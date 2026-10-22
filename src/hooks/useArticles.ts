import type { Article, SourceId } from '@/domain/article'
import { NewsSourceError, type NewsSource } from '@/domain/news-source'
import type { ArticlePage, ArticleQuery } from '@/domain/query'
import { queryCacheKey } from '@/domain/query'
import { mergeArticles } from '@/lib/dedupe'
import { normaliseAuthor } from '@/lib/text'
import { narrowDemoArticles, readDelivery } from '@/sources/demo'
import { getSource } from '@/sources/registry'
import { useDataMode, type Delivery, type SourceDelivery } from '@/store/data-mode'
import { useQueries } from '@tanstack/react-query'

export interface SourceFailure {
  sourceId: SourceId
  label: string
  message: string
}

export interface UseArticlesResult {
  articles: Article[]
  isLoading: boolean
  isFetching: boolean
  failures: SourceFailure[]
  allFailed: boolean
  hasMore: boolean
  clientFilteredSources: string[]
  deliveries: SourceDelivery[]
  isResolvingMode: boolean
}

function applyClientSideFilters(
  page: ArticlePage,
  source: NewsSource,
  query: ArticleQuery,
): Article[] {
  let articles = page.articles

  if (!source.capabilities.authorFilter && query.authors.length > 0) {
    const wanted = query.authors.map(normaliseAuthor)
    articles = articles.filter((article) => {
      if (!article.author) return false
      const actual = normaliseAuthor(article.author)
      return wanted.some((name) => actual.includes(name))
    })
  }

  return articles
}

interface FetchedPage extends ArticlePage {
  delivery: Delivery
}

export function useArticles(
  query: ArticleQuery,
  selectedSources: SourceId[],
  enabled = true,
): UseArticlesResult {
  const preference = useDataMode((state) => state.preference)
  const availability = useDataMode((state) => state.availability)
  const isResolvingMode = enabled && preference === 'auto' && availability === 'pending'
  const ready = enabled && !isResolvingMode

  const results = useQueries({
    queries: selectedSources.map((sourceId) => {
      const source = getSource(sourceId)
      return {
        queryKey: [...queryCacheKey(sourceId, query), preference],
        queryFn: async ({ signal }: { signal: AbortSignal }): Promise<FetchedPage> => {
          const page = await source.fetchArticles(query, signal)
          return { ...page, delivery: readDelivery(sourceId) }
        },
        enabled: ready,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: (failureCount: number, error: Error) =>
          error instanceof NewsSourceError && error.kind !== 'network' ? false : failureCount < 1,
      }
    }),
  })

  const perSourceArticles: Article[][] = []
  const failures: SourceFailure[] = []
  const deliveries: SourceDelivery[] = []
  let hasMore = false

  selectedSources.forEach((sourceId, index) => {
    const source = getSource(sourceId)
    const result = results[index]
    if (!result) return

    if (result.error) {
      failures.push({
        sourceId,
        label: source.label,
        message:
          result.error instanceof NewsSourceError
            ? result.error.describe(source.label)
            : `${source.label} is unavailable.`,
      })
      return
    }

    if (!result.data) return

    const matched = applyClientSideFilters(result.data, source, query)
    perSourceArticles.push(
      result.data.delivery.origin === 'demo' ? narrowDemoArticles(matched, query) : matched,
    )
    deliveries.push({ sourceId, label: source.label, ...result.data.delivery })
    if (result.data.hasMore && result.data.delivery.origin !== 'demo') hasMore = true
  })

  const clientFilteredSources =
    query.authors.length > 0
      ? selectedSources
          .filter((id) => !getSource(id).capabilities.authorFilter)
          .map((id) => getSource(id).label)
      : []

  return {
    articles: mergeArticles(perSourceArticles),
    isLoading: isResolvingMode || results.some((result) => result.isLoading),
    isFetching: results.some((result) => result.isFetching),
    failures,
    allFailed: selectedSources.length > 0 && failures.length === selectedSources.length,
    hasMore,
    clientFilteredSources,
    deliveries,
    isResolvingMode,
  }
}
