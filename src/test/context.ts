import type { SourceId } from '@/domain/article'
import type { DataMode, FetchContext } from '@/domain/news-source'

/** A `FetchContext` for adapter tests. */
export function context(
  mode: DataMode = 'live',
  configured?: Partial<Record<SourceId, boolean>>,
): FetchContext {
  return { mode, ...(configured ? { configured } : {}) }
}
