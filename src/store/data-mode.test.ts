import { beforeEach, describe, expect, it } from 'vitest'
import { useDataMode } from './data-mode'

beforeEach(() => {
  localStorage.clear()
  useDataMode.setState({ preference: 'auto', availability: 'pending', suppressed: {} })
})

describe('data mode', () => {
  it('records a provider that is refusing, so Auto stops spending quota on it', () => {
    useDataMode.getState().suppress('newsapi', 'rate-limited')

    expect(useDataMode.getState().suppressed).toEqual({ newsapi: 'rate-limited' })
  })

  it('keeps suppressions for other providers independent', () => {
    useDataMode.getState().suppress('newsapi', 'rate-limited')
    useDataMode.getState().suppress('nytimes', 'auth')

    expect(useDataMode.getState().suppressed).toEqual({
      newsapi: 'rate-limited',
      nytimes: 'auth',
    })
  })

  it('clears every suppression when the reader changes mode', () => {
    // Changing mode is the reader asking for a fresh attempt; without this the
    // breaker would pin a provider to samples for the rest of the session.
    useDataMode.getState().suppress('newsapi', 'rate-limited')
    useDataMode.getState().setPreference('live')

    expect(useDataMode.getState().suppressed).toEqual({})
    expect(useDataMode.getState().preference).toBe('live')
  })

  it('persists the chosen mode', () => {
    useDataMode.getState().setPreference('demo')

    expect(localStorage.getItem('newsstand.data-mode.v1')).toBe('demo')
  })
})
