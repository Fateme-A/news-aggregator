import { cn } from '@/lib/cn'
import type { BrowseMode } from '@/store/preferences'

const OPTIONS = [
  { value: 'pages', label: 'Pages', title: 'Move through the feed one page at a time' },
  { value: 'infinite', label: 'Infinite', title: 'Load the next page as you reach the end' },
] as const satisfies readonly { value: BrowseMode; label: string; title: string }[]

export function BrowseModeSwitch({
  value,
  onChange,
  className,
}: {
  value: BrowseMode
  onChange: (mode: BrowseMode) => void
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label="Browsing"
      className={cn(
        // 44px on touch — 40px segments inside a 44px track — shrinking to 32px
        // only from `lg`, where a precise cursor is available.
        'inline-flex h-11 shrink-0 items-center gap-0.5 rounded-full bg-surface-muted p-0.5 ring-1 ring-border ring-inset lg:h-8',
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-10 rounded-full px-3 text-xs font-medium whitespace-nowrap lg:h-7 lg:px-2.5',
              'transition-all duration-200',
              active
                ? 'bg-surface text-ink shadow-subtle'
                : 'text-muted hover:text-ink active:scale-[0.98]',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
