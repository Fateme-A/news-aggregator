import { describe, expect, it } from 'vitest'
import { parseAvailability } from '@/store/data-mode'
import { describeDataMode } from './describe'

const guardian = {
  sourceId: 'guardian' as const,
  label: 'The Guardian',
  origin: 'demo' as const,
  reason: 'missing-key' as const,
}

const nyt = {
  sourceId: 'nytimes' as const,
  label: 'The New York Times',
  origin: 'live' as const,
}

describe('describeDataMode', () => {
  it('describes an explicit demo choice', () => {
    expect(describeDataMode('demo', [], false)).toMatch(/no requests are sent/i)
  })

  it('names the provider that fell back and the one that stayed live', () => {
    expect(describeDataMode('auto', [guardian, nyt], false)).toBe(
      'Sample articles for The Guardian (no API key is configured). The New York Times is live.',
    )
  })

  it('waits to claim a result while the key check is in flight', () => {
    expect(describeDataMode('auto', [], true)).toMatch(
      /sample articles when a provider is missing/i,
    )
  })
})

describe('parseAvailability', () => {
  it('accepts the status payload', () => {
    expect(parseAvailability({ guardian: true, nytimes: false, newsapi: true })).toEqual({
      guardian: true,
      nytimes: false,
      newsapi: true,
    })
  })

  it('rejects a payload that is missing a provider', () => {
    expect(parseAvailability({ guardian: true, nytimes: false })).toBeNull()
  })
})
