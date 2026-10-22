import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  children: ReactNode
  /** Optional trailing content in the heading row, e.g. a validation hint. */
  action?: ReactNode
  /** Drops the top padding for the first section in a divided stack. */
  first?: boolean
}

/** A labelled group inside a panel or dialog. */
export function Section({ title, children, action, first }: SectionProps) {
  return (
    <section className={first ? 'pb-5' : 'py-5'}>
      <h3 className="mb-3 flex items-center justify-between gap-2 text-[11px] font-semibold tracking-[0.14em] text-subtle uppercase">
        {title}
        {action}
      </h3>
      {children}
    </section>
  )
}
