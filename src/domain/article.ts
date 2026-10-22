/**
 * The normalised article model.
 *
 * Every provider has its own wire format; nothing outside `src/sources/<provider>/`
 * is allowed to know about those shapes. Adapters map into this one type, so the
 * feed, filters and UI are written exactly once regardless of how many providers
 * are plugged in.
 */

/** Identifier for a configured provider. Extended by adding to the registry. */
export type SourceId = 'guardian' | 'nytimes' | 'newsapi'

/**
 * The canonical category vocabulary.
 *
 * Providers disagree wildly on taxonomy — The Guardian has hundreds of sections,
 * the NYT has dozens of news desks, NewsAPI has exactly seven fixed categories.
 * We adopt NewsAPI's set because it is the narrowest, which makes every mapping a
 * total function in the direction we need (provider → canonical). Each adapter
 * owns the lookup table for its own vocabulary.
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
