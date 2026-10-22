import { cn } from '@/lib/cn'
import { useDataMode, type DataPreference, type SourceDelivery } from '@/store/data-mode'
import { describeDataMode } from './describe'

/**
 * Auto is the default and the only mode that degrades: it calls a provider when
 * a key is set, falls back to the recorded sample when one is missing or the
 * API refuses, and names the reason. Without a segment of its own there is no
 * way back to it once the reader picks Live or Demo, and the control would have
 * to render Auto as something it is not.
 */
const OPTIONS = [
  { value: 'auto', label: 'Auto', title: 'Live where a key is available, samples otherwise' },
  { value: 'live', label: 'Live', title: 'Always request the news APIs' },
  { value: 'demo', label: 'Demo', title: 'Always show recorded sample articles' },
] as const satisfies readonly { value: DataPreference; label: string; title: string }[]

export function DataModeBar({
  deliveries,
  pending,
  onChange,
  className,
}: {
  deliveries: readonly SourceDelivery[]
  pending: boolean
  onChange: (preference: DataPreference) => void
  className?: string
}) {
  const preference = useDataMode((state) => state.preference)
  const message = describeDataMode(preference, deliveries, pending)
  const usingSample =
    preference === 'demo' || deliveries.some((delivery) => delivery.origin === 'demo')

  return (
    <div className={cn('shrink-0', className)}>
      <p role="status" className="sr-only">
        {message}
      </p>
      <div
        role="group"
        aria-label="Article data"
        title={message}
        className={cn(
          // 40px tall on touch, shrinking to 32px only from `lg`, where a precise
          // cursor is available. A 28px control is a miss on a phone.
          'inline-flex h-11 items-center gap-0.5 rounded-full bg-surface-muted p-0.5 ring-1 ring-inset lg:h-8',
          usingSample ? 'ring-warning-ink/30' : 'ring-border',
        )}
      >
        {OPTIONS.map((option) => {
          const active = option.value === preference
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
                active &&
                  option.value === 'demo' &&
                  'bg-warning-soft text-warning-ink shadow-subtle',
                active && option.value !== 'demo' && 'bg-ink text-canvas shadow-subtle',
                !active && 'text-muted hover:text-ink active:scale-[0.98]',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
