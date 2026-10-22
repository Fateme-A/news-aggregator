import type { Category, SourceId } from '@/domain/article'
import { DEFAULT_PAGE_SIZE, type ArticleQuery } from '@/domain/query'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { ALL_SOURCE_IDS } from '@/sources/registry'
import type { ExploreFilters } from '@/features/search/lib/filters'
import { usePreferences } from '@/store/preferences'
import { useCallback, useMemo, useState } from 'react'

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
  /** Sources, categories and dates back to their defaults; the keyword stays. */
  clearFilters: () => void
  /** Everything Explore can ask for, keyword included. */
  resetFilters: () => void
  setPage: (page: number) => void
  nextPage: () => void
}

/** Shared empty array, so Explore's query identity does not churn each render. */
const EMPTY_AUTHORS: string[] = []

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

/**
 * Decides what to ask for. Explore's inputs live in component state and reset
 * on reload; My Feed's are the saved preferences. Every setter returns to
 * page 1.
 */
export function useFeedQuery(): FeedQuery {
  const [keyword, setKeywordRaw] = useState('')
  const [exploreSources, setExploreSources] = useState<SourceId[]>(() => [...ALL_SOURCE_IDS])
  const [categories, setCategories] = useState<Category[]>([])
  const [dateFrom, setDateFromRaw] = useState('')
  const [dateTo, setDateToRaw] = useState('')
  const [page, setPage] = useState(1)

  const mode = usePreferences((state) => state.mode)
  const savedSources = usePreferences((state) => state.sources)
  const savedCategories = usePreferences((state) => state.categories)
  const savedAuthors = usePreferences((state) => state.authors)

  const isMyFeed = mode === 'my-feed'
  const debouncedKeyword = useDebouncedValue(keyword, 400)

  /** Any input change restarts paging, or a new search opens on page 7. */
  const fromFirstPage = useCallback(<T>(setter: (value: T) => void) => {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }, [])

  const sources = isMyFeed ? savedSources : exploreSources

  const query = useMemo<ArticleQuery>(
    () => ({
      keyword: debouncedKeyword,
      categories: isMyFeed ? savedCategories : categories,
      // Authors are a My Feed concept only; Explore has no author input.
      authors: isMyFeed ? savedAuthors : EMPTY_AUTHORS,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      // My Feed is a standing set of interests, not a point-in-time search:
      // a stale range carried into it would hide new articles.
      ...(!isMyFeed && dateFrom ? { dateFrom } : {}),
      ...(!isMyFeed && dateTo ? { dateTo } : {}),
    }),
    [debouncedKeyword, isMyFeed, savedCategories, categories, savedAuthors, page, dateFrom, dateTo],
  )

  /** Leaves the keyword: it has its own control in the search box. */
  const clearFilters = useCallback(() => {
    setExploreSources([...ALL_SOURCE_IDS])
    setCategories([])
    setDateFromRaw('')
    setDateToRaw('')
    setPage(1)
  }, [])

  /** For the empty state, where an unmatched keyword is the usual cause. */
  const resetFilters = useCallback(() => {
    setKeywordRaw('')
    clearFilters()
  }, [clearFilters])

  const clearDates = useCallback(() => {
    setDateFromRaw('')
    setDateToRaw('')
    setPage(1)
  }, [])

  return {
    keyword,
    query,
    sources,
    explore: { sources: exploreSources, categories, dateFrom, dateTo },
    page,
    isMyFeed,
    // A date range counts once, matching the chips shown above the feed.
    activeFilterCount:
      categories.length +
      (dateFrom || dateTo ? 1 : 0) +
      (exploreSources.length === ALL_SOURCE_IDS.length ? 0 : 1),

    setKeyword: fromFirstPage(setKeywordRaw),
    setDateFrom: fromFirstPage(setDateFromRaw),
    setDateTo: fromFirstPage(setDateToRaw),
    toggleSource: fromFirstPage((id: SourceId) =>
      setExploreSources((current) => toggle(current, id)),
    ),
    toggleCategory: fromFirstPage((category: Category) =>
      setCategories((current) => toggle(current, category)),
    ),
    clearCategories: () => {
      setCategories([])
      setPage(1)
    },
    clearDates,
    clearFilters,
    resetFilters,
    setPage,
    nextPage: () => setPage((current) => current + 1),
  }
}
