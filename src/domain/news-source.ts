import type { Category, SourceId } from './article'
import type { ArticlePage, ArticleQuery } from './query'

/**
 * What a provider will do *on the server side for one specific query*.
 *
 * This is the Interface Segregation point, and it is load-bearing: `useArticles`
 * checks each flag and applies the predicate in the browser wherever a provider
 * answers `false`, rather than returning results that quietly ignore the filter.
 *
 * It takes the query because for two of the three providers the honest answer
 * depends on what else was asked for. NewsAPI can filter by category only on
 * `/top-headlines`, and that endpoint in turn ignores a date range — so the same
 * provider supports `dateRangeFilter` for one query and not for the next. A
 * static boolean could only have lied about one of those cases.
 */
export interface SourceCapabilities {
  authorFilter: boolean
  categoryFilter: boolean
  dateRangeFilter: boolean
  /**
   * Limits the browser cannot paper over.
   *
   * A `false` flag above means "the provider did not apply this, so you do it
   * here". A caveat means the articles simply are not in the response and no
   * amount of client-side work will produce them — NewsAPI returning a single
   * category at a time, for instance. These are shown to the reader rather
   * than hidden, because the alternative is a feed that looks under-filled for
   * no visible reason. Each entry is a complete sentence.
   */
  caveats?: string[]
}

/** How a request should be served. Decided by the caller, never by the transport. */
export type DataMode = 'auto' | 'live' | 'demo'

/** Normalised reason the recorded sample was served instead of a live response. */
export type DemoReason = 'chosen' | 'missing-key' | 'rate-limited' | 'auth'

/** What a given source actually returned, so the UI can say so. */
export interface Delivery {
  origin: 'live' | 'demo'
  reason?: DemoReason
}

/**
 * Everything a fetch needs beyond the query itself.
 *
 * `mode` and `configured` are resolved by the caller (`useArticles`) and handed
 * down, so `sources/http.ts` depends on no application state — it cannot reach
 * for a store, and it can be tested by passing a value.
 */
export interface FetchContext {
  signal?: AbortSignal
  mode: DataMode
  /** Which providers have a key configured. Omitted means "assume they all do". */
  configured?: Partial<Record<SourceId, boolean>>
}

/**
 * The port. Every provider implements exactly this, and nothing outside
 * `src/sources/<provider>/` depends on anything narrower.
 *
 * Adding a fourth provider means writing one folder, appending one line to
 * `src/sources/registry.ts`, and adding its upstream to the two proxy tables
 * (`vite.config.ts` and `nginx.conf.template`). No feature, hook or component
 * changes — they all depend on this interface rather than on any concrete API.
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
   * Fetch one page of articles.
   *
   * Implementations must honour `context.signal` so that superseded requests are
   * cancelled rather than left to consume rate-limit budget.
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

  /**
   * Message intended for end users rather than logs.
   *
   * Takes the display label rather than reading `sourceId`, so the UI shows
   * "The New York Times" instead of the internal id `nytimes`.
   */
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
