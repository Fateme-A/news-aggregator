import { IconSearch, IconX } from '@tabler/icons-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor="article-search" className="sr-only">
        Search articles by keyword
      </label>

      <IconSearch
        size={18}
        stroke={1.75}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-subtle"
      />

      <input
        id="article-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search articles…"
        autoComplete="off"
        className="h-11 w-full rounded-full bg-surface pr-11 pl-11 text-base text-ink ring-1 ring-border ring-inset transition-shadow placeholder:text-subtle focus:ring-accent/40 focus:shadow-focus focus:outline-none sm:text-sm"
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-full text-subtle transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <IconX size={14} stroke={2.25} aria-hidden />
        </button>
      )}
    </div>
  )
}
