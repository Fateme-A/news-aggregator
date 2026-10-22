import { cn } from '@/lib/cn'

export interface Segment<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  segments: readonly Segment<T>[]
  value: T
  onChange: (value: T) => void
  'aria-label': string
  className?: string
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  'aria-label': ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex h-12 items-center gap-1 rounded-full bg-surface-muted p-1 ring-1 ring-border ring-inset lg:h-11',
        className,
      )}
    >
      {segments.map((segment) => {
        const active = segment.value === value
        return (
          <button
            key={segment.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(segment.value)}
            className={cn(
              'h-10 flex-1 rounded-full px-4 text-sm font-medium whitespace-nowrap lg:h-9',
              'transition-all duration-200',
              active
                ? 'bg-surface text-ink shadow-subtle'
                : 'text-muted hover:text-ink active:scale-[0.98]',
            )}
          >
            {segment.label}
          </button>
        )
      })}
    </div>
  )
}
