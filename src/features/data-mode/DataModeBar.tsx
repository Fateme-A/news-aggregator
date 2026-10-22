import { cn } from '@/lib/cn'
import { useDataMode, type DataPreference, type SourceDelivery } from '@/store/data-mode'
import { describeDataMode } from './describe'

const OPTIONS = [
  {
    value: 'auto',
    label: 'Auto',
    title: 'Live data when the API can answer, sample articles otherwise',
  },
  { value: 'live', label: 'Live', title: 'Always request the news APIs' },
  { value: 'demo', label: 'Demo', title: 'Always show recorded sample articles' },
] as const satisfies readonly { value: DataPreference; label: string; title: string }[]

export function DataModeBar({
  deliveries,
  pending,
  onChange,
}: {
  deliveries: readonly SourceDelivery[]
  pending: boolean
  onChange: (preference: DataPreference) => void
}) {
  const preference = useDataMode((state) => state.preference)
  const message = describeDataMode(preference, deliveries, pending)
  const usingSample =
    preference === 'demo' || deliveries.some((delivery) => delivery.origin === 'demo')

  return (
    <div className="border-t border-border/70">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <p
          role="status"
          className={cn(
            'min-w-0 text-xs leading-relaxed',
            usingSample ? 'text-warning-ink' : 'text-muted',
          )}
        >
          {message}
        </p>

        <div
          role="group"
          aria-label="Article data"
          className="inline-flex h-10 shrink-0 items-center gap-0.5 rounded-full bg-surface-muted p-1 ring-1 ring-border ring-inset lg:h-9"
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
                  'h-8 rounded-full px-3 text-xs font-medium whitespace-nowrap lg:h-7',
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
      </div>
    </div>
  )
}
