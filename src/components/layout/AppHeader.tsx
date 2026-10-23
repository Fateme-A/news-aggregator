import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/features/search/components/SearchBar'
import { IconAdjustmentsHorizontal, IconFilter, IconSettings } from '@tabler/icons-react'

interface AppHeaderProps {
  keyword: string
  onKeywordChange: (value: string) => void
  showFilterButton: boolean
  activeFilterCount: number
  usingSample: boolean
  onOpenFilters: () => void
  onOpenSettings: () => void
  onOpenPreferences: () => void
}

export function AppHeader({
  keyword,
  onKeywordChange,
  showFilterButton,
  activeFilterCount,
  usingSample,
  onOpenFilters,
  onOpenSettings,
  onOpenPreferences,
}: AppHeaderProps) {
  return (
    <header
      data-sticky-header
      className="sticky top-0 z-30 border-b border-border/70 bg-canvas/80 backdrop-blur-xl"
    >
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
            <SearchBar value={keyword} onChange={onKeywordChange} />
          </div>
        </div>

        <ThemeToggle className="order-1 shrink-0" />

        <Button
          size="icon"
          aria-label={usingSample ? 'Settings — showing sample articles' : 'Settings'}
          onClick={onOpenSettings}
          className="relative order-1 shrink-0 lg:order-3"
        >
          <IconSettings size={18} stroke={1.75} aria-hidden />
          {usingSample && (
            <span
              aria-hidden
              className="absolute top-1.5 right-1.5 size-2 rounded-full bg-warning-ink ring-2 ring-canvas"
            />
          )}
        </Button>

        {showFilterButton && (
          <Button
            aria-label={activeFilterCount > 0 ? `Filter, ${activeFilterCount} active` : 'Filter'}
            onClick={onOpenFilters}
            className="order-1 h-11 shrink-0 px-3.5 lg:hidden"
          >
            <IconFilter size={18} stroke={1.75} aria-hidden />
            {activeFilterCount > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-canvas">
                {activeFilterCount}
              </span>
            )}
          </Button>
        )}

        <Button
          aria-label="Personalise"
          onClick={onOpenPreferences}
          className="order-1 h-11 shrink-0 px-3.5 sm:px-5 lg:order-3"
        >
          <IconAdjustmentsHorizontal size={18} stroke={1.75} aria-hidden />
          <span className="hidden sm:inline">Personalise</span>
        </Button>
      </div>
    </header>
  )
}
