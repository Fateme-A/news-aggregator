import { useEffect, useState } from 'react'

/**
 * Delays propagating a rapidly-changing value. A rate-limit defence as much as
 * a UX one: the NYT allows five requests a minute, so one per keystroke would
 * return 429s within a couple of words.
 */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
