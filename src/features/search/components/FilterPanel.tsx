import { CATEGORY_ICONS, SOURCE_ICONS } from '@/components/icons'
import { Chip } from '@/components/ui/Chip'
import { Section } from '@/components/ui/Section'
import { Toggle } from '@/components/ui/Toggle'
import type { Category, SourceId } from '@/domain/article'
import type { ExploreFilters } from '../lib/filters'
import { CATEGORIES, CATEGORY_LABELS } from '@/domain/article'
import { createEmptyQuery } from '@/domain/query'
import { todayIso } from '@/lib/dates'
import { SOURCES } from '@/sources/registry'

interface FilterPanelProps {
  idPrefix?: string
  values: ExploreFilters
  onToggleSource: (id: SourceId) => void
  onToggleCategory: (category: Category) => void
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  onReset: () => void
}

export function FilterPanel({
  idPrefix = 'filter',
  values,
  onToggleSource,
  onToggleCategory,
  onDateFromChange,
  onDateToChange,
  onReset,
}: FilterPanelProps) {
  const today = todayIso()
  // Author support never varies by query, so an empty one is a fair probe.
  const probe = createEmptyQuery()
  const authorHints: Partial<Record<SourceId, string>> = Object.fromEntries(
    SOURCES.filter((source) => !source.capabilities(probe).authorFilter).map((source) => [
      source.id,
      'Author filtering applied in-browser',
    ]),
  )
  const hasFilters =
    values.categories.length > 0 ||
    Boolean(values.dateFrom) ||
    Boolean(values.dateTo) ||
    values.sources.length !== SOURCES.length

  return (
    <div className="@container divide-y divide-border">
      <Section
        title="Sources"
        action={
          values.sources.length === 0 ? (
            <span className="text-[11px] font-medium tracking-normal text-danger normal-case">
              Pick at least one
            </span>
          ) : undefined
        }
        first
      >
        <div className="space-y-1.5">
          {SOURCES.map((source) => (
            <Toggle
              key={source.id}
              icon={SOURCE_ICONS[source.id]}
              label={source.label}
              checked={values.sources.includes(source.id)}
              onChange={() => onToggleSource(source.id)}
              {...(authorHints[source.id] ? { hint: authorHints[source.id] } : {})}
            />
          ))}
        </div>
      </Section>

      <Section title="Categories">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Chip
              key={category}
              icon={CATEGORY_ICONS[category]}
              selected={values.categories.includes(category)}
              onClick={() => onToggleCategory(category)}
            >
              {CATEGORY_LABELS[category]}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Published">
        <div className="grid grid-cols-1 gap-3 @[19rem]:grid-cols-2">
          <DateField
            id={`${idPrefix}-date-from`}
            label="From"
            value={values.dateFrom}
            max={values.dateTo || today}
            onChange={onDateFromChange}
          />
          <DateField
            id={`${idPrefix}-date-to`}
            label="To"
            value={values.dateTo}
            min={values.dateFrom}
            max={today}
            onChange={onDateToChange}
          />
        </div>
      </Section>

      <div className="pt-4">
        <button
          type="button"
          onClick={onReset}
          disabled={!hasFilters}
          className="inline-flex h-9 items-center rounded-full px-3 text-[13px] font-medium text-accent transition-colors hover:bg-accent-soft disabled:pointer-events-none disabled:text-subtle disabled:opacity-60"
        >
          {hasFilters ? 'Reset filters' : 'No filters applied'}
        </button>
      </div>
    </div>
  )
}

function DateField({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string
  label: string
  value: string
  min?: string
  max?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full min-w-0 rounded-field bg-surface px-3 text-sm text-ink ring-1 ring-border ring-inset transition-shadow focus:ring-accent/40 focus:shadow-focus focus:outline-none"
      />
    </div>
  )
}
