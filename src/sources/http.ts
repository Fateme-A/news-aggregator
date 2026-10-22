import type { SourceId } from '@/domain/article'
import { NewsSourceError } from '@/domain/news-source'
import {
  demoPayload,
  keyIsMissing,
  noteDelivery,
  recoverDemoPayload,
  suppressedReason,
} from '@/sources/demo'
import { useDataMode } from '@/store/data-mode'

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

export async function fetchJson<T>(
  sourceId: SourceId,
  url: string,
  signal?: AbortSignal,
): Promise<T> {
  const preference = useDataMode.getState().preference

  if (preference === 'demo') return demoPayload<T>(sourceId, url, signal, 'chosen')
  if (preference === 'auto' && keyIsMissing(sourceId)) {
    return demoPayload<T>(sourceId, url, signal, 'missing-key')
  }
  const blocked = suppressedReason(sourceId)
  if (blocked) return demoPayload<T>(sourceId, url, signal, blocked)

  const timeout = AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout

  let response: Response
  try {
    response = await fetch(url, {
      signal: combined,
      headers: { Accept: 'application/json' },
    })
  } catch (cause) {
    if (signal?.aborted) throw cause
    throw new NewsSourceError(sourceId, `Request to ${sourceId} failed`, 'network', { cause })
  }

  if (!response.ok) {
    const error = new NewsSourceError(
      sourceId,
      `${sourceId} responded ${response.status} ${response.statusText}`,
      classify(response.status),
    )
    const recovered = recoverDemoPayload<T>(sourceId, url, error)
    if (recovered) return recovered
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
