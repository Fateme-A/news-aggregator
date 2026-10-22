import type { Category, SourceId } from '@/domain/article'
import { DEFAULT_PAGE_SIZE, type ArticleQuery } from '@/domain/query'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { ALL_SOURCE_IDS } from '@/sources/registry'
import { usePreferences } from '@/store/preferences'
import { useCallback, useMemo, useState } from 'react'

export interface ExploreFilters {
  sources: SourceId[]
  categories: Category[]
  dateFrom: string
  dateTo: string
}

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
 * Owns everything that decides *what to ask for*.
 *
 * Explore and My Feed are two sets of inputs feeding one `ArticleQuery`:
 * Explore's live in component state and reset on reload, My Feed's are the
 * saved preferences. Keeping the switch here rather than in the component is
 * what stops it being re-derived at four call sites, and it means any change
 * that should restart paging can do so in one place — every setter below
 * returns to page 1 on its own.
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

  /** Any input change restarts paging; forgetting this is how page 7 of a new search happens. */
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
      // Dates belong to Explore. My Feed is a standing set of interests, not a
      // point-in-time search, so carrying a stale range into it would quietly
      // hide new articles.
      ...(!isMyFeed && dateFrom ? { dateFrom } : {}),
      ...(!isMyFeed && dateTo ? { dateTo } : {}),
    }),
    [debouncedKeyword, isMyFeed, savedCategories, categories, savedAuthors, page, dateFrom, dateTo],
  )

  const resetFilters = useCallback(() => {
    setKeywordRaw('')
    setExploreSources([...ALL_SOURCE_IDS])
    setCategories([])
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
    activeFilterCount:
      categories.length +
      (dateFrom ? 1 : 0) +
      (dateTo ? 1 : 0) +
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
    resetFilters,
    setPage,
    nextPage: () => setPage((current) => current + 1),
  }
}
