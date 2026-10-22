import { Button } from '@/components/ui/Button'
import { IconAdjustmentsHorizontal } from '@tabler/icons-react'
import type { ReactNode } from 'react'

interface FeedSidebarProps {
  isMyFeed: boolean
  personalisationSummary: string
  needsPersonalising: boolean
  onPersonalise: () => void
  /** The Explore filter panel; unused in My Feed. */
  filters: ReactNode
}

export function FeedSidebar({
  isMyFeed,
  personalisationSummary,
  needsPersonalising,
  onPersonalise,
  filters,
}: FeedSidebarProps) {
  return (
    <aside className="hidden w-[17rem] shrink-0 lg:block">
      <div className="sticky top-24 rounded-card bg-surface p-5 ring-1 ring-border ring-inset">
        {isMyFeed ? (
          <div>
            <h2 className="font-serif text-xl font-medium tracking-tight text-ink">My Feed</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {personalisationSummary
                ? `Saved choices: ${personalisationSummary}.`
                : 'Saved sources, categories, and authors shape this feed.'}
            </p>
            {needsPersonalising && (
              <Button variant="primary" size="sm" onClick={onPersonalise} className="mt-4">
                <IconAdjustmentsHorizontal size={16} stroke={1.75} aria-hidden />
                Personalise
              </Button>
            )}
          </div>
        ) : (
          filters
        )}
      </div>
    </aside>
  )
}
