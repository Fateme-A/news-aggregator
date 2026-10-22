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
import { CategoryRail } from '@/features/search/CategoryRail'
import { FilterPanel } from '@/features/search/FilterPanel'
import { SearchBar } from '@/features/search/SearchBar'
import type { FeedMode } from '@/store/preferences'
import { pluralize } from '@/lib/text'
import { useArticles } from '@/hooks/useArticles'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useSourceAvailability } from '@/hooks/useSourceAvailability'
import { useDataMode } from '@/store/data-mode'
import { usePreferences } from '@/store/preferences'
import { IconAdjustmentsHorizontal, IconFilter, IconStar } from '@tabler/icons-react'
import { useState } from 'react'

const FEED_MODES = [
  { value: 'explore', label: 'Explore' },
  { value: 'my-feed', label: 'My Feed' },
] as const satisfies readonly { value: FeedMode; label: string }[]

export function App() {
  const [keyword, setKeyword] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)

  const preferences = usePreferences()
  const isMyFeed = preferences.mode === 'my-feed'
  useSourceAvailability()

  const debouncedKeyword = useDebouncedValue(keyword, 400)

  const activeCategories = isMyFeed ? preferences.categories : categories
  const activeAuthors = isMyFeed ? preferences.authors : []

  const query: ArticleQuery = {
    keyword: debouncedKeyword,
    categories: activeCategories,
    authors: activeAuthors,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
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
  } = useArticles(query, preferences.sources, preferences.sources.length > 0)

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
    preferences.toggleSource(id)
    setPage(1)
  }

  function resetFilters() {
    setKeyword('')
    setCategories([])
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  function goToPage(next: number) {
    setPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filterPanel = (
    <FilterPanel
      values={{ sources: preferences.sources, categories, dateFrom, dateTo }}
      onToggleSource={toggleSource}
      onToggleCategory={toggleCategory}
      onDateFromChange={resetToFirstPage(setDateFrom)}
      onDateToChange={resetToFirstPage(setDateTo)}
      onReset={resetFilters}
    />
  )

  const activeFilterCount = categories.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)
  const hasSources = preferences.sources.length > 0

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
            className="relative order-1 lg:hidden"
            onClick={() => setFiltersOpen(true)}
            aria-label={
              activeFilterCount > 0 ? `Open filters, ${activeFilterCount} active` : 'Open filters'
            }
          >
            <IconFilter size={18} stroke={1.75} aria-hidden />
            {activeFilterCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-accent text-[11px] font-semibold text-white ring-2 ring-canvas">
                {activeFilterCount}
              </span>
            )}
          </Button>

          <Button
            size="icon"
            aria-label="Personalise"
            onClick={() => setPreferencesOpen(true)}
            className="order-1 shrink-0 sm:w-auto sm:px-5 lg:order-3"
          >
            <IconAdjustmentsHorizontal size={18} stroke={1.75} className="sm:hidden" aria-hidden />
            <span className="hidden sm:inline">Personalise</span>
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

      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:flex lg:gap-8 lg:py-8">
        <aside className="hidden w-[17rem] shrink-0 lg:block">
          <div className="sticky top-28 rounded-card bg-surface p-5 ring-1 ring-border ring-inset">
            {filtersOpen ? null : filterPanel}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 flex flex-col gap-3 lg:mb-5 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <SegmentedControl
              aria-label="Feed mode"
              segments={FEED_MODES}
              value={preferences.mode}
              onChange={preferences.setMode}
              className="order-1 w-full max-w-sm lg:w-auto lg:max-w-none"
            />

            {!isMyFeed && (
              <CategoryRail
                className="order-2 lg:hidden"
                selected={categories}
                onToggle={toggleCategory}
                onClear={() => {
                  setCategories([])
                  setPage(1)
                }}
              />
            )}

            {hasSources && !isLoading && articles.length > 0 && (
              <p className="order-3 text-[13px] text-muted lg:order-2" role="status">
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
            <div className="mb-5 flex items-start gap-3 rounded-card bg-accent-soft px-4 py-3.5 ring-1 ring-accent/15 ring-inset">
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

      <Dialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filters"
        footer={
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            onClick={() => setFiltersOpen(false)}
          >
            Show results
          </Button>
        }
      >
        {filterPanel}
      </Dialog>

      <PreferencesDialog open={preferencesOpen} onOpenChange={setPreferencesOpen} />
    </div>
  )
}
