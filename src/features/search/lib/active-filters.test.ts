import type { ExploreFilters } from './filters'
import { ALL_SOURCE_IDS } from '@/sources/registry'
import { describe, expect, it } from 'vitest'
import { describeActiveFilters } from './active-filters'

function values(overrides: Partial<ExploreFilters> = {}): ExploreFilters {
  return {
    sources: [...ALL_SOURCE_IDS],
    categories: [],
    dateFrom: '',
    dateTo: '',
    ...overrides,
  }
}

describe('describeActiveFilters', () => {
  it('reports nothing for an untouched Explore', () => {
    expect(describeActiveFilters(values())).toEqual([])
  })

  it('treats every source being selected as the default, not a filter', () => {
    expect(describeActiveFilters(values({ sources: [...ALL_SOURCE_IDS] }))).toEqual([])
  })

  it('lists the sources that remain once the selection is narrowed', () => {
    const filters = describeActiveFilters(values({ sources: ['guardian', 'newsapi'] }))

    expect(filters.map((filter) => filter.label)).toEqual(['The Guardian', 'NewsAPI'])
    expect(filters.every((filter) => filter.kind === 'source')).toBe(true)
  })

  it('names categories in the vocabulary the reader saw', () => {
    expect(describeActiveFilters(values({ categories: ['science', 'health'] }))).toEqual([
      { key: 'category:science', label: 'Science', kind: 'category', id: 'science' },
      { key: 'category:health', label: 'Health', kind: 'category', id: 'health' },
    ])
  })

  it('collapses a date range into one removable filter', () => {
    const [range] = describeActiveFilters(values({ dateFrom: '2026-01-01', dateTo: '2026-02-01' }))

    expect(range?.kind).toBe('dates')
    expect(range?.label).toMatch(/2026.*–.*2026/)
  })

  it('describes an open-ended range from whichever end was set', () => {
    expect(describeActiveFilters(values({ dateFrom: '2026-01-01' }))[0]?.label).toMatch(/^Since /)
    expect(describeActiveFilters(values({ dateTo: '2026-01-01' }))[0]?.label).toMatch(/^Until /)
  })

  it('shows a single day once rather than as a range of itself', () => {
    const [range] = describeActiveFilters(values({ dateFrom: '2026-01-01', dateTo: '2026-01-01' }))

    expect(range?.label).not.toContain('–')
  })

  it('gives every filter a key unique across kinds', () => {
    const filters = describeActiveFilters(
      values({ sources: ['guardian'], categories: ['science'], dateFrom: '2026-01-01' }),
    )

    expect(new Set(filters.map((filter) => filter.key)).size).toBe(filters.length)
  })
})
