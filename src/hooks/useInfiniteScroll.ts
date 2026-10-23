import { useEffect, useRef, type RefObject } from 'react'

interface InfiniteScrollOptions {
  enabled: boolean
  onLoadMore: () => void
  rootMargin?: string
}

/** `IntersectionObserver` is feature-detected because jsdom does not implement it. */
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
