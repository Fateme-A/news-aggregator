import type { ClientFilter } from '@/features/feed/hooks/useArticles'

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * Grouped by the filters involved, so two providers with the same limitation
 * share one sentence. Null when there is nothing to disclose.
 */
export function describeClientFilters(clientFilters: ClientFilter[]): string | null {
  if (clientFilters.length === 0) return null

  const byFilters = new Map<string, string[]>()
  for (const entry of clientFilters) {
    const key = entry.filters.join('|')
    const labels = byFilters.get(key)
    if (labels) labels.push(entry.label)
    else byFilters.set(key, [entry.label])
  }

  const sentences = [...byFilters.entries()].map(([key, labels]) => {
    const filters = joinNames(key.split('|'))
    const subject = joinNames(labels)
    const verb = labels.length === 1 ? 'cannot' : 'cannot'
    const possessive = labels.length === 1 ? 'its results are' : 'their results are'
    return `${subject} ${verb} filter by ${filters} upstream, so ${possessive} narrowed in the browser.`
  })

  return sentences.join(' ')
}
