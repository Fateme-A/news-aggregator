import '@testing-library/jest-dom/vitest'
import { useDataMode } from '@/store/data-mode'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

/**
 * jsdom's own `localStorage` is unavailable under this Node version (it warns
 * about `--localstorage-file` and exposes a non-functional object). The
 * preferences store depends on it, so install a minimal in-memory implementation.
 */
class MemoryStorage implements Storage {
  #entries = new Map<string, string>()

  get length(): number {
    return this.#entries.size
  }

  key(index: number): string | null {
    return [...this.#entries.keys()][index] ?? null
  }

  getItem(key: string): string | null {
    return this.#entries.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.#entries.set(key, String(value))
  }

  removeItem(key: string): void {
    this.#entries.delete(key)
  }

  clear(): void {
    this.#entries.clear()
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  writable: true,
  configurable: true,
})

beforeEach(() => {
  // The product defaults to auto, which would swallow the 429s these tests
  // assert on. Live is the explicit "always call the API" path.
  useDataMode.getState().setPreference('live')
  useDataMode.getState().setAvailability('unknown')
  // setPreference also clears the rate-limit breaker, so no provider stays
  // suppressed from a previous test.
})

afterEach(() => {
  cleanup()
})
