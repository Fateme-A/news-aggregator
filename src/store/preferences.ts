import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Category, SourceId } from '@/domain/article'
import { ALL_SOURCE_IDS } from '@/sources/registry'

/**
 * The "personalised news feed" requirement.
 *
 * Preferences persist to localStorage so a returning visitor sees their own feed
 * immediately. They are deliberately kept separate from the transient search
 * state (keyword, date range, page) which lives in component state and resets on
 * reload — only the durable choices belong here.
 */

export type FeedMode = 'explore' | 'my-feed'

export interface PreferencesState {
  /** Providers to query. Empty is treated as "none selected" and shows a prompt. */
  sources: SourceId[]
  categories: Category[]
  authors: string[]
  mode: FeedMode

  toggleSource: (id: SourceId) => void
  toggleCategory: (category: Category) => void
  addAuthor: (author: string) => void
  removeAuthor: (author: string) => void
  setMode: (mode: FeedMode) => void
  reset: () => void
  /** True once the user has expressed any preference at all. */
  hasPreferences: () => boolean
}

const INITIAL = {
  sources: [...ALL_SOURCE_IDS] as SourceId[],
  categories: [] as Category[],
  authors: [] as string[],
  mode: 'explore' as FeedMode,
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      toggleSource: (id) => set((state) => ({ sources: toggle(state.sources, id) })),
      toggleCategory: (category) =>
        set((state) => ({ categories: toggle(state.categories, category) })),

      addAuthor: (author) =>
        set((state) => {
          const name = author.trim()
          if (!name) return state
          const exists = state.authors.some((a) => a.toLowerCase() === name.toLowerCase())
          return exists ? state : { authors: [...state.authors, name] }
        }),

      removeAuthor: (author) =>
        set((state) => ({ authors: state.authors.filter((a) => a !== author) })),

      setMode: (mode) => set({ mode }),
      reset: () => set({ ...INITIAL }),

      hasPreferences: () => {
        const { categories, authors, sources } = get()
        return (
          categories.length > 0 || authors.length > 0 || sources.length !== ALL_SOURCE_IDS.length
        )
      },
    }),
    {
      name: 'newsstand.preferences.v1',
      // Actions are recreated on every load; only data is worth persisting.
      partialize: ({ sources, categories, authors, mode }) => ({
        sources,
        categories,
        authors,
        mode,
      }),
    },
  ),
)
