import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { Category, SourceId } from '@/domain/article'
import { DEFAULT_PAGE_SIZE, type ArticleQuery } from '@/domain/query'
import { DataModeBar } from '@/features/data-mode/DataModeBar'
import { ArticleGrid } from '@/features/feed/ArticleGrid'
import {
  AllFailedState,
  EmptyState,
  FeedSkeleton,
  NoSourcesState,
  SourceFailureNotice,
} from '@/features/feed/FeedStates'
import { PreferencesDialog } from '@/features/preferences/PreferencesDialog'
import { FilterPanel } from '@/features/search/FilterPanel'
import { SearchBar } from '@/features/search/SearchBar'
import { useArticles } from '@/hooks/useArticles'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useSourceAvailability } from '@/hooks/useSourceAvailability'
import { pluralize } from '@/lib/text'
import { ALL_SOURCE_IDS } from '@/sources/registry'
import { useDataMode } from '@/store/data-mode'
import type { FeedMode } from '@/store/preferences'
import { usePreferences } from '@/store/preferences'
import { useTheme } from '@/store/theme'
import {
  IconAdjustmentsHorizontal,
  IconFilter,
  IconMoon,
  IconStar,
  IconSun,
} from '@tabler/icons-react'
import { useState } from 'react'

const FEED_MODES = [
  { value: 'explore', label: 'Explore' },
  { value: 'my-feed', label: 'My Feed' },
] as const satisfies readonly { value: FeedMode; label: string }[]

export function App() {
  const [keyword, setKeyword] = useState('')
  const [exploreSources, setExploreSources] = useState<SourceId[]>(() => [...ALL_SOURCE_IDS])
  const [categories, setCategories] = useState<Category[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const theme = useTheme((state) => state.theme)
  const toggleTheme = useTheme((state) => state.toggleTheme)

  const preferences = usePreferences()
  const isMyFeed = preferences.mode === 'my-feed'
  useSourceAvailability()

  const debouncedKeyword = useDebouncedValue(keyword, 400)

  const activeSources = isMyFeed ? preferences.sources : exploreSources
  const activeCategories = isMyFeed ? preferences.categories : categories
  const activeAuthors = isMyFeed ? preferences.authors : []

  const query: ArticleQuery = {
    keyword: debouncedKeyword,
    categories: activeCategories,
    authors: activeAuthors,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    ...(!isMyFeed && dateFrom ? { dateFrom } : {}),
    ...(!isMyFeed && dateTo ? { dateTo } : {}),
  }

  const {
    articles,
    isLoading,
    isFetching,
    failures,
    allFailed,
    hasMore,
    clientFilteredSources,
    deliveries,
    isResolvingMode,
  } = useArticles(query, activeSources, activeSources.length > 0)

  function resetToFirstPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  function toggleCategory(category: Category) {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    )
    setPage(1)
  }

  function toggleSource(id: SourceId) {
    setExploreSources((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
    setPage(1)
  }

  function resetFilters() {
    setKeyword('')
    setExploreSources([...ALL_SOURCE_IDS])
    setCategories([])
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  function goToPage(next: number) {
    setPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function renderFilterPanel(idPrefix: string) {
    return (
      <FilterPanel
        idPrefix={idPrefix}
        values={{ sources: exploreSources, categories, dateFrom, dateTo }}
        onToggleSource={toggleSource}
        onToggleCategory={toggleCategory}
        onDateFromChange={resetToFirstPage(setDateFrom)}
        onDateToChange={resetToFirstPage(setDateTo)}
        onReset={resetFilters}
      />
    )
  }

  const hasSources = activeSources.length > 0
  const activeFilterCount =
    categories.length +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (exploreSources.length === ALL_SOURCE_IDS.length ? 0 : 1)

  const personalisationSummary = [
    preferences.categories.length > 0 &&
      pluralize(preferences.categories.length, 'category', 'categories'),
    preferences.authors.length > 0 && pluralize(preferences.authors.length, 'author'),
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-3 px-4 py-3 sm:px-6 lg:h-20 lg:flex-nowrap lg:gap-x-6 lg:py-0">
          <a
            href="/"
            className="order-1 mr-auto flex min-w-0 items-center gap-2.5 rounded-full py-1.5 no-underline lg:mr-0"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink font-serif text-sm font-semibold text-canvas">
              N
            </span>
            <span className="truncate font-serif text-xl leading-none font-medium tracking-tight text-ink sm:text-2xl">
              News<span className="text-accent">stand</span>
            </span>
          </a>

          <div className="order-2 min-w-0 basis-full lg:order-2 lg:basis-auto lg:flex-1">
            <SearchBar
              value={keyword}
              onChange={resetToFirstPage(setKeyword)}
              isSearching={isFetching && !isLoading}
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

          {!isMyFeed && (
            <Button
              aria-label={activeFilterCount > 0 ? `Filter, ${activeFilterCount} active` : 'Filter'}
              onClick={() => setFiltersOpen(true)}
              className="order-1 h-11 shrink-0 px-3.5 lg:hidden"
            >
              <IconFilter size={18} stroke={1.75} aria-hidden />
              Filter
              {activeFilterCount > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-canvas">
                  {activeFilterCount}
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
            Personalise
          </Button>
        </div>

        <DataModeBar
          deliveries={deliveries}
          pending={isResolvingMode}
          onChange={(preference) => {
            useDataMode.getState().setPreference(preference)
            setPage(1)
          }}
        />
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-4 pb-28 sm:px-6 sm:pt-6 lg:flex lg:gap-8 lg:pt-8 lg:pb-8">
        <aside className="hidden w-[17rem] shrink-0 lg:block">
          <div className="sticky top-28 rounded-card bg-surface p-5 ring-1 ring-border ring-inset">
            {isMyFeed ? (
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

        <main className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-4 lg:mb-5">
            <nav
              aria-label="Feed mode"
              className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-canvas/95 px-4 pt-2.5 backdrop-blur-xl pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:inset-auto lg:z-auto lg:w-auto lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
            >
              <SegmentedControl
                aria-label="Feed mode"
                segments={FEED_MODES}
                value={preferences.mode}
                onChange={(mode) => {
                  preferences.setMode(mode)
                  setPage(1)
                  if (mode === 'my-feed') setFiltersOpen(false)
                }}
                className="w-full lg:w-auto"
              />
            </nav>

            {hasSources && !isLoading && articles.length > 0 && (
              <p className="text-[13px] text-muted" role="status">
                {pluralize(articles.length, 'article')}
                {debouncedKeyword && (
                  <>
                    {' for '}
                    <span className="font-medium text-ink">“{debouncedKeyword}”</span>
                  </>
                )}
              </p>
            )}
          </div>

          {isMyFeed && (
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

          {clientFilteredSources.length > 0 && (
            <p className="mb-4 text-xs leading-relaxed text-subtle">
              {clientFilteredSources.join(' and ')} cannot filter by author upstream, so those
              results are narrowed in the browser.
            </p>
          )}

          <SourceFailureNotice failures={failures} />

          {!hasSources ? (
            <NoSourcesState />
          ) : isLoading ? (
            <FeedSkeleton />
          ) : allFailed ? (
            <AllFailedState failures={failures} />
          ) : articles.length === 0 ? (
            <EmptyState onReset={resetFilters} />
          ) : (
            <>
              <ArticleGrid articles={articles} />

              <nav
                aria-label="Pagination"
                className="mt-8 flex items-center justify-center gap-2 sm:mt-10"
              >
                <Button
                  disabled={page === 1 || isFetching}
                  onClick={() => goToPage(Math.max(1, page - 1))}
                >
                  Previous
                </Button>
                <span className="min-w-20 text-center text-[13px] text-muted" aria-current="page">
                  Page {page}
                </span>
                <Button disabled={!hasMore || isFetching} onClick={() => goToPage(page + 1)}>
                  Next
                </Button>
              </nav>
            </>
          )}
        </main>
      </div>

      {!isMyFeed && (
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
