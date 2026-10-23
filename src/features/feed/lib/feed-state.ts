/**
 * Which of the feed's mutually exclusive states applies.
 *
 * As a nested ternary in the component this was six branches whose order was
 * load-bearing and untestable — "all sources failed" has to be checked before
 * "no articles", or a total outage reads as an empty search.
 */
export type FeedState =
  'personalise' | 'no-sources' | 'loading' | 'all-failed' | 'empty' | 'articles'

export interface FeedStateInput {
  /** My Feed with nothing saved: ask for choices instead of fetching. */
  needsPersonalising: boolean
  hasSources: boolean
  isLoading: boolean
  allFailed: boolean
  articleCount: number
}

export function resolveFeedState({
  needsPersonalising,
  hasSources,
  isLoading,
  allFailed,
  articleCount,
}: FeedStateInput): FeedState {
  if (needsPersonalising) return 'personalise'
  if (!hasSources) return 'no-sources'
  // Only an empty screen waits: a reloading feed keeps its articles on show.
  if (articleCount === 0 && isLoading) return 'loading'
  if (articleCount === 0 && allFailed) return 'all-failed'
  if (articleCount === 0) return 'empty'
  return 'articles'
}

export type FeedFooterState = 'loading' | 'page-cap' | 'more' | 'end'

export interface FeedFooterInput {
  isFetching: boolean
  atPageCap: boolean
  hasMore: boolean
}

export function resolveFeedFooter({
  isFetching,
  atPageCap,
  hasMore,
}: FeedFooterInput): FeedFooterState {
  if (isFetching) return 'loading'
  if (atPageCap) return 'page-cap'
  return hasMore ? 'more' : 'end'
}

/** The page cap is a stop, not an end: more articles exist, we just stop asking. */
export function canLoadMore({ atPageCap, hasMore }: Omit<FeedFooterInput, 'isFetching'>): boolean {
  return hasMore && !atPageCap
}
