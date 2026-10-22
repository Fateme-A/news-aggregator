import type { SourceId } from '@/domain/article'
import { NewsSourceError, type FetchContext } from '@/domain/news-source'
import { demoPayload, noteDelivery, planDelivery, planRecovery } from '@/sources/demo'

const DEFAULT_TIMEOUT_MS = 10_000

export function apiBase(sourceId: SourceId): string {
  const route = sourceId === 'nytimes' ? 'nyt' : sourceId
  return `/api/${route}`
}

export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

function classify(status: number): NewsSourceError['kind'] {
  if (status === 429) return 'rate-limited'
  if (status === 401 || status === 403) return 'auth'
  return 'unknown'
}

/**
 * The one place a request leaves the app. Transport only: timeout,
 * cancellation, status-to-error mapping, and handing off to the recorded
 * sample when `FetchContext` says to. Reads no store and no environment.
 */
export async function fetchJson<T>(
  sourceId: SourceId,
  url: string,
  context: FetchContext,
): Promise<T> {
  const plan = planDelivery(sourceId, context)
  if (plan !== 'live') return demoPayload<T>(sourceId, url, plan, context.signal)

  const timeout = AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
  const combined = context.signal ? AbortSignal.any([context.signal, timeout]) : timeout

  let response: Response
  try {
    response = await fetch(url, {
      signal: combined,
      headers: { Accept: 'application/json' },
    })
  } catch (cause) {
    if (context.signal?.aborted) throw cause
    throw new NewsSourceError(sourceId, `Request to ${sourceId} failed`, 'network', { cause })
  }

  if (!response.ok) {
    const error = new NewsSourceError(
      sourceId,
      `${sourceId} responded ${response.status} ${response.statusText}`,
      classify(response.status),
    )
    const recovery = planRecovery(context, error)
    if (recovery) return demoPayload<T>(sourceId, url, recovery)
    throw error
  }

  try {
    const data = (await response.json()) as T
    noteDelivery(sourceId, { origin: 'live' })
    return data
  } catch (cause) {
    if (cause instanceof NewsSourceError) throw cause
    throw new NewsSourceError(sourceId, `${sourceId} returned malformed JSON`, 'unknown', { cause })
  }
}
