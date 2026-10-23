import type { Category, SourceId } from '@/domain/article'
import { DEFAULT_PAGE_SIZE, type ArticleQuery } from '@/domain/query'
import {
  countActiveFilters,
  exploreReducer,
  INITIAL_EXPLORE,
  type ExploreState,
} from '@/features/feed/lib/explore-reducer'
import type { ExploreFilters } from '@/features/search/lib/filters'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePreferences } from '@/store/preferences'
import { useMemo, useReducer } from 'react'

export interface FeedQuery {
  /** Raw keyword, for the controlled input. */
  keyword: string
  /** Settled keyword, 400 ms behind. This is what reaches the providers. */
  query: ArticleQuery
  sources: SourceId[]
  explore: ExploreFilters
  page: number
  isMyFeed: boolean
  activeFilterCount: number

  setKeyword: (value: string) => void
  setDateFrom: (value: string) => void
  setDateTo: (value: string) => void
  toggleSource: (id: SourceId) => void
  toggleCategory: (category: Category) => void
  clearCategories: () => void
  clearDates: () => void
  clearFilters: () => void
  resetFilters: () => void
  setPage: (page: number) => void
  nextPage: () => void
}

/** Shared empty array, so Explore's query identity does not churn each render. */
const EMPTY_AUTHORS: string[] = []

interface QueryInput {
  explore: ExploreState
  keyword: string
  isMyFeed: boolean
  savedCategories: Category[]
  savedAuthors: string[]
}

/**
 * One `ArticleQuery` from whichever set of inputs is active.
 *
 * My Feed deliberately carries no date range: it is a standing set of
 * interests, not a point-in-time search, so a stale range would hide new
 * articles.
 */
function toArticleQuery({
  explore,
  keyword,
  isMyFeed,
  savedCategories,
  savedAuthors,
}: QueryInput): ArticleQuery {
  const base: ArticleQuery = {
    keyword,
    categories: isMyFeed ? savedCategories : explore.categories,
    // Authors are a My Feed concept only; Explore has no author input.
    authors: isMyFeed ? savedAuthors : EMPTY_AUTHORS,
    page: explore.page,
    pageSize: DEFAULT_PAGE_SIZE,
  }
  if (isMyFeed) return base
  return {
    ...base,
    ...(explore.dateFrom ? { dateFrom: explore.dateFrom } : {}),
    ...(explore.dateTo ? { dateTo: explore.dateTo } : {}),
  }
}

/** Explore's inputs live in a reducer and reset on reload; My Feed's are the saved preferences. */
export function useFeedQuery(): FeedQuery {
  const [explore, dispatch] = useReducer(exploreReducer, INITIAL_EXPLORE)

  const mode = usePreferences((state) => state.mode)
  const savedSources = usePreferences((state) => state.sources)
  const savedCategories = usePreferences((state) => state.categories)
  const savedAuthors = usePreferences((state) => state.authors)

  const isMyFeed = mode === 'my-feed'
  const keyword = useDebouncedValue(explore.keyword, 400)

  const query = useMemo(
    () => toArticleQuery({ explore, keyword, isMyFeed, savedCategories, savedAuthors }),
    [explore, keyword, isMyFeed, savedCategories, savedAuthors],
  )

  // `dispatch` is stable, so none of these identities churn between renders.
  return useMemo(
    () => ({
      keyword: explore.keyword,
      query,
      sources: isMyFeed ? savedSources : explore.sources,
      explore,
      page: explore.page,
      isMyFeed,
      activeFilterCount: countActiveFilters(explore),

      setKeyword: (value: string) => dispatch({ type: 'keyword', value }),
      setDateFrom: (value: string) => dispatch({ type: 'dateFrom', value }),
      setDateTo: (value: string) => dispatch({ type: 'dateTo', value }),
      toggleSource: (id: SourceId) => dispatch({ type: 'toggleSource', id }),
      toggleCategory: (category: Category) => dispatch({ type: 'toggleCategory', category }),
      clearCategories: () => dispatch({ type: 'clearCategories' }),
      clearDates: () => dispatch({ type: 'clearDates' }),
      clearFilters: () => dispatch({ type: 'clearFilters' }),
      resetFilters: () => dispatch({ type: 'reset' }),
      setPage: (page: number) => dispatch({ type: 'goToPage', page }),
      nextPage: () => dispatch({ type: 'nextPage' }),
    }),
    [explore, query, isMyFeed, savedSources],
  )
}
