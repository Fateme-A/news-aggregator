import { AppHeader } from '@/components/layout/AppHeader'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { DataModeNotice } from '@/features/data-mode/components/DataModeNotice'
import { ArticleGrid } from '@/features/feed/components/ArticleGrid'
import { FeedPagination, FeedSentinel } from '@/features/feed/components/FeedFooter'
import { FeedNotices } from '@/features/feed/components/FeedNotices'
import {
  AllFailedState,
  EmptyState,
  NoSourcesState,
  PersonaliseState,
  PersonalisedEmptyState,
} from '@/features/feed/components/FeedPlaceholders'
import { FeedSidebar } from '@/features/feed/components/FeedSidebar'
import { FeedSkeleton } from '@/features/feed/components/FeedSkeleton'
import { FeedToolbar } from '@/features/feed/components/FeedToolbar'
import { PersonalisedBanner } from '@/features/feed/components/PersonalisedBanner'
import { ReadingAnchor } from '@/features/feed/components/ReadingAnchor'
import { SourceFailureNotice } from '@/features/feed/components/SourceFailureNotice'
import { useNewsstand } from '@/features/feed/hooks/useNewsstand'
import { PreferencesDialog } from '@/features/preferences/components/PreferencesDialog'
import { ActiveFilters } from '@/features/search/components/ActiveFilters'
import { CategoryRail } from '@/features/search/components/CategoryRail'
import { FilterPanel } from '@/features/search/components/FilterPanel'
import { SettingsDialog } from '@/features/settings/components/SettingsDialog'

export function App() {
  const view = useNewsstand()
  const { feed, state, articles } = view

  const filterPanel = (idPrefix: string) => (
    <FilterPanel
      idPrefix={idPrefix}
      values={feed.explore}
      onToggleSource={feed.toggleSource}
      onToggleCategory={feed.toggleCategory}
      onDateFromChange={feed.setDateFrom}
      onDateToChange={feed.setDateTo}
      onReset={feed.clearFilters}
    />
  )

  return (
    <div className="min-h-dvh">
      <a
        href="#feed"
        className="sr-only rounded-field bg-ink px-4 py-2 text-sm font-medium text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to articles
      </a>

      <AppHeader
        keyword={feed.keyword}
        onKeywordChange={feed.setKeyword}
        showFilterButton={!feed.isMyFeed}
        activeFilterCount={feed.activeFilterCount}
        usingSample={view.usingSample}
        onOpenFilters={() => view.open('filters')}
        onOpenSettings={() => view.open('settings')}
        onOpenPreferences={() => view.open('preferences')}
      />

      <div className="mx-auto max-w-7xl px-4 pt-4 pb-28 sm:px-6 sm:pt-6 lg:flex lg:gap-8 lg:pt-8 lg:pb-8">
        <FeedSidebar
          isMyFeed={feed.isMyFeed}
          personalisationSummary={view.personalisationSummary}
          needsPersonalising={view.needsPersonalising}
          onPersonalise={() => view.open('preferences')}
          renderFilters={() => filterPanel('sidebar')}
        />

        <main id="feed" className="min-w-0 flex-1">
          <h2 className="sr-only">Articles</h2>

          <FeedToolbar
            mode={view.feedMode}
            onModeChange={view.changeFeedMode}
            articleCount={articles.length}
            keyword={feed.query.keyword}
          />

          {!feed.isMyFeed && (
            <>
              <CategoryRail
                className="mb-4 lg:hidden"
                selected={feed.explore.categories}
                onToggle={feed.toggleCategory}
                onClear={feed.clearCategories}
              />
              <ActiveFilters
                className="mb-4"
                values={feed.explore}
                onRemoveSource={feed.toggleSource}
                onRemoveCategory={feed.toggleCategory}
                onClearDates={feed.clearDates}
                onClearAll={feed.clearFilters}
              />
            </>
          )}

          {feed.isMyFeed && !view.needsPersonalising && (
            <PersonalisedBanner summary={view.personalisationSummary} />
          )}

          <DataModeNotice deliveries={view.deliveries} pending={view.isResolvingMode} />
          <FeedNotices notices={view.notices} />
          <SourceFailureNotice failures={view.failures} />

          {state === 'personalise' && (
            <PersonaliseState onPersonalise={() => view.open('preferences')} />
          )}
          {state === 'no-sources' && <NoSourcesState />}
          {state === 'loading' && <FeedSkeleton />}
          {state === 'all-failed' && <AllFailedState failures={view.failures} />}
          {state === 'empty' &&
            (feed.isMyFeed ? (
              <PersonalisedEmptyState
                keyword={feed.query.keyword}
                onPersonalise={() => view.open('preferences')}
              />
            ) : (
              <EmptyState onReset={feed.resetFilters} />
            ))}

          {state === 'articles' && (
            <>
              <ReadingAnchor
                items={articles}
                armed={view.browseMode === 'infinite' && view.isFetching && feed.page > 1}
              >
                <ArticleGrid articles={articles} />
              </ReadingAnchor>

              {view.browseMode === 'pages' ? (
                <FeedPagination
                  page={feed.page}
                  hasMore={view.hasMore}
                  isFetching={view.isFetching}
                  onGoToPage={view.goToPage}
                />
              ) : (
                <FeedSentinel state={view.footer} sentinelRef={view.sentinelRef} />
              )}
            </>
          )}
        </main>
      </div>

      {!feed.isMyFeed && (
        <Dialog
          open={view.openDialog === 'filters'}
          onOpenChange={(open) => (open ? view.open('filters') : view.close())}
          title="Filter Explore"
          description="Sources, categories, and dates apply to Explore. My Feed uses Personalise."
          footer={
            <Button variant="primary" onClick={view.close}>
              Done
            </Button>
          }
        >
          {filterPanel('sheet')}
        </Dialog>
      )}

      <PreferencesDialog
        open={view.openDialog === 'preferences'}
        onOpenChange={(open) => (open ? view.open('preferences') : view.close())}
      />

      <SettingsDialog
        open={view.openDialog === 'settings'}
        onOpenChange={(open) => (open ? view.open('settings') : view.close())}
        deliveries={view.deliveries}
        pending={view.isResolvingMode}
        onBrowseModeChange={view.changeBrowseMode}
        onDataPreferenceChange={view.changeDataPreference}
      />
    </div>
  )
}
