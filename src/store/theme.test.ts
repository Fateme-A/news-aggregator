import { beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_CHOICES, nextChoice, useTheme } from './theme'

beforeEach(() => {
  localStorage.clear()
  useTheme.getState().setChoice('system')
})

describe('theme', () => {
  it('cycles through every choice and returns to the start', () => {
    const { cycleChoice } = useTheme.getState()
    const visited = THEME_CHOICES.map(() => {
      cycleChoice()
      return useTheme.getState().choice
    })

    // Every choice is reachable, and one full lap returns to the start.
    expect(visited).toEqual(['light', 'dark', 'system'])
    expect(new Set(visited)).toEqual(new Set(THEME_CHOICES))
  })

  it('names the next choice so the control can label itself', () => {
    expect(nextChoice('light')).toBe('dark')
    expect(nextChoice('dark')).toBe('system')
    expect(nextChoice('system')).toBe('light')
  })

  it('resolves an explicit choice to that theme and paints it', () => {
    useTheme.getState().setChoice('dark')
    expect(useTheme.getState().theme).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')

    useTheme.getState().setChoice('light')
    expect(useTheme.getState().theme).toBe('light')
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('persists the choice rather than the resolved theme', () => {
    useTheme.getState().setChoice('system')
    // Storing "dark" here would be indistinguishable from an explicit choice on
    // the next load, which is how following the OS gets silently lost.
    expect(localStorage.getItem('newsstand.theme')).toBe('system')
  })

  it('keeps working when storage is blocked', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })

    expect(() => useTheme.getState().setChoice('dark')).not.toThrow()
    expect(document.documentElement).toHaveClass('dark')

    setItem.mockRestore()
  })
})
