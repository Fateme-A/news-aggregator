import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { pluralize } from '@/lib/text'
import type { FeedMode } from '@/store/preferences'

const FEED_MODES = [
  { value: 'explore', label: 'Explore' },
  { value: 'my-feed', label: 'My Feed' },
] as const satisfies readonly { value: FeedMode; label: string }[]

interface FeedToolbarProps {
  mode: FeedMode
  onModeChange: (mode: FeedMode) => void
  articleCount: number
  keyword: string
}

/** Feed mode and the result count — a bottom bar on a phone, inline from `lg`. */
export function FeedToolbar({ mode, onModeChange, articleCount, keyword }: FeedToolbarProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4 lg:mb-5">
      <nav
        aria-label="Feed mode"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-canvas/95 px-4 pt-2.5 backdrop-blur-xl pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:inset-auto lg:z-auto lg:mr-auto lg:w-auto lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
      >
        <SegmentedControl
          aria-label="Feed mode"
          segments={FEED_MODES}
          value={mode}
          onChange={onModeChange}
          className="w-full lg:w-auto"
        />
      </nav>

      {articleCount > 0 && (
        <p className="ml-auto text-[13px] text-muted" role="status">
          {pluralize(articleCount, 'article')}
          {keyword && (
            <>
              {' for '}
              <span className="font-medium text-ink">“{keyword}”</span>
            </>
          )}
        </p>
      )}
    </div>
  )
}
