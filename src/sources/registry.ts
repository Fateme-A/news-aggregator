import type { SourceId } from '@/domain/article'
import type { NewsSource } from '@/domain/news-source'
import { guardianSource } from './guardian/adapter'
import { newsapiSource } from './newsapi/adapter'
import { nytimesSource } from './nytimes/adapter'

/**
 * The single extension point.
 *
 * Adding a fourth provider means writing `src/sources/<name>/{adapter,mapper,types}.ts`
 * and appending it to this array. No feature, hook or component changes — they
 * all depend on the `NewsSource` interface rather than on any concrete provider.
 */
export const SOURCES: readonly NewsSource[] = [guardianSource, nytimesSource, newsapiSource]

const BY_ID = new Map<SourceId, NewsSource>(SOURCES.map((source) => [source.id, source]))

export function getSource(id: SourceId): NewsSource {
  const source = BY_ID.get(id)
  if (!source) throw new Error(`Unknown news source: ${id}`)
  return source
}

export const ALL_SOURCE_IDS: readonly SourceId[] = SOURCES.map((source) => source.id)
