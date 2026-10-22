import { Button } from '@/components/ui/Button'
import type { SourceFailure } from '@/features/feed/hooks/useArticles'
import { cn } from '@/lib/cn'
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconList,
  IconSearch,
  IconStar,
} from '@tabler/icons-react'
import type { ReactNode } from 'react'

export function FeedSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3"
      aria-busy="true"
      aria-label="Loading articles"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-card bg-surface ring-1 ring-border ring-inset"
        >
          <div className="aspect-[16/9] animate-pulse bg-surface-muted" />
          <div className="flex-1 space-y-3 p-5">
            <div className="h-5 w-28 animate-pulse rounded-full bg-surface-muted" />
            <div className="h-4 w-full animate-pulse rounded-full bg-surface-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded-full bg-surface-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-surface-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

function Placeholder({
  icon,
  title,
  children,
  action,
  tone = 'neutral',
}: {
  icon: ReactNode
  title: string
  children: ReactNode
  action?: ReactNode
  tone?: 'neutral' | 'danger'
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-card px-6 py-14 text-center sm:py-20',
        tone === 'danger'
          ? 'bg-danger-soft ring-1 ring-danger/15 ring-inset'
          : 'bg-surface ring-1 ring-border ring-inset',
      )}
    >
      <div
        className={cn(
          'mb-4 grid size-12 place-items-center rounded-full',
          tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-surface-muted text-subtle',
        )}
        aria-hidden="true"
      >
        {icon}
      </div>
      <p
        className={cn(
          'font-serif text-xl font-medium sm:text-2xl',
          tone === 'danger' ? 'text-danger' : 'text-ink',
        )}
      >
        {title}
      </p>
      <div className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{children}</div>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function EmptyState({ onReset }: { onReset?: () => void }) {
  return (
    <Placeholder
      icon={<IconSearch size={22} stroke={1.75} />}
      title="No articles matched"
      action={
        onReset && (
          <button
            onClick={onReset}
            className="text-sm font-medium text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:text-accent-hover"
          >
            Clear all filters
          </button>
        )
      }
    >
      Try a different keyword, widen the date range, or remove a filter.
    </Placeholder>
  )
}

/**
 * My Feed with nothing saved. A personalised feed would be the unfiltered feed,
 * so it asks for choices instead — and makes no request until it has some.
 */
export function PersonaliseState({ onPersonalise }: { onPersonalise: () => void }) {
  return (
    <Placeholder
      icon={<IconStar size={22} stroke={1.75} />}
      title="Nothing saved yet"
      action={
        <Button variant="primary" onClick={onPersonalise}>
          Personalise
        </Button>
      }
    >
      Choose the sources, categories and authors you want to follow, and My Feed will show only
      their articles.
    </Placeholder>
  )
}

export function NoSourcesState() {
  return (
    <Placeholder icon={<IconList size={22} stroke={1.75} />} title="No sources selected">
      Choose at least one source to start building your feed.
    </Placeholder>
  )
}

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

export function AllFailedState({ failures }: { failures: SourceFailure[] }) {
  return (
    <Placeholder
      tone="danger"
      icon={<IconAlertCircle size={22} stroke={1.75} />}
      title="Could not load any articles"
    >
      <ul className="space-y-1">
        {failures.map((failure) => (
          <li key={failure.sourceId}>{failure.message}</li>
        ))}
      </ul>
    </Placeholder>
  )
}
