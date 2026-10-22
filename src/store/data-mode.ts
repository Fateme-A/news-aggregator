import type { SourceId } from '@/domain/article'
import { create } from 'zustand'

export type DataPreference = 'auto' | 'live' | 'demo'

export type DemoReason = 'chosen' | 'missing-key' | 'rate-limited' | 'auth'

export interface Delivery {
  origin: 'live' | 'demo'
  reason?: DemoReason
}

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
  setPreference: (preference: DataPreference) => void
  setAvailability: (availability: SourceAvailability) => void
}

export const useDataMode = create<DataModeState>()((set) => ({
  preference: loadPreference(),
  availability: 'pending',

  setPreference: (preference) => {
    try {
      localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      /* private mode */
    }
    set({ preference })
  },

  setAvailability: (availability) => set({ availability }),
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
