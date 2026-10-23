import { CATEGORIES, type Category, type SourceId } from '@/domain/article'
import { toggle } from '@/lib/toggle'
import { ALL_SOURCE_IDS } from '@/sources/registry'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Durable choices only. Transient search state — keyword, date range, page —
 * lives in component state and resets on reload.
 */

export const FEED_MODES = ['explore', 'my-feed'] as const
export type FeedMode = (typeof FEED_MODES)[number]

export const BROWSE_MODES = ['pages', 'infinite'] as const
export type BrowseMode = (typeof BROWSE_MODES)[number]

export interface StoredPreferences {
  /** Providers to query. Empty is treated as "none selected" and shows a prompt. */
  sources: SourceId[]
  categories: Category[]
  authors: string[]
  mode: FeedMode
  browseMode: BrowseMode
}

export interface PreferencesState extends StoredPreferences {
  toggleSource: (id: SourceId) => void
  toggleCategory: (category: Category) => void
  addAuthor: (author: string) => void
  removeAuthor: (author: string) => void
  setMode: (mode: FeedMode) => void
  setBrowseMode: (mode: BrowseMode) => void
  reset: () => void
  hasPreferences: () => boolean
}

const INITIAL: StoredPreferences = {
  sources: [...ALL_SOURCE_IDS],
  categories: [],
  authors: [],
  mode: 'explore',
  browseMode: 'infinite',
}

function isOneOf<T extends string>(allowed: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

function stringsIn<T extends string>(allowed: readonly T[], value: unknown): T[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is T => isOneOf(allowed, item)))]
}

/**
 * Narrows untrusted stored state to the vocabulary the app knows. `getSource`
 * throws on an unknown source id, which would blank the page before the first
 * render. Done field by field, so one bad entry is dropped rather than the
 * whole saved state.
 */
export function sanitizePreferences(value: unknown): Partial<StoredPreferences> {
  if (!value || typeof value !== 'object') return {}
  const raw = value as Record<string, unknown>
  const stored: Partial<StoredPreferences> = {}

  if (Array.isArray(raw.sources)) stored.sources = stringsIn(ALL_SOURCE_IDS, raw.sources)
  if (Array.isArray(raw.categories)) stored.categories = stringsIn(CATEGORIES, raw.categories)

  if (Array.isArray(raw.authors)) {
    const seen = new Set<string>()
    stored.authors = raw.authors
      .filter((name): name is string => typeof name === 'string')
      .map((name) => name.trim())
      .filter((name) => {
        if (!name) return false
        const key = name.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
  }

  if (isOneOf(FEED_MODES, raw.mode)) stored.mode = raw.mode
  if (isOneOf(BROWSE_MODES, raw.browseMode)) stored.browseMode = raw.browseMode

  return stored
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
      setBrowseMode: (browseMode) => set({ browseMode }),
      reset: () => set({ ...INITIAL }),

      hasPreferences: () => {
        const { categories, authors, sources } = get()
        // The default selection is every source. That is still a feed to show:
        // My Feed should not ask for choices while those sources are checked.
        return categories.length > 0 || authors.length > 0 || sources.length > 0
      },
    }),
    {
      name: 'newsstand.preferences.v1',
      // Actions are recreated on every load; only data is worth persisting.
      partialize: ({ sources, categories, authors, mode, browseMode }) => ({
        sources,
        categories,
        authors,
        mode,
        browseMode,
      }),
      merge: (persisted, current) => ({ ...current, ...sanitizePreferences(persisted) }),
    },
  ),
)
