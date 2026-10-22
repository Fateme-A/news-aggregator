import type { Category, SourceId } from '@/domain/article'
import { cn } from '@/lib/cn'
import { IconX } from '@tabler/icons-react'
import { describeActiveFilters } from '../lib/active-filters'
import type { ExploreFilters } from '../lib/filters'

interface ActiveFiltersProps {
  values: ExploreFilters
  onRemoveSource: (id: SourceId) => void
  onRemoveCategory: (category: Category) => void
  onClearDates: () => void
  onClearAll: () => void
  className?: string
}

/**
 * What is narrowing the feed, and one tap to undo any of it. The controls
 * themselves sit in a sidebar on desktop and behind a sheet on a phone, so
 * without this the narrowest layout shows only a count on a button.
 */
export function ActiveFilters({
  values,
  onRemoveSource,
  onRemoveCategory,
  onClearDates,
  onClearAll,
  className,
}: ActiveFiltersProps) {
  const filters = describeActiveFilters(values)
  if (filters.length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <ul aria-label="Applied filters" className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <li key={filter.key} className="min-w-0">
            {/* The whole chip is the control: a nested × would be a 24px
                target, under the 40px bar, and removal is the only action. */}
            <button
              type="button"
              aria-label={`Remove filter: ${filter.label}`}
              onClick={() => {
                if (filter.kind === 'source') onRemoveSource(filter.id)
                else if (filter.kind === 'category') onRemoveCategory(filter.id)
                else onClearDates()
              }}
              className="group inline-flex h-10 max-w-full items-center gap-1.5 rounded-full bg-surface-muted pr-2.5 pl-3.5 text-[13px] text-ink ring-1 ring-border ring-inset transition-all duration-200 hover:ring-border-strong active:scale-[0.97] lg:h-8 lg:pr-2 lg:pl-3"
            >
              <span className="truncate">{filter.label}</span>
              <IconX
                size={13}
                stroke={2.5}
                aria-hidden
                className="shrink-0 text-subtle transition-colors group-hover:text-ink"
              />
            </button>
          </li>
        ))}
      </ul>

      {filters.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex h-10 items-center rounded-full px-3 text-[13px] font-medium text-accent transition-colors hover:bg-accent-soft lg:h-8 lg:px-2.5"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
