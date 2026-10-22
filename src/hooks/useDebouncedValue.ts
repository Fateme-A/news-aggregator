import { useEffect, useState } from 'react'

/**
 * Delays propagating a rapidly-changing value.
 *
 * This is a rate-limit defence as much as a UX nicety: the NYT permits only five
 * requests per minute, so issuing one per keystroke would return 429s within a
 * couple of words.
 */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
