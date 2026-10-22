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
        'inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full bg-surface-muted p-0.5 ring-1 ring-border ring-inset',
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
              'h-7 rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
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
