import type { Article, SourceId } from '@/domain/article'
import type {
  DataMode,
  Delivery,
  DemoReason,
  FetchContext,
  NewsSourceError,
} from '@/domain/news-source'
import type { ArticleQuery } from '@/domain/query'
import { normaliseAuthor } from '@/lib/text'
import guardianSample from '@/samples/guardian-search.json'
import newsapiEverythingSample from '@/samples/newsapi-everything.json'
import newsapiHeadlinesSample from '@/samples/newsapi-topheadlines.json'
import nytSample from '@/samples/nyt-search.json'

/**
 * Serves recorded samples when a provider cannot be called.
 *
 * `deliveries` records what each source last returned, so the UI can name the
 * reason. `suppressed` is a circuit breaker: once a provider answers 429 or
 * 401 in Auto mode, further calls go straight to the sample rather than spend
 * more of a 100-request daily budget.
 *
 * Neither reads a store — the mode arrives in `FetchContext`.
 */

const deliveries = new Map<SourceId, Delivery>()
const suppressed = new Map<SourceId, DemoReason>()
let lastMode: DataMode | undefined

/** Changing mode resets the breakers. */
function syncMode(mode: DataMode): void {
  if (mode === lastMode) return
  lastMode = mode
  suppressed.clear()
}

export function noteDelivery(sourceId: SourceId, delivery: Delivery): void {
  deliveries.set(sourceId, delivery)
}

export function readDelivery(sourceId: SourceId): Delivery {
  return deliveries.get(sourceId) ?? { origin: 'live' }
}

/** The maps outlive a render by design, so tests must reset them. */
export function resetDeliveryState(): void {
  deliveries.clear()
  suppressed.clear()
  lastMode = undefined
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return
  const reason = signal.reason
  throw reason instanceof Error
    ? reason
    : new DOMException('The operation was aborted.', 'AbortError')
}

function sampleFor(sourceId: SourceId, url: string): unknown {
  if (sourceId === 'guardian') return guardianSample
  if (sourceId === 'nytimes') return nytSample
  return url.includes('top-headlines') ? newsapiHeadlinesSample : newsapiEverythingSample
}

/** Returns `'live'` to go to the network, or the reason to serve the sample. */
export function planDelivery(sourceId: SourceId, context: FetchContext): 'live' | DemoReason {
  syncMode(context.mode)

  if (context.mode === 'demo') return 'chosen'
  if (context.mode === 'live') return 'live'

  // Auto: skip providers with no key, and providers already known to be refusing.
  if (context.configured?.[sourceId] === false) return 'missing-key'
  return suppressed.get(sourceId) ?? 'live'
}

/** Whether a live failure may fall back to the sample, and why. */
export function planRecovery(context: FetchContext, error: NewsSourceError): DemoReason | null {
  if (context.mode !== 'auto') return null
  if (error.kind !== 'rate-limited' && error.kind !== 'auth') return null
  return error.kind
}

export function demoPayload<T>(
  sourceId: SourceId,
  url: string,
  reason: DemoReason,
  signal?: AbortSignal,
): T {
  throwIfAborted(signal)
  if (reason === 'rate-limited' || reason === 'auth') suppressed.set(sourceId, reason)
  noteDelivery(sourceId, { origin: 'demo', reason })
  return sampleFor(sourceId, url) as T
}

/**
 * Applies the query to the recorded page. The sample is one fixed page, so a
 * search only surfaces stories already in the recording — but without this,
 * Demo mode looks like the filters are broken.
 */
export function narrowSample(articles: readonly Article[], query: ArticleQuery): Article[] {
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
