import type { Article } from '@/domain/article'
import { useSourceAvailability } from '@/features/data-mode/hooks/useSourceAvailability'
import { useArticles, type SourceFailure } from '@/features/feed/hooks/useArticles'
import { useFeedQuery, type FeedQuery } from '@/features/feed/hooks/useFeedQuery'
import { describeClientFilters } from '@/features/feed/lib/describe-filters'
import {
  canLoadMore as canLoadMoreFrom,
  resolveFeedFooter,
  resolveFeedState,
  type FeedFooterState,
  type FeedState,
} from '@/features/feed/lib/feed-state'
import { describePersonalisation } from '@/features/preferences/lib/summary'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useDataMode, type DataPreference, type SourceDelivery } from '@/store/data-mode'
import { usePreferences, type BrowseMode, type FeedMode } from '@/store/preferences'
import { useCallback, useState, type RefObject } from 'react'

export type DialogName = 'filters' | 'preferences' | 'settings'

export interface Newsstand {
  feed: FeedQuery

  state: FeedState
  articles: Article[]
  failures: SourceFailure[]
  /** Disclosures about filters applied in the browser, and coverage gaps. */
  notices: string[]

  deliveries: SourceDelivery[]
  isResolvingMode: boolean
  usingSample: boolean

  feedMode: FeedMode
  needsPersonalising: boolean
  personalisationSummary: string

  browseMode: BrowseMode
  footer: FeedFooterState
  isFetching: boolean
  hasMore: boolean
  sentinelRef: RefObject<HTMLDivElement | null>

  openDialog: DialogName | null
  open: (dialog: DialogName) => void
  close: () => void

  goToPage: (page: number) => void
  changeFeedMode: (mode: FeedMode) => void
  changeBrowseMode: (mode: BrowseMode) => void
  changeDataPreference: (preference: DataPreference) => void
}

/** Resolve `needsPersonalising` before `useArticles`; it decides whether a request is made. */
export function useNewsstand(): Newsstand {
  const feed = useFeedQuery()
  const [openDialog, setOpenDialog] = useState<DialogName | null>(null)

  const feedMode = usePreferences((state) => state.mode)
  const setFeedMode = usePreferences((state) => state.setMode)
  const browseMode = usePreferences((state) => state.browseMode)
  const setBrowseMode = usePreferences((state) => state.setBrowseMode)
  const savedCategories = usePreferences((state) => state.categories)
  const savedAuthors = usePreferences((state) => state.authors)
  const hasPreferences = usePreferences((state) => state.hasPreferences())

  const dataPreference = useDataMode((state) => state.preference)
  const setDataPreference = useDataMode((state) => state.setPreference)
  useSourceAvailability()

  const hasSources = feed.sources.length > 0
  // No sources, categories, or authors means nothing to follow, so My Feed asks
  // for choices rather than fetching.
  const needsPersonalising = feed.isMyFeed && !hasPreferences

  const {
    articles,
    isLoading,
    isFetching,
    failures,
    allFailed,
    hasMore,
    clientFilters,
    caveats,
    deliveries,
    isResolvingMode,
    atPageCap,
  } = useArticles(feed.query, feed.sources, {
    enabled: hasSources && !needsPersonalising,
    accumulate: browseMode === 'infinite',
  })

  const { setPage, nextPage } = feed

  const changeFeedMode = useCallback(
    (mode: FeedMode) => {
      setFeedMode(mode)
      setPage(1)
      // The Explore filter sheet has no meaning in My Feed.
      if (mode === 'my-feed') setOpenDialog((current) => (current === 'filters' ? null : current))
    },
    [setFeedMode, setPage],
  )

  const changeBrowseMode = useCallback(
    (mode: BrowseMode) => {
      if (mode === browseMode) return
      setBrowseMode(mode)
      setPage(1)
    },
    [browseMode, setBrowseMode, setPage],
  )

  const changeDataPreference = useCallback(
    (preference: DataPreference) => {
      setDataPreference(preference)
      setPage(1)
    },
    [setDataPreference, setPage],
  )

  const sentinelRef = useInfiniteScroll({
    enabled: browseMode === 'infinite' && canLoadMoreFrom({ atPageCap, hasMore }) && !isFetching,
    onLoadMore: nextPage,
  })

  const clientFilterNotice = describeClientFilters(clientFilters)

  return {
    feed,

    state: resolveFeedState({
      needsPersonalising,
      hasSources,
      isLoading,
      allFailed,
      articleCount: articles.length,
    }),
    articles,
    failures,
    notices: clientFilterNotice ? [clientFilterNotice, ...caveats] : caveats,

    deliveries,
    isResolvingMode,
    usingSample:
      dataPreference === 'demo' || deliveries.some((delivery) => delivery.origin === 'demo'),

    feedMode,
    needsPersonalising,
    personalisationSummary: describePersonalisation(savedCategories, savedAuthors),

    browseMode,
    footer: resolveFeedFooter({ isFetching, atPageCap, hasMore }),
    isFetching,
    hasMore,
    sentinelRef,

    openDialog,
    open: setOpenDialog,
    close: useCallback(() => setOpenDialog(null), []),

    goToPage: setPage,
    changeFeedMode,
    changeBrowseMode,
    changeDataPreference,
  }
}
