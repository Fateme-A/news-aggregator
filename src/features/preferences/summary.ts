import type { Category } from '@/domain/article'
import { pluralize } from '@/lib/text'

/**
 * "2 categories, 1 author" — what My Feed is narrowed by, for the sidebar and
 * the mobile banner. Empty when nothing is saved, which is the signal both
 * callers use to show their fallback copy.
 */
export function describePersonalisation(categories: Category[], authors: string[]): string {
  return [
    categories.length > 0 && pluralize(categories.length, 'category', 'categories'),
    authors.length > 0 && pluralize(authors.length, 'author'),
  ]
    .filter(Boolean)
    .join(', ')
}
