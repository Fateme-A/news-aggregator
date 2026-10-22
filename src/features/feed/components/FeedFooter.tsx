import { Button } from '@/components/ui/Button'
import { MAX_PAGES } from '@/features/feed/hooks/useArticles'
import type { RefObject } from 'react'
import type { FeedFooterState } from '../lib/feed-state'

interface PaginationProps {
  page: number
  hasMore: boolean
  isFetching: boolean
  onGoToPage: (page: number) => void
}

export function FeedPagination({ page, hasMore, isFetching, onGoToPage }: PaginationProps) {
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2 sm:mt-10">
      <Button disabled={page === 1 || isFetching} onClick={() => onGoToPage(Math.max(1, page - 1))}>
        Previous
      </Button>
      <span className="min-w-20 text-center text-[13px] text-muted" role="status">
        Page {page}
      </span>
      <Button disabled={!hasMore || isFetching} onClick={() => onGoToPage(page + 1)}>
        Next
      </Button>
    </nav>
  )
}

interface SentinelProps {
  state: FeedFooterState
  sentinelRef: RefObject<HTMLDivElement | null>
}

/** The end of an infinite feed, and the element whose visibility loads the next page. */
export function FeedSentinel({ state, sentinelRef }: SentinelProps) {
  return (
    <div ref={sentinelRef} className="mt-8 flex justify-center sm:mt-10">
      {state === 'loading' && (
        <p role="status" className="text-[13px] text-muted">
          Loading more articles
        </p>
      )}
      {state === 'page-cap' && (
        <p className="max-w-sm text-center text-[13px] text-subtle">
          Showing the first {MAX_PAGES} pages. Narrow the search to see more.
        </p>
      )}
      {state === 'more' && <span className="sr-only">More articles load as you reach the end</span>}
      {state === 'end' && <p className="text-[13px] text-subtle">End of the feed</p>}
    </div>
  )
}
