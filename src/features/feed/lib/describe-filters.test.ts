import { describe, expect, it } from 'vitest'
import { describeClientFilters } from './describe-filters'

describe('describeClientFilters', () => {
  it('says nothing when every filter was applied upstream', () => {
    expect(describeClientFilters([])).toBeNull()
  })

  it('names the single provider and the single filter', () => {
    expect(describeClientFilters([{ label: 'NewsAPI', filters: ['author'] }])).toBe(
      'NewsAPI cannot filter by author upstream, so its results are narrowed in the browser.',
    )
  })

  it('lists several filters for one provider', () => {
    expect(
      describeClientFilters([{ label: 'The New York Times', filters: ['category', 'author'] }]),
    ).toBe(
      'The New York Times cannot filter by category and author upstream, so its results are narrowed in the browser.',
    )
  })

  it('collapses providers that share a limitation into one sentence', () => {
    expect(
      describeClientFilters([
        { label: 'The New York Times', filters: ['author'] },
        { label: 'NewsAPI', filters: ['author'] },
      ]),
    ).toBe(
      'The New York Times and NewsAPI cannot filter by author upstream, so their results are narrowed in the browser.',
    )
  })

  it('keeps providers with different limitations in separate sentences', () => {
    const text = describeClientFilters([
      { label: 'The New York Times', filters: ['category'] },
      { label: 'NewsAPI', filters: ['date'] },
    ])
    expect(text).toContain('The New York Times cannot filter by category')
    expect(text).toContain('NewsAPI cannot filter by date')
  })
})
