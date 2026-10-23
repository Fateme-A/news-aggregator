import { create } from 'zustand'

/**
 * `system` is a choice, not the absence of one — without it the first toggle
 * permanently opts out of following the OS.
 */
export const THEME_CHOICES = ['light', 'dark', 'system'] as const
export type ThemeChoice = (typeof THEME_CHOICES)[number]

/** What is actually painted. `system` resolves to one of these. */
export type Theme = 'light' | 'dark'

const THEME_LABELS: Record<ThemeChoice, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

const STORAGE_KEY = 'newsstand.theme'

function darkMediaQuery(): MediaQueryList | undefined {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
  return window.matchMedia('(prefers-color-scheme: dark)')
}

function systemTheme(): Theme {
  return darkMediaQuery()?.matches ? 'dark' : 'light'
}

/**
 * Also read by the inline script in `index.html`, which prevents a flash of the
 * wrong theme. Anything unrecognised follows the OS, matching that script.
 */
export function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // Storage can be blocked; fall through to the system preference.
  }
  return 'system'
}

export function resolveTheme(choice: ThemeChoice): Theme {
  return choice === 'system' ? systemTheme() : choice
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

interface ThemeState {
  choice: ThemeChoice
  theme: Theme
  setChoice: (choice: ThemeChoice) => void
  cycleChoice: () => void
}

export function nextChoice(choice: ThemeChoice): ThemeChoice {
  return THEME_CHOICES[(THEME_CHOICES.indexOf(choice) + 1) % THEME_CHOICES.length]!
}

export function themeControlLabel(choice: ThemeChoice): string {
  return `Theme: ${THEME_LABELS[choice]}. Switch to ${THEME_LABELS[nextChoice(choice)].toLowerCase()}.`
}

const initialChoice = readChoice()

export const useTheme = create<ThemeState>((set, get) => ({
  choice: initialChoice,
  theme: resolveTheme(initialChoice),

  setChoice: (choice) => {
    const theme = resolveTheme(choice)
    applyTheme(theme)
    try {
      localStorage.setItem(STORAGE_KEY, choice)
    } catch {
      // The class on <html> still switches for this visit.
    }
    set({ choice, theme })
  },

  cycleChoice: () => {
    get().setChoice(nextChoice(get().choice))
  },
}))

applyTheme(useTheme.getState().theme)

// While `system` is selected, an OS change has to reach the page without a reload.
const media = darkMediaQuery()
media?.addEventListener?.('change', () => {
  if (useTheme.getState().choice !== 'system') return
  const theme = systemTheme()
  applyTheme(theme)
  useTheme.setState({ theme })
})
