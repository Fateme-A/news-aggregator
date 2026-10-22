interface FeedNoticesProps {
  /** Filters re-applied in the browser, and coverage the browser cannot recover. */
  notices: string[]
}

export function FeedNotices({ notices }: FeedNoticesProps) {
  if (notices.length === 0) return null

  return (
    <div className="mb-4 space-y-1 text-xs leading-relaxed text-subtle">
      {notices.map((notice) => (
        <p key={notice}>{notice}</p>
      ))}
    </div>
  )
}
