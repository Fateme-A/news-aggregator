import type { Category, SourceId } from './article'
import type { ArticlePage, ArticleQuery } from './query'

/**
 * What a provider can do *on the server side*.
 *
 * This is the Interface Segregation point, and it is load-bearing rather than
 * decorative: consumers check a flag instead of assuming every provider honours
 * every filter. Where a flag is `false`, `useArticles` applies that predicate
 * client-side after fetching, and the UI says so rather than silently returning
 * results that ignore the filter.
 *
 * Concretely: NewsAPI cannot filter by author at all, and can only filter by
 * category on its `/top-headlines` endpoint (never alongside a keyword).
 */
export interface SourceCapabilities {
  authorFilter: boolean
  categoryFilter: boolean
  dateRangeFilter: boolean
}

/**
 * The port. Every provider implements exactly this, and nothing outside
 * `src/sources/<provider>/` depends on anything narrower.
 *
 * Adding a fourth provider means writing one folder and appending one line to
 * `src/sources/registry.ts` — no other file changes. That is the Open/Closed
 * property the challenge brief asks us to demonstrate.
 */
export interface NewsSource {
  readonly id: SourceId
  /** Human-readable name shown in filter chips and on article cards. */
  readonly label: string
  readonly capabilities: SourceCapabilities
  /** Canonical categories this provider can actually return. */
  readonly supportedCategories: readonly Category[]

  /**
   * Fetch one page of articles.
   *
   * Implementations must honour `signal` so that superseded requests are
   * cancelled rather than left to consume rate-limit budget.
   *
   * @throws {NewsSourceError} on any non-success response.
   */
  fetchArticles(query: ArticleQuery, signal?: AbortSignal): Promise<ArticlePage>
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
