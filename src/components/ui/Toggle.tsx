import type { AppIcon } from '@/components/icons'
import { cn } from '@/lib/cn'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  icon?: AppIcon
  hint?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, icon: Icon, hint, disabled }: ToggleProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-field px-3 py-2.5 transition-colors duration-200',
        checked
          ? 'bg-surface ring-1 ring-border-strong ring-inset'
          : 'bg-transparent ring-1 ring-border ring-inset hover:bg-surface-muted',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-[18px] shrink-0 cursor-pointer accent-[var(--color-accent)]"
      />
      <span className="min-w-0">
        <span
          className={cn(
            'flex items-center gap-1.5 text-sm leading-snug font-medium',
            checked ? 'text-ink' : 'text-subtle',
          )}
        >
          {Icon && <Icon size={16} stroke={1.75} className="shrink-0" aria-hidden />}
          <span className="min-w-0">{label}</span>
        </span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-subtle">{hint}</span>}
      </span>
    </label>
  )
}
