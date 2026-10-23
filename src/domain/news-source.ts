import type { Category, SourceId } from './article'
import type { DataMode, DemoReason } from './delivery'
import type { ArticlePage, ArticleQuery } from './query'

/**
 * What a provider applies server-side for one specific query. `useArticles`
 * re-applies in the browser anything flagged `false`.
 *
 * Query-dependent because NewsAPI filters by category only on `/top-headlines`,
 * and that endpoint ignores a date range.
 */
export interface SourceCapabilities {
  authorFilter: boolean
  categoryFilter: boolean
  dateRangeFilter: boolean
  /**
   * Coverage the browser cannot recover: the articles are not in the response
   * at all, e.g. NewsAPI returning one category per request. Surfaced to the
   * reader. Each entry is a complete sentence.
   */
  caveats?: string[]
}

/**
 * Resolved by the caller and passed down, so `sources/` reads no application
 * state and can be tested by passing a value.
 */
export interface FetchContext {
  signal?: AbortSignal
  mode: DataMode
  /** Which providers have a key configured. Omitted means "assume they all do". */
  configured?: Partial<Record<SourceId, boolean>>
  /**
   * Providers already known to be refusing, so Auto stops spending quota on
   * them. Supplied by the caller rather than read from a store, which is what
   * keeps `sources/` free of application state.
   */
  suppressed?: Partial<Record<SourceId, DemoReason>>
  /** Reports a provider that has just started refusing. */
  onSuppress?: (sourceId: SourceId, reason: DemoReason) => void
}

/**
 * The port every provider implements. Adding one means a new folder under
 * `src/sources/`, a line in `registry.ts`, and an entry in the two proxy tables
 * (`vite.config.ts`, `nginx.conf.template`).
 */
export interface NewsSource {
  readonly id: SourceId
  /** Human-readable name shown in filter chips and on article cards. */
  readonly label: string
  /** Canonical categories this provider can actually return. */
  readonly supportedCategories: readonly Category[]

  /** What this provider will honour server-side for this particular query. */
  capabilities(query: ArticleQuery): SourceCapabilities

  /**
   * Must honour `context.signal`: a superseded request left running still
   * spends rate-limit budget.
   *
   * @throws {NewsSourceError} on any non-success response.
   */
  fetchArticles(query: ArticleQuery, context: FetchContext): Promise<ArticlePage>
}

/** Normalised failure, so the UI never has to branch on provider-specific errors. */
export class NewsSourceError extends Error {
  constructor(
    readonly sourceId: SourceId,
    message: string,
    readonly kind: 'rate-limited' | 'auth' | 'network' | 'unknown' = 'unknown',
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'NewsSourceError'
  }

  /** Takes the display label so the UI shows "The New York Times", not `nytimes`. */
  describe(label: string): string {
    switch (this.kind) {
      case 'rate-limited':
        return `${label} has hit its rate limit. Results from the other sources are still shown.`
      case 'auth':
        return `${label} rejected the API key. Check your .env.local.`
      case 'network':
        return `Could not reach ${label}.`
      default:
        return `${label} returned an unexpected error.`
    }
  }
}
