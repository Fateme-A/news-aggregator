import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { DataModeBar } from '@/features/data-mode/DataModeBar'
import { ArticleGrid } from '@/features/feed/ArticleGrid'
import { BrowseModeSwitch } from '@/features/feed/BrowseModeSwitch'
import { describeClientFilters } from '@/features/feed/describe-filters'
import {
  AllFailedState,
  EmptyState,
  FeedSkeleton,
  NoSourcesState,
  SourceFailureNotice,
} from '@/features/feed/FeedStates'
import { PreferencesDialog } from '@/features/preferences/PreferencesDialog'
import { CategoryRail } from '@/features/search/CategoryRail'
import { FilterPanel } from '@/features/search/FilterPanel'
import { SearchBar } from '@/features/search/SearchBar'
import { MAX_PAGES, useArticles } from '@/hooks/useArticles'
import { useFeedQuery } from '@/hooks/useFeedQuery'
import { useSourceAvailability } from '@/hooks/useSourceAvailability'
import { pluralize } from '@/lib/text'
import { useDataMode } from '@/store/data-mode'
import type { BrowseMode, FeedMode } from '@/store/preferences'
import { usePreferences } from '@/store/preferences'
import { useTheme } from '@/store/theme'
import {
  IconAdjustmentsHorizontal,
  IconFilter,
  IconMoon,
  IconStar,
  IconSun,
} from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'

const FEED_MODES = [
  { value: 'explore', label: 'Explore' },
  { value: 'my-feed', label: 'My Feed' },
] as const satisfies readonly { value: FeedMode; label: string }[]

export function App() {
  const feed = useFeedQuery()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)

  const theme = useTheme((state) => state.theme)
  const toggleTheme = useTheme((state) => state.toggleTheme)

  const feedMode = usePreferences((state) => state.mode)
  const setFeedMode = usePreferences((state) => state.setMode)
  const browseMode = usePreferences((state) => state.browseMode)
  const setBrowseMode = usePreferences((state) => state.setBrowseMode)
  const savedCategories = usePreferences((state) => state.categories)
  const savedAuthors = usePreferences((state) => state.authors)

  const setDataPreference = useDataMode((state) => state.setPreference)
  useSourceAvailability()

  const hasSources = feed.sources.length > 0
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
    enabled: hasSources,
    accumulate: browseMode === 'infinite',
  })

  const clientFilterNotice = describeClientFilters(clientFilters)
  const waitingForFirstPage = articles.length === 0 && isLoading
  const canLoadMore = hasMore && !atPageCap

  // The sentinel only ever asks for one more page; the hook decides whether that
  // costs a request or comes back from cache.
  const sentinelRef = useRef<HTMLDivElement>(null)
  const { nextPage } = feed

  useEffect(() => {
    if (browseMode !== 'infinite' || !canLoadMore || isFetching) return
    const node = sentinelRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) nextPage()
      },
      { rootMargin: '240px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [browseMode, canLoadMore, isFetching, nextPage])

  function goToPage(next: number) {
    feed.setPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function changeBrowseMode(mode: BrowseMode) {
    if (mode === browseMode) return
    setBrowseMode(mode)
    feed.setPage(1)
  }

  function renderFilterPanel(idPrefix: string) {
    return (
      <FilterPanel
        idPrefix={idPrefix}
        values={feed.explore}
        onToggleSource={feed.toggleSource}
        onToggleCategory={feed.toggleCategory}
        onDateFromChange={feed.setDateFrom}
        onDateToChange={feed.setDateTo}
        onReset={feed.resetFilters}
      />
    )
  }

  const personalisationSummary = [
    savedCategories.length > 0 && pluralize(savedCategories.length, 'category', 'categories'),
    savedAuthors.length > 0 && pluralize(savedAuthors.length, 'author'),
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="min-h-dvh">
      <a
        href="#feed"
        className="sr-only rounded-field bg-ink px-4 py-2 text-sm font-medium text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to articles
      </a>

      <header className="sticky top-0 z-30 border-b border-border/70 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-3 px-4 py-3 sm:px-6 lg:h-20 lg:flex-nowrap lg:gap-x-6 lg:py-0">
          <h1 className="order-1 mr-auto min-w-0 lg:mr-0">
            <a
              href="/"
              className="flex min-w-0 items-center gap-2.5 rounded-full py-1.5 no-underline"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink font-serif text-sm font-semibold text-canvas">
                N
              </span>
              <span className="truncate font-serif text-xl leading-none font-medium tracking-tight text-ink sm:text-2xl">
                News<span className="text-accent">stand</span>
              </span>
              <span className="sr-only">
                — news from The Guardian, The New York Times and NewsAPI
              </span>
            </a>
          </h1>

          <div className="order-2 flex min-w-0 basis-full items-center gap-2 lg:contents">
            <div className="min-w-0 flex-1 lg:order-2">
              <SearchBar
                value={feed.keyword}
                onChange={feed.setKeyword}
                isSearching={isFetching && !isLoading}
              />
            </div>

            <DataModeBar
              deliveries={deliveries}
              pending={isResolvingMode}
              onChange={(preference) => {
                setDataPreference(preference)
                feed.setPage(1)
              }}
              className="lg:order-3"
            />
          </div>

          <Button
            size="icon"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
            className="order-1 shrink-0"
          >
            {theme === 'dark' ? (
              <IconSun size={18} stroke={1.75} aria-hidden />
            ) : (
              <IconMoon size={18} stroke={1.75} aria-hidden />
            )}
          </Button>

          {!feed.isMyFeed && (
            <Button
              aria-label={
                feed.activeFilterCount > 0 ? `Filter, ${feed.activeFilterCount} active` : 'Filter'
              }
              onClick={() => setFiltersOpen(true)}
              className="order-1 h-11 shrink-0 px-3.5 lg:hidden"
            >
              <IconFilter size={18} stroke={1.75} aria-hidden />
              Filter
              {feed.activeFilterCount > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-canvas">
                  {feed.activeFilterCount}
                </span>
              )}
            </Button>
          )}

          <Button
            aria-label="Personalise"
            onClick={() => setPreferencesOpen(true)}
            className="order-1 h-11 shrink-0 px-3.5 sm:px-5 lg:order-3"
          >
            <IconAdjustmentsHorizontal size={18} stroke={1.75} aria-hidden />
            <span className="hidden sm:inline">Personalise</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-4 pb-28 sm:px-6 sm:pt-6 lg:flex lg:gap-8 lg:pt-8 lg:pb-8">
        <aside className="hidden w-[17rem] shrink-0 lg:block">
          <div className="sticky top-24 rounded-card bg-surface p-5 ring-1 ring-border ring-inset">
            {feed.isMyFeed ? (
              <div>
                <h2 className="font-serif text-xl font-medium tracking-tight text-ink">My Feed</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {personalisationSummary
                    ? `Saved choices: ${personalisationSummary}.`
                    : 'Saved sources, categories, and authors shape this feed.'}
                </p>
              </div>
            ) : (
              renderFilterPanel('sidebar')
            )}
          </div>
        </aside>

        <main id="feed" className="min-w-0 flex-1">
          <h2 className="sr-only">Articles</h2>

          <div className="mb-4 flex items-center justify-between gap-4 lg:mb-5">
            <nav
              aria-label="Feed mode"
              className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-canvas/95 px-4 pt-2.5 backdrop-blur-xl pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:inset-auto lg:z-auto lg:mr-auto lg:w-auto lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
            >
              <SegmentedControl
                aria-label="Feed mode"
                segments={FEED_MODES}
                value={feedMode}
                onChange={(mode) => {
                  setFeedMode(mode)
                  feed.setPage(1)
                  if (mode === 'my-feed') setFiltersOpen(false)
                }}
                className="w-full lg:w-auto"
              />
            </nav>

            {hasSources && articles.length > 0 && (
              <p className="mr-auto text-[13px] text-muted lg:mr-0" role="status">
                {pluralize(articles.length, 'article')}
                {feed.query.keyword && (
                  <>
                    {' for '}
                    <span className="font-medium text-ink">“{feed.query.keyword}”</span>
                  </>
                )}
              </p>
            )}

            <BrowseModeSwitch
              value={browseMode}
              onChange={changeBrowseMode}
              className={hasSources && articles.length > 0 ? undefined : 'ml-auto'}
            />
          </div>

          {!feed.isMyFeed && (
            <CategoryRail
              className="mb-4 lg:hidden"
              selected={feed.explore.categories}
              onToggle={feed.toggleCategory}
              onClear={feed.clearCategories}
            />
          )}

          {feed.isMyFeed && (
            <div className="mb-5 flex items-start gap-3 rounded-card bg-accent-soft px-4 py-3.5 ring-1 ring-accent/15 ring-inset lg:hidden">
              <IconStar
                size={18}
                stroke={1.75}
                className="mt-0.5 shrink-0 text-accent"
                aria-hidden
              />
              <p className="text-sm leading-relaxed text-accent-ink">
                Showing your personalised feed
                {personalisationSummary && (
                  <span className="text-accent-ink/75"> — {personalisationSummary}</span>
                )}
              </p>
            </div>
          )}

          {(clientFilterNotice || caveats.length > 0) && (
            <div className="mb-4 space-y-1 text-xs leading-relaxed text-subtle">
              {clientFilterNotice && <p>{clientFilterNotice}</p>}
              {caveats.map((caveat) => (
                <p key={caveat}>{caveat}</p>
              ))}
            </div>
          )}

          <SourceFailureNotice failures={failures} />

          {!hasSources ? (
            <NoSourcesState />
          ) : waitingForFirstPage ? (
            <FeedSkeleton />
          ) : allFailed && articles.length === 0 ? (
            <AllFailedState failures={failures} />
          ) : articles.length === 0 ? (
            <EmptyState onReset={feed.resetFilters} />
          ) : (
            <>
              <ArticleGrid articles={articles} />

              {browseMode === 'pages' ? (
                <nav
                  aria-label="Pagination"
                  className="mt-8 flex items-center justify-center gap-2 sm:mt-10"
                >
                  <Button
                    disabled={feed.page === 1 || isFetching}
                    onClick={() => goToPage(Math.max(1, feed.page - 1))}
                  >
                    Previous
                  </Button>
                  <span className="min-w-20 text-center text-[13px] text-muted" role="status">
                    Page {feed.page}
                  </span>
                  <Button disabled={!hasMore || isFetching} onClick={() => goToPage(feed.page + 1)}>
                    Next
                  </Button>
                </nav>
              ) : (
                <div ref={sentinelRef} className="mt-8 flex justify-center sm:mt-10">
                  {isFetching ? (
                    <p role="status" className="text-[13px] text-muted">
                      Loading more articles
                    </p>
                  ) : atPageCap ? (
                    <p className="max-w-sm text-center text-[13px] text-subtle">
                      Showing the first {MAX_PAGES} pages. Narrow the search to see more.
                    </p>
                  ) : canLoadMore ? (
                    <span className="sr-only">More articles load as you reach the end</span>
                  ) : (
                    <p className="text-[13px] text-subtle">End of the feed</p>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {!feed.isMyFeed && (
        <Dialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          title="Filter Explore"
          description="Sources, categories, and dates apply to Explore. My Feed uses Personalise."
          footer={
            <Button variant="primary" onClick={() => setFiltersOpen(false)}>
              Done
            </Button>
          }
        >
          {renderFilterPanel('sheet')}
        </Dialog>
      )}

      <PreferencesDialog open={preferencesOpen} onOpenChange={setPreferencesOpen} />
    </div>
  )
}
