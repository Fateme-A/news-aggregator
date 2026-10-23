import type { SourceId } from '@/domain/article'
import type { DataMode, DemoReason } from '@/domain/delivery'
import type { FetchContext } from '@/domain/news-source'

/**
 * Pass the same `suppressed` record across calls to model a session; a fresh
 * one models a mode change.
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
