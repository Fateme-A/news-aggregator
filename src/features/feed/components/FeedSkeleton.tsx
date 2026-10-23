export function FeedSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3"
      aria-busy="true"
      aria-label="Loading articles"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-card bg-surface ring-1 ring-border ring-inset"
        >
          <div className="aspect-[16/9] animate-pulse bg-surface-muted" />
          <div className="flex-1 space-y-3 p-5">
            <div className="h-5 w-28 animate-pulse rounded-full bg-surface-muted" />
            <div className="h-4 w-full animate-pulse rounded-full bg-surface-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded-full bg-surface-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-surface-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
