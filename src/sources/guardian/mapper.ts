import type { Article, Category } from '@/domain/article'
import { stripHtml } from '@/lib/text'
import type { GuardianResult } from './types'

/**
 * Canonical category → Guardian sections.
 *
 * This is the single source of truth for the Guardian taxonomy. The reverse
 * lookup used when mapping a response back to a canonical category is *derived*
 * from this table rather than written out a second time, so the two directions
 * cannot drift apart.
 */
export const CATEGORY_TO_SECTIONS: Record<Category, string[]> = {
  business: ['business', 'money'],
  entertainment: [
    'culture',
    'film',
    'music',
    'tv-and-radio',
    'stage',
    'books',
    'artanddesign',
    'games',
    'fashion',
    'food',
    'travel',
    'lifeandstyle',
  ],
  general: [
    'world',
    'uk-news',
    'us-news',
    'politics',
    'news',
    'global-development',
    'law',
    'media',
  ],
  health: ['society', 'wellness', 'education'],
  science: ['science', 'environment'],
  sports: ['sport', 'football'],
  technology: ['technology'],
}

const SECTION_TO_CATEGORY: ReadonlyMap<string, Category> = new Map(
  Object.entries(CATEGORY_TO_SECTIONS).flatMap(([category, sections]) =>
    sections.map((section) => [section, category as Category] as const),
  ),
)

export function sectionToCategory(sectionId: string): Category {
  return SECTION_TO_CATEGORY.get(sectionId) ?? 'general'
}

/** The `section` query parameter accepts pipe-separated alternatives. */
export function sectionsParam(categories: Category[]): string | undefined {
  if (categories.length === 0) return undefined
  return categories.flatMap((category) => CATEGORY_TO_SECTIONS[category]).join('|')
}

/**
 * Prefer the contributor tags over `fields.byline`: tags are already split per
 * person and omit the editorial noise that sometimes appears in the byline
 * string. Fall back to the byline when no contributor tags are present.
 */
function extractAuthor(result: GuardianResult): string | undefined {
  const contributors = (result.tags ?? [])
    .filter((tag) => tag.type === 'contributor')
    .map((tag) => tag.webTitle.trim())
    .filter(Boolean)

  if (contributors.length > 0) return contributors.join(', ')

  const byline = result.fields?.byline?.trim()
  return byline || undefined
}

export function toArticle(result: GuardianResult): Article {
  const article: Article = {
    id: `guardian:${result.id}`,
    title: stripHtml(result.webTitle),
    description: stripHtml(result.fields?.trailText ?? ''),
    url: result.webUrl,
    publishedAt: result.webPublicationDate,
    category: sectionToCategory(result.sectionId),
    source: { id: 'guardian', name: 'The Guardian' },
  }

  const author = extractAuthor(result)
  if (author) article.author = author
  if (result.fields?.thumbnail) article.imageUrl = result.fields.thumbnail

  return article
}
