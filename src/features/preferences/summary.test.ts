import { describe, expect, it } from 'vitest'
import { describePersonalisation } from './summary'

describe('describePersonalisation', () => {
  it('is empty when nothing is saved, which is the callers’ fallback signal', () => {
    expect(describePersonalisation([], [])).toBe('')
  })

  it('pluralises categories irregularly', () => {
    expect(describePersonalisation(['science'], [])).toBe('1 category')
    expect(describePersonalisation(['science', 'health'], [])).toBe('2 categories')
  })

  it('names authors alongside categories', () => {
    expect(describePersonalisation(['science'], ['Fiona Harvey'])).toBe('1 category, 1 author')
    expect(describePersonalisation([], ['A', 'B'])).toBe('2 authors')
  })

  it('omits the group that is empty rather than leaving a dangling comma', () => {
    expect(describePersonalisation(['science', 'health'], [])).not.toContain(',')
  })
})
