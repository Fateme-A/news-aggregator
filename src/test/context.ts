import type { SourceId } from '@/domain/article'
import type { DataMode, FetchContext } from '@/domain/news-source'

/**
 * A `FetchContext` for adapter tests.
 *
 * Delivery mode is now an argument rather than ambient state, so a test says
 * what it means instead of reaching into a store first.
 */
export function context(
  mode: DataMode = 'live',
  configured?: Partial<Record<SourceId, boolean>>,
): FetchContext {
  return { mode, ...(configured ? { configured } : {}) }
}
