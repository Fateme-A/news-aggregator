import type { SourceId } from '@/domain/article'
import type { DataMode, Delivery, DemoReason } from '@/domain/delivery'
import { create } from 'zustand'

export type DataPreference = DataMode

export interface SourceDelivery extends Delivery {
  sourceId: SourceId
  label: string
}

export type SourceAvailability = Record<SourceId, boolean> | 'pending' | 'unknown'

const STORAGE_KEY = 'newsstand.data-mode.v1'

function loadPreference(): DataPreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'auto' || raw === 'live' || raw === 'demo') return raw
  } catch {
    return 'auto'
  }
  return 'auto'
}

interface DataModeState {
  preference: DataPreference
  availability: SourceAvailability
  /**
   * Providers that answered 429 or 401 in Auto. Further requests go straight
   * to the sample rather than spend more of a daily budget. Cleared whenever
   * the reader changes mode, which is their cue to try again.
   */
  suppressed: Partial<Record<SourceId, DemoReason>>
  setPreference: (preference: DataPreference) => void
  setAvailability: (availability: SourceAvailability) => void
  suppress: (sourceId: SourceId, reason: DemoReason) => void
}

export const useDataMode = create<DataModeState>()((set) => ({
  preference: loadPreference(),
  availability: 'pending',
  suppressed: {},

  setPreference: (preference) => {
    try {
      localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      /* private mode */
    }
    set({ preference, suppressed: {} })
  },

  setAvailability: (availability) => set({ availability }),

  suppress: (sourceId, reason) =>
    set((state) => ({ suppressed: { ...state.suppressed, [sourceId]: reason } })),
}))

export function parseAvailability(value: unknown): Record<SourceId, boolean> | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const ids = ['guardian', 'nytimes', 'newsapi'] as const
  if (!ids.every((id) => typeof record[id] === 'boolean')) return null
  return {
    guardian: record.guardian as boolean,
    nytimes: record.nytimes as boolean,
    newsapi: record.newsapi as boolean,
  }
}
