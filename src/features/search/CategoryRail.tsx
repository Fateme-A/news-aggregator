import { CATEGORY_ICONS } from '@/components/icons'
import { Chip } from '@/components/ui/Chip'
import { cn } from '@/lib/cn'
import type { Category } from '@/domain/article'
import { CATEGORIES, CATEGORY_LABELS } from '@/domain/article'

/**
 * The category filter, as a swipeable rail, below `lg` only.
 *
 * On desktop the categories live in the sidebar. On a phone that sidebar is
 * behind a sheet, so the most-used filter would otherwise cost two taps. The
 * rail bleeds to the viewport edges so chips run off-screen — signalling that
 * it scrolls — while the scrolling itself is contained (see the `rail` utility
 * in `index.css`), so it can never become a page-level horizontal scroll.
 */
interface CategoryRailProps {
  selected: Category[]
  onToggle: (category: Category) => void
  onClear: () => void
  className?: string
}

export function CategoryRail({ selected, onToggle, onClear, className }: CategoryRailProps) {
  return (
    <div className={cn('-mx-4 sm:-mx-6', className)}>
      <div className="rail gap-2 px-4 py-0.5 sm:px-6" role="group" aria-label="Category">
        <Chip selected={selected.length === 0} onClick={onClear}>
          All
        </Chip>

        <span className="my-2 w-px shrink-0 bg-border" aria-hidden="true" />

        {CATEGORIES.map((category) => (
          <Chip
            key={category}
            icon={CATEGORY_ICONS[category]}
            selected={selected.includes(category)}
            onClick={() => onToggle(category)}
          >
            {CATEGORY_LABELS[category]}
          </Chip>
        ))}
      </div>
    </div>
  )
}
