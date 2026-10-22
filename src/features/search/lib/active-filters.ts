import type { Category, SourceId } from '@/domain/article'
import { CATEGORY_LABELS } from '@/domain/article'
import { formatDay } from '@/lib/dates'
import { SOURCES } from '@/sources/registry'
import type { ExploreFilters } from './filters'

/** One applied filter: a label for the reader, and enough to undo it. */
export type ActiveFilter =
  | { key: string; label: string; kind: 'source'; id: SourceId }
  | { key: string; label: string; kind: 'category'; id: Category }
  | { key: string; label: string; kind: 'dates' }

function dateLabel(from: string, to: string): string | undefined {
  if (from && to) return from === to ? formatDay(from) : `${formatDay(from)} – ${formatDay(to)}`
  if (from) return `Since ${formatDay(from)}`
  if (to) return `Until ${formatDay(to)}`
  return undefined
}

/**
 * Every filter narrowing Explore. Sources appear only once the selection is
 * narrower than all of them — three of three is the default, not a choice.
 */
export function describeActiveFilters(values: ExploreFilters): ActiveFilter[] {
  const filters: ActiveFilter[] = []

  if (values.sources.length !== SOURCES.length) {
    for (const source of SOURCES) {
      if (!values.sources.includes(source.id)) continue
      filters.push({
        key: `source:${source.id}`,
        label: source.label,
        kind: 'source',
        id: source.id,
      })
    }
  }

  for (const category of values.categories) {
    filters.push({
      key: `category:${category}`,
      label: CATEGORY_LABELS[category],
      kind: 'category',
      id: category,
    })
  }

  const dates = dateLabel(values.dateFrom, values.dateTo)
  if (dates) filters.push({ key: 'dates', label: dates, kind: 'dates' })

  return filters
}
