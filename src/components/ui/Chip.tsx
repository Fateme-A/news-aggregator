import type { AppIcon } from '@/components/icons'
import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

interface ChipProps {
  children: ReactNode
  /**
   * Toggle state. Omit it for chips that perform an action rather than switch
   * something on and off — an `aria-pressed="false"` that never becomes true
   * tells a screen reader the control is a toggle when it is a button.
   */
  selected?: boolean
  onClick: () => void
  icon?: AppIcon
  className?: string
}

export function Chip({ children, selected, onClick, icon: Icon, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap lg:h-9 lg:px-3',
        'transition-all duration-200 active:scale-[0.97]',
        selected
          ? 'bg-ink text-canvas shadow-subtle'
          : 'bg-surface text-muted ring-1 ring-border ring-inset hover:text-ink hover:ring-border-strong',
        className,
      )}
    >
      {Icon && <Icon size={15} stroke={1.75} aria-hidden />}
      {children}
    </button>
  )
}
