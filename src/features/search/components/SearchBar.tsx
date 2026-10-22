import { IconSearch, IconX } from '@tabler/icons-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  isSearching?: boolean
}

export function SearchBar({ value, onChange, isSearching }: SearchBarProps) {
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

      <span className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center">
        {isSearching ? (
          <span
            role="status"
            aria-label="Searching"
            className="size-4 animate-spin rounded-full border-2 border-border border-t-accent"
          />
        ) : (
          value && (
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="Clear search"
              className="grid size-7 place-items-center rounded-full text-subtle transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <IconX size={14} stroke={2.25} aria-hidden />
            </button>
          )
        )}
      </span>
    </div>
  )
}
