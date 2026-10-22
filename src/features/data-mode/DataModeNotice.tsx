import { useDataMode, type SourceDelivery } from '@/store/data-mode'
import { IconFlask } from '@tabler/icons-react'
import { describeDataMode } from './describe'

interface DataModeNoticeProps {
  deliveries: readonly SourceDelivery[]
  pending: boolean
}

/**
 * Sample articles are never presented as live. The controls live in Settings;
 * this stays on the page, naming each provider on its sample and why.
 */
export function DataModeNotice({ deliveries, pending }: DataModeNoticeProps) {
  const preference = useDataMode((state) => state.preference)
  const message = describeDataMode(preference, deliveries, pending)
  const usingSample =
    preference === 'demo' || deliveries.some((delivery) => delivery.origin === 'demo')

  if (!usingSample) {
    return (
      <p role="status" className="sr-only">
        {message}
      </p>
    )
  }

  return (
    <div
      role="status"
      className="mb-4 flex gap-3 rounded-card bg-warning-soft px-4 py-3 ring-1 ring-warning-ink/15 ring-inset"
    >
      <IconFlask size={18} stroke={1.75} className="mt-0.5 shrink-0 text-warning-ink" aria-hidden />
      <p className="text-[13px] leading-relaxed text-warning-ink/90">{message}</p>
    </div>
  )
}
