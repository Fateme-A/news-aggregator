import type { SourceFailure } from '@/features/feed/hooks/useArticles'
import { IconAlertTriangle } from '@tabler/icons-react'

/** Some providers failed, but the feed still has articles from the rest. */
export function SourceFailureNotice({ failures }: { failures: SourceFailure[] }) {
  if (failures.length === 0) return null

  return (
    <div
      role="status"
      className="mb-5 flex gap-3 rounded-card bg-warning-soft px-4 py-3.5 ring-1 ring-warning-ink/15 ring-inset"
    >
      <IconAlertTriangle size={18} stroke={1.75} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-warning-ink">
          {failures.length === 1
            ? 'One source is unavailable'
            : `${failures.length} sources are unavailable`}
        </p>
        <ul className="mt-1 space-y-0.5">
          {failures.map((failure) => (
            <li key={failure.sourceId} className="text-[13px] leading-relaxed text-warning-ink/80">
              {failure.message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
