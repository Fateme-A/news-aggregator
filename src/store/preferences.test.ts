import { ALL_SOURCE_IDS } from '@/sources/registry'
import { beforeEach, describe, expect, it } from 'vitest'
import { sanitizePreferences, usePreferences } from './preferences'

const STORAGE_KEY = 'newsstand.preferences.v1'

function writeStored(state: unknown) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: 0 }))
}

beforeEach(() => {
  localStorage.clear()
  usePreferences.getState().reset()
})

describe('sanitizePreferences', () => {
  it('keeps a well-formed saved state intact', () => {
    expect(
      sanitizePreferences({
        sources: ['guardian', 'newsapi'],
        categories: ['science'],
        authors: ['Fiona Harvey'],
        mode: 'my-feed',
        browseMode: 'infinite',
      }),
    ).toEqual({
      sources: ['guardian', 'newsapi'],
      categories: ['science'],
      authors: ['Fiona Harvey'],
      mode: 'my-feed',
      browseMode: 'infinite',
    })
  })

  it('drops source ids the registry does not know', () => {
    // The failure this guards against is not cosmetic: getSource() throws on an
    // unknown id, which would take the page down before the first render.
    expect(sanitizePreferences({ sources: ['guardian', 'bbc', 'newscred'] }).sources).toEqual([
      'guardian',
    ])
  })

  it('drops categories outside the canonical vocabulary', () => {
    expect(sanitizePreferences({ categories: ['science', 'politics'] }).categories).toEqual([
      'science',
    ])
  })

  it('discards one bad field without discarding the rest of the saved state', () => {
    expect(
      sanitizePreferences({ sources: ['guardian', 42], categories: ['health'], mode: 'my-feed' }),
    ).toEqual({ sources: ['guardian'], categories: ['health'], mode: 'my-feed' })
  })

  it('rejects modes it cannot render', () => {
    expect(sanitizePreferences({ mode: 'firehose', browseMode: 'carousel' })).toEqual({})
  })

  it('trims authors and removes blanks and case-insensitive duplicates', () => {
    expect(
      sanitizePreferences({ authors: ['  Fiona Harvey ', 'fiona harvey', '', '   ', 7] }).authors,
    ).toEqual(['Fiona Harvey'])
  })

  it('ignores a stored value that is not an object', () => {
    expect(sanitizePreferences(null)).toEqual({})
    expect(sanitizePreferences('corrupt')).toEqual({})
    expect(sanitizePreferences(['guardian'])).toEqual({})
  })

  it('omits absent fields so the defaults survive', () => {
    expect(sanitizePreferences({ mode: 'my-feed' })).toEqual({ mode: 'my-feed' })
  })
})

describe('rehydration', () => {
  it('falls back to the defaults for every field a corrupt payload mangles', async () => {
    writeStored({ sources: 'all', categories: null, mode: 'my-feed' })
    await usePreferences.persist.rehydrate()

    const state = usePreferences.getState()
    expect(state.sources).toEqual([...ALL_SOURCE_IDS])
    expect(state.categories).toEqual([])
    expect(state.mode).toBe('my-feed')
  })

  it('leaves no unknown source for the feed to resolve', async () => {
    writeStored({ sources: ['guardian', 'bbc'] })
    await usePreferences.persist.rehydrate()

    expect(usePreferences.getState().sources).toEqual(['guardian'])
  })
})

describe('hasPreferences', () => {
  it('is false for an untouched install', () => {
    expect(usePreferences.getState().hasPreferences()).toBe(false)
  })

  it('becomes true on any saved choice', () => {
    usePreferences.getState().toggleCategory('science')
    expect(usePreferences.getState().hasPreferences()).toBe(true)

    usePreferences.getState().reset()
    usePreferences.getState().addAuthor('Fiona Harvey')
    expect(usePreferences.getState().hasPreferences()).toBe(true)

    usePreferences.getState().reset()
    usePreferences.getState().toggleSource('guardian')
    expect(usePreferences.getState().hasPreferences()).toBe(true)
  })
})
