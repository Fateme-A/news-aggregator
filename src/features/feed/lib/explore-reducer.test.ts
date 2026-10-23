import { ALL_SOURCE_IDS } from '@/sources/registry'
import { describe, expect, it } from 'vitest'
import {
  countActiveFilters,
  exploreReducer,
  INITIAL_EXPLORE,
  type ExploreAction,
  type ExploreState,
} from './explore-reducer'

const onPage = (page: number, overrides: Partial<ExploreState> = {}): ExploreState => ({
  ...INITIAL_EXPLORE,
  page,
  ...overrides,
})

const apply = (state: ExploreState, ...actions: ExploreAction[]) =>
  actions.reduce(exploreReducer, state)

describe('exploreReducer', () => {
  describe('paging', () => {
    // The rule each separate setter used to have to remember on its own.
    const narrowing: ExploreAction[] = [
      { type: 'keyword', value: 'climate' },
      { type: 'dateFrom', value: '2026-01-01' },
      { type: 'dateTo', value: '2026-02-01' },
      { type: 'toggleSource', id: 'guardian' },
      { type: 'toggleCategory', category: 'science' },
      { type: 'clearCategories' },
      { type: 'clearDates' },
      { type: 'clearFilters' },
    ]

    it.each(narrowing)('returns to page 1 on $type', (action) => {
      expect(apply(onPage(7), action).page).toBe(1)
    })

    it('advances and jumps without touching the filters', () => {
      expect(apply(onPage(3), { type: 'nextPage' }).page).toBe(4)
      expect(apply(onPage(3), { type: 'goToPage', page: 9 })).toEqual(onPage(9))
    })

    it('refuses a page below the first', () => {
      expect(apply(onPage(1), { type: 'goToPage', page: 0 }).page).toBe(1)
      expect(apply(onPage(1), { type: 'goToPage', page: -5 }).page).toBe(1)
    })
  })

  describe('filters', () => {
    it('toggles a category on and off again', () => {
      const selected = apply(INITIAL_EXPLORE, { type: 'toggleCategory', category: 'science' })
      expect(selected.categories).toEqual(['science'])

      const cleared = apply(selected, { type: 'toggleCategory', category: 'science' })
      expect(cleared.categories).toEqual([])
    })

    it('toggles a source out of the default selection', () => {
      const state = apply(INITIAL_EXPLORE, { type: 'toggleSource', id: 'guardian' })
      expect(state.sources).not.toContain('guardian')
      expect(state.sources).toHaveLength(ALL_SOURCE_IDS.length - 1)
    })

    it('clears both ends of the date range together', () => {
      const ranged = apply(
        INITIAL_EXPLORE,
        { type: 'dateFrom', value: '2026-01-01' },
        { type: 'dateTo', value: '2026-02-01' },
      )
      const cleared = apply(ranged, { type: 'clearDates' })

      expect([cleared.dateFrom, cleared.dateTo]).toEqual(['', ''])
    })

    it('leaves the keyword alone when the filters are cleared', () => {
      const state = apply(
        INITIAL_EXPLORE,
        { type: 'keyword', value: 'climate' },
        { type: 'toggleCategory', category: 'science' },
        { type: 'dateFrom', value: '2026-01-01' },
        { type: 'clearFilters' },
      )

      expect(state.keyword).toBe('climate')
      expect(state.categories).toEqual([])
      expect(state.dateFrom).toBe('')
      expect(state.sources).toEqual([...ALL_SOURCE_IDS])
    })

    it('clears the keyword too on a full reset', () => {
      const state = apply(
        INITIAL_EXPLORE,
        { type: 'keyword', value: 'climate' },
        { type: 'toggleCategory', category: 'science' },
        { type: 'reset' },
      )

      expect(state).toEqual(INITIAL_EXPLORE)
    })

    it('never mutates the state it was given', () => {
      const before = { ...INITIAL_EXPLORE, categories: [] }
      apply(before, { type: 'toggleCategory', category: 'science' })

      expect(before.categories).toEqual([])
    })
  })
})

describe('countActiveFilters', () => {
  it('counts nothing for an untouched Explore', () => {
    expect(countActiveFilters(INITIAL_EXPLORE)).toBe(0)
  })

  it('counts a date range once, however many ends are set', () => {
    expect(countActiveFilters({ ...INITIAL_EXPLORE, dateFrom: '2026-01-01' })).toBe(1)
    expect(
      countActiveFilters({ ...INITIAL_EXPLORE, dateFrom: '2026-01-01', dateTo: '2026-02-01' }),
    ).toBe(1)
  })

  it('counts a narrowed source selection once, and each category separately', () => {
    expect(countActiveFilters({ ...INITIAL_EXPLORE, sources: ['guardian'] })).toBe(1)
    expect(countActiveFilters({ ...INITIAL_EXPLORE, categories: ['science', 'health'] })).toBe(2)
  })

  it('ignores the keyword, which has its own control', () => {
    expect(countActiveFilters({ ...INITIAL_EXPLORE, keyword: 'climate' })).toBe(0)
  })
})
