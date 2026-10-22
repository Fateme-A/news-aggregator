import { parseAvailability, useDataMode } from '@/store/data-mode'
import { useEffect } from 'react'

export function useSourceAvailability(): void {
  const preference = useDataMode((state) => state.preference)

  useEffect(() => {
    if (preference !== 'auto') return

    const controller = new AbortController()
    useDataMode.getState().setAvailability('pending')

    const timeout = AbortSignal.timeout(4_000)
    const signal = AbortSignal.any([controller.signal, timeout])

    fetch('/api/status', { signal, headers: { Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`status ${response.status}`)
        return parseAvailability(await response.json())
      })
      .then((availability) => {
        useDataMode.getState().setAvailability(availability ?? 'unknown')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.warn('[data-mode] could not read /api/status', error)
        useDataMode.getState().setAvailability('unknown')
      })

    return () => controller.abort()
  }, [preference])
}
