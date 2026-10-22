/**
 * The normalised article model. Adapters map every wire format into this one
 * type; nothing outside `src/sources/<provider>/` knows the originals.
 */

/** Identifier for a configured provider. Extended by adding to the registry. */
export type SourceId = 'guardian' | 'nytimes' | 'newsapi'

/**
 * The canonical category vocabulary. The Guardian has hundreds of sections and
 * the NYT dozens of news desks; NewsAPI's seven are the narrowest set, which
 * makes provider → canonical a total function. Each adapter owns its own table.
 */
export const CATEGORIES = [
  'business',
  'entertainment',
  'general',
  'health',
  'science',
  'sports',
  'technology',
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  business: 'Business',
  entertainment: 'Entertainment',
  general: 'General',
  health: 'Health',
  science: 'Science',
  sports: 'Sports',
  technology: 'Technology',
}

export interface Article {
  /** `${sourceId}:${providerSideId}` — unique across providers, stable across refetches. */
  id: string
  title: string
  description: string
  /** Canonical link to the article on the publisher's own site. */
  url: string
  imageUrl?: string
  /** ISO-8601 timestamp. */
  publishedAt: string
  author?: string
  category?: Category
  /** Which provider supplied this, and the human-readable outlet name. */
  source: {
    id: SourceId
    /** Outlet name, e.g. "The Guardian", "Wired". May differ from the provider. */
    name: string
  }
}
