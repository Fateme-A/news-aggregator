import { useEffect, useRef, type RefObject } from 'react'

interface InfiniteScrollOptions {
  /** False while paging, at the cap, or with a request already in flight. */
  enabled: boolean
  onLoadMore: () => void
  /** How far ahead of the sentinel to start the next page. */
  rootMargin?: string
}

/**
 * Asks for one more page when the returned ref scrolls into view.
 *
 * The caller decides whether that costs a request: pages already fetched come
 * back from the query cache. `IntersectionObserver` is feature-detected because
 * jsdom does not implement it.
 */
export function useInfiniteScroll({
  enabled,
  onLoadMore,
  rootMargin = '240px',
}: InfiniteScrollOptions): RefObject<HTMLDivElement | null> {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return
    const node = sentinelRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore()
      },
      { rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, onLoadMore, rootMargin])

  return sentinelRef
}
