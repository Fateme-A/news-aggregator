import type { Article, Category } from '@/domain/article'
import { normaliseAuthor } from './text'

/**
 * The predicates behind every filter the browser applies itself — once, so the
 * live path (`applyClientSideFilters`) and the recorded-sample path
 * (`narrowSample`) cannot drift apart.
 */

/**
 * `uncategorised` is the one place the two callers genuinely differ. Filtering
 * a live feed excludes an article with no category, because presenting an
 * unknown-topic story under "Science" would be wrong. Narrowing the fixed
 * sample keeps it, because the recording is small and dropping its
 * uncategorised items empties Demo mode for no benefit.
 */
export function matchesCategories(
  article: Article,
  categories: readonly Category[],
  uncategorised: 'exclude' | 'keep' = 'exclude',
): boolean {
  if (categories.length === 0) return true
  if (article.category === undefined) return uncategorised === 'keep'
  return categories.includes(article.category)
}

export function matchesDateRange(article: Article, from?: string, to?: string): boolean {
  const day = article.publishedAt.slice(0, 10)
  if (from && day < from) return false
  if (to && day > to) return false
  return true
}

export function matchesAuthors(article: Article, authors: readonly string[]): boolean {
  if (authors.length === 0) return true
  if (!article.author) return false
  const actual = normaliseAuthor(article.author)
  return authors.some((name) => actual.includes(normaliseAuthor(name)))
}

/** Title, summary and byline — the fields a reader would expect to search. */
export function matchesKeyword(article: Article, keyword: string): boolean {
  const needle = keyword.trim().toLowerCase()
  if (!needle) return true
  const haystack = `${article.title} ${article.description} ${article.author ?? ''}`
  return haystack.toLowerCase().includes(needle)
}
