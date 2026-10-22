import type { Category, SourceId } from '@/domain/article'

/**
 * Explore's filter inputs, in the form the controls hold them: dates are
 * `YYYY-MM-DD` strings straight from `<input type="date">`, and an empty string
 * means "not set". `useFeedQuery` turns these into an `ArticleQuery`.
 */
export interface ExploreFilters {
  sources: SourceId[]
  categories: Category[]
  dateFrom: string
  dateTo: string
}
