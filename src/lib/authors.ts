import type { Article } from '@/domain/article'
import { normaliseAuthor, splitByline } from '@/lib/text'

/**
 * Contributors in a set of articles, most frequent first.
 *
 * Author filtering only matches names the providers publish — "Fiona Harvey"
 * works, "F. Harvey" matches nothing — so typing one from memory is guesswork.
 * Counted by normalised form, shown in the form the reader saw.
 */
export function collectAuthors(articles: readonly Article[], limit = 10): string[] {
  const counts = new Map<string, { name: string; count: number }>()

  for (const article of articles) {
    if (!article.author) continue
    for (const name of splitByline(article.author)) {
      const key = normaliseAuthor(name)
      // A single initial or stray fragment is not a usable filter.
      if (key.length < 3) continue
      const existing = counts.get(key)
      if (existing) existing.count += 1
      else counts.set(key, { name, count: 1 })
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((entry) => entry.name)
}
