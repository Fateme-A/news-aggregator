import { IconStar } from '@tabler/icons-react'

/** Below `lg` the sidebar is hidden, so My Feed says what it is narrowed by here. */
export function PersonalisedBanner({ summary }: { summary: string }) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-card bg-accent-soft px-4 py-3.5 ring-1 ring-accent/15 ring-inset lg:hidden">
      <IconStar size={18} stroke={1.75} className="mt-0.5 shrink-0 text-accent" aria-hidden />
      <p className="text-sm leading-relaxed text-accent-ink">
        Showing your personalised feed
        {summary && <span className="text-accent-ink/75"> — {summary}</span>}
      </p>
    </div>
  )
}
