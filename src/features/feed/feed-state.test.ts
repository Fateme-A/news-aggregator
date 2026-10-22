import { describe, expect, it } from 'vitest'
import { canLoadMore, resolveFeedFooter, resolveFeedState, type FeedStateInput } from './feed-state'

function input(overrides: Partial<FeedStateInput> = {}): FeedStateInput {
  return {
    needsPersonalising: false,
    hasSources: true,
    isLoading: false,
    allFailed: false,
    articleCount: 12,
    ...overrides,
  }
}

describe('resolveFeedState', () => {
  it('shows the feed once articles have arrived', () => {
    expect(resolveFeedState(input())).toBe('articles')
  })

  it('asks for choices before anything else, so My Feed never fetches unpersonalised', () => {
    expect(resolveFeedState(input({ needsPersonalising: true, hasSources: false }))).toBe(
      'personalise',
    )
  })

  it('prompts for a source when the selection is empty', () => {
    expect(resolveFeedState(input({ hasSources: false, articleCount: 0 }))).toBe('no-sources')
  })

  it('skeletons only an empty screen', () => {
    expect(resolveFeedState(input({ isLoading: true, articleCount: 0 }))).toBe('loading')
  })

  it('keeps the current articles on screen while the next query loads', () => {
    // keepPreviousData means a refining search still has articles; tearing them
    // down for a skeleton on every keystroke is what this prevents.
    expect(resolveFeedState(input({ isLoading: true, articleCount: 12 }))).toBe('articles')
  })

  it('distinguishes a total outage from an empty search', () => {
    expect(resolveFeedState(input({ allFailed: true, articleCount: 0 }))).toBe('all-failed')
    expect(resolveFeedState(input({ allFailed: false, articleCount: 0 }))).toBe('empty')
  })

  it('does not report a total outage while some articles are still rendered', () => {
    // Every source failing on page 3 must not blank the two pages already read.
    expect(resolveFeedState(input({ allFailed: true, articleCount: 24 }))).toBe('articles')
  })
})

describe('resolveFeedFooter', () => {
  const footer = (overrides = {}) =>
    resolveFeedFooter({ isFetching: false, atPageCap: false, hasMore: true, ...overrides })

  it('reports the request in flight before anything else', () => {
    expect(footer({ isFetching: true, atPageCap: true, hasMore: false })).toBe('loading')
  })

  it('explains the cap rather than pretending the feed ended', () => {
    expect(footer({ atPageCap: true })).toBe('page-cap')
  })

  it('separates more-to-come from the real end', () => {
    expect(footer({ hasMore: true })).toBe('more')
    expect(footer({ hasMore: false })).toBe('end')
  })
})

describe('canLoadMore', () => {
  it('stops at the cap even though the provider has more', () => {
    expect(canLoadMore({ hasMore: true, atPageCap: true })).toBe(false)
    expect(canLoadMore({ hasMore: true, atPageCap: false })).toBe(true)
    expect(canLoadMore({ hasMore: false, atPageCap: false })).toBe(false)
  })
})
