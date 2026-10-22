import { cn } from '@/lib/cn'
import { useDataMode, type DataPreference, type SourceDelivery } from '@/store/data-mode'
import { describeDataMode } from './describe'

const OPTIONS = [
  { value: 'live', label: 'Live', title: 'Always request the news APIs' },
  { value: 'demo', label: 'Demo', title: 'Always show recorded sample articles' },
] as const satisfies readonly { value: 'live' | 'demo'; label: string; title: string }[]

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
  const selected = preference === 'demo' ? 'demo' : 'live'

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
          'inline-flex h-8 items-center gap-0.5 rounded-full bg-surface-muted p-0.5 ring-1 ring-inset',
          usingSample ? 'ring-warning-ink/30' : 'ring-border',
        )}
      >
        {OPTIONS.map((option) => {
          const active = option.value === selected
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
                active &&
                  option.value === 'demo' &&
                  'bg-warning-soft text-warning-ink shadow-subtle',
                active && option.value === 'live' && 'bg-ink text-canvas shadow-subtle',
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
