import type { SourceId } from '@/domain/article'
import type { DataMode, DemoReason } from '@/domain/delivery'
import type { FetchContext } from '@/domain/news-source'

/**
 * A `FetchContext` for adapter tests.
 *
 * `suppressed` is a plain record the caller owns — pass the same one to
 * successive calls to model a session, or a fresh one to model the reader
 * changing mode, which is what clears it in the real store.
 */
export function context(
  mode: DataMode = 'live',
  configured?: Partial<Record<SourceId, boolean>>,
  suppressed: Partial<Record<SourceId, DemoReason>> = {},
): FetchContext {
  return {
    mode,
    suppressed,
    onSuppress: (sourceId, reason) => {
      suppressed[sourceId] = reason
    },
    ...(configured ? { configured } : {}),
  }
}
