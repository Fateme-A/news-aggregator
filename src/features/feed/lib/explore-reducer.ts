import type { Category, SourceId } from '@/domain/article'
import type { ExploreFilters } from '@/features/search/lib/filters'
import { toggle } from '@/lib/toggle'
import { ALL_SOURCE_IDS } from '@/sources/registry'

/** Explore's inputs, plus where in the results the reader is. */
export interface ExploreState extends ExploreFilters {
  keyword: string
  page: number
}

export type ExploreAction =
  | { type: 'keyword'; value: string }
  | { type: 'dateFrom'; value: string }
  | { type: 'dateTo'; value: string }
  | { type: 'toggleSource'; id: SourceId }
  | { type: 'toggleCategory'; category: Category }
  | { type: 'clearCategories' }
  | { type: 'clearDates' }
  /** Sources, categories and dates to their defaults; the keyword stays. */
  | { type: 'clearFilters' }
  /** Everything Explore can ask for, keyword included. */
  | { type: 'reset' }
  | { type: 'goToPage'; page: number }
  | { type: 'nextPage' }

export const INITIAL_EXPLORE: ExploreState = {
  keyword: '',
  sources: [...ALL_SOURCE_IDS],
  categories: [],
  dateFrom: '',
  dateTo: '',
  page: 1,
}

const NO_FILTERS = {
  sources: INITIAL_EXPLORE.sources,
  categories: INITIAL_EXPLORE.categories,
  dateFrom: '',
  dateTo: '',
} satisfies ExploreFilters

/**
 * Every action that changes what is being asked for also returns to page 1.
 * As separate `useState` setters that was a rule each caller had to remember;
 * here it is part of the transition, so page 7 of a brand-new search cannot
 * happen.
 */
export function exploreReducer(state: ExploreState, action: ExploreAction): ExploreState {
  switch (action.type) {
    case 'keyword':
      return { ...state, keyword: action.value, page: 1 }
    case 'dateFrom':
      return { ...state, dateFrom: action.value, page: 1 }
    case 'dateTo':
      return { ...state, dateTo: action.value, page: 1 }
    case 'toggleSource':
      return { ...state, sources: toggle(state.sources, action.id), page: 1 }
    case 'toggleCategory':
      return { ...state, categories: toggle(state.categories, action.category), page: 1 }
    case 'clearCategories':
      return { ...state, categories: [], page: 1 }
    case 'clearDates':
      return { ...state, dateFrom: '', dateTo: '', page: 1 }
    case 'clearFilters':
      return { ...state, ...NO_FILTERS, page: 1 }
    case 'reset':
      return { ...INITIAL_EXPLORE }
    case 'goToPage':
      return { ...state, page: Math.max(1, action.page) }
    case 'nextPage':
      return { ...state, page: state.page + 1 }
  }
}

/** A date range counts once, matching the chips shown above the feed. */
export function countActiveFilters(state: ExploreState): number {
  return (
    state.categories.length +
    (state.dateFrom || state.dateTo ? 1 : 0) +
    (state.sources.length === ALL_SOURCE_IDS.length ? 0 : 1)
  )
}
