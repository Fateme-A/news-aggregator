import { CATEGORY_ICONS } from '@/components/icons'
import { Chip } from '@/components/ui/Chip'
import { cn } from '@/lib/cn'
import type { Category } from '@/domain/article'
import { CATEGORIES, CATEGORY_LABELS } from '@/domain/article'

interface CategoryRailProps {
  selected: Category[]
  onToggle: (category: Category) => void
  onClear: () => void
  className?: string
}

export function CategoryRail({ selected, onToggle, onClear, className }: CategoryRailProps) {
  return (
    <div className={cn('-mx-4 sm:-mx-6', className)}>
      <div className="rail gap-2 px-4 py-0.5 sm:px-6">
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
