import type { Article, SourceId } from '@/domain/article'
import type { NewsSourceError } from '@/domain/news-source'
import type { ArticleQuery } from '@/domain/query'
import { normaliseAuthor } from '@/lib/text'
import { useDataMode, type Delivery, type DemoReason } from '@/store/data-mode'
import guardianFixture from '@/test/fixtures/guardian-search.json'
import newsapiEverythingFixture from '@/test/fixtures/newsapi-everything.json'
import newsapiHeadlinesFixture from '@/test/fixtures/newsapi-topheadlines.json'
import nytFixture from '@/test/fixtures/nyt-search.json'

const deliveries = new Map<SourceId, Delivery>()
const suppressed = new Map<SourceId, DemoReason>()

useDataMode.subscribe((state, previous) => {
  if (state.preference !== previous.preference) suppressed.clear()
})

export function noteDelivery(sourceId: SourceId, delivery: Delivery): void {
  deliveries.set(sourceId, delivery)
}

export function readDelivery(sourceId: SourceId): Delivery {
  return deliveries.get(sourceId) ?? { origin: 'live' }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return
  const reason = signal.reason
  throw reason instanceof Error
    ? reason
    : new DOMException('The operation was aborted.', 'AbortError')
}

function fixtureFor(sourceId: SourceId, url: string): unknown {
  if (sourceId === 'guardian') return guardianFixture
  if (sourceId === 'nytimes') return nytFixture
  return url.includes('top-headlines') ? newsapiHeadlinesFixture : newsapiEverythingFixture
}

export function keyIsMissing(sourceId: SourceId): boolean {
  const availability = useDataMode.getState().availability
  if (availability === 'pending' || availability === 'unknown') return false
  return availability[sourceId] === false
}

export function suppressedReason(sourceId: SourceId): DemoReason | undefined {
  if (useDataMode.getState().preference !== 'auto') return undefined
  return suppressed.get(sourceId)
}

export function demoPayload<T>(
  sourceId: SourceId,
  url: string,
  signal: AbortSignal | undefined,
  reason: DemoReason,
): T {
  throwIfAborted(signal)
  if (reason === 'rate-limited' || reason === 'auth') suppressed.set(sourceId, reason)
  noteDelivery(sourceId, { origin: 'demo', reason })
  return fixtureFor(sourceId, url) as T
}

export function narrowDemoArticles(articles: readonly Article[], query: ArticleQuery): Article[] {
  const keyword = query.keyword.trim().toLowerCase()
  const wantedAuthors = query.authors.map(normaliseAuthor)

  return articles.filter((article) => {
    if (keyword) {
      const haystack =
        `${article.title} ${article.description} ${article.author ?? ''}`.toLowerCase()
      if (!haystack.includes(keyword)) return false
    }

    if (
      query.categories.length > 0 &&
      article.category &&
      !query.categories.includes(article.category)
    ) {
      return false
    }

    const day = article.publishedAt.slice(0, 10)
    if (query.dateFrom && day < query.dateFrom) return false
    if (query.dateTo && day > query.dateTo) return false

    if (wantedAuthors.length > 0) {
      const actual = article.author ? normaliseAuthor(article.author) : ''
      if (!wantedAuthors.some((name) => actual.includes(name))) return false
    }

    return true
  })
}

export function recoverDemoPayload<T>(
  sourceId: SourceId,
  url: string,
  error: NewsSourceError,
): T | null {
  if (useDataMode.getState().preference !== 'auto') return null
  if (error.kind !== 'rate-limited' && error.kind !== 'auth') return null
  return demoPayload<T>(sourceId, url, undefined, error.kind)
}
