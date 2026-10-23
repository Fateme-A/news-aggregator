import type { Article, SourceId } from '@/domain/article'
import type { Delivery, DemoReason } from '@/domain/delivery'
import type { FetchContext, NewsSourceError } from '@/domain/news-source'
import type { ArticleQuery } from '@/domain/query'
import { matchesAuthors, matchesCategories, matchesDateRange, matchesKeyword } from '@/lib/matching'
import guardianSample from '@/samples/guardian-search.json'
import newsapiEverythingSample from '@/samples/newsapi-everything.json'
import newsapiHeadlinesSample from '@/samples/newsapi-topheadlines.json'
import nytSample from '@/samples/nyt-search.json'

/**
 * Recorded samples when a provider cannot be called. Stateless; delivery is
 * returned on the page.
 */

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

export function planDelivery(sourceId: SourceId, context: FetchContext): 'live' | DemoReason {
  if (context.mode === 'demo') return 'chosen'
  if (context.mode === 'live') return 'live'

  // Auto: skip providers with no key, and providers already known to be refusing.
  if (context.configured?.[sourceId] === false) return 'missing-key'
  return context.suppressed?.[sourceId] ?? 'live'
}

export function planRecovery(context: FetchContext, error: NewsSourceError): DemoReason | null {
  if (context.mode !== 'auto') return null
  if (error.kind !== 'rate-limited' && error.kind !== 'auth') return null
  return error.kind
}

export interface Delivered<T> {
  data: T
  delivery: Delivery
}

export function demoPayload<T>(
  sourceId: SourceId,
  url: string,
  reason: DemoReason,
  context: FetchContext,
): Delivered<T> {
  throwIfAborted(context.signal)
  // A refusal is worth remembering: Auto should not spend more quota on it.
  if (reason === 'rate-limited' || reason === 'auth') context.onSuppress?.(sourceId, reason)
  return { data: sampleFor(sourceId, url) as T, delivery: { origin: 'demo', reason } }
}

/**
 * Applies the query to the recorded page. The sample is one fixed page, so a
 * search only surfaces stories already in the recording — but without this,
 * Demo mode looks like the filters are broken.
 */
export function narrowSample(articles: readonly Article[], query: ArticleQuery): Article[] {
  return articles.filter(
    (article) =>
      matchesKeyword(article, query.keyword) &&
      matchesCategories(article, query.categories, 'keep') &&
      matchesDateRange(article, query.dateFrom, query.dateTo) &&
      matchesAuthors(article, query.authors),
  )
}
