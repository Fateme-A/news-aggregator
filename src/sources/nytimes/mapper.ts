import type { Article, Category } from '@/domain/article'
import { stripHtml } from '@/lib/text'
import type { NytDoc } from './types'

/**
 * Canonical category → NYT news desks.
 *
 * Same single-table pattern as the Guardian mapper: the reverse lookup is
 * derived, never written twice. Desk names are matched case-insensitively
 * because the NYT is inconsistent about casing ("OpEd", "Foreign", "RealEstate").
 */
export const CATEGORY_TO_DESKS: Record<Category, string[]> = {
  business: ['Business', 'BusinessDay', 'Financial', 'RealEstate', 'Jobs'],
  entertainment: [
    'Culture',
    'Arts',
    'Movies',
    'Books',
    'Theater',
    'TStyle',
    'Style',
    'Fashion',
    'Food',
    'Travel',
    'Weekend',
  ],
  general: ['Foreign', 'National', 'Metro', 'Politics', 'OpEd', 'Editorial', 'NYTNow', 'Express'],
  health: ['Health', 'Well', 'Science Health', 'Learning'],
  science: ['Science', 'Climate', 'Environment'],
  sports: ['Sports', 'SpecialSections'],
  technology: ['Technology', 'Personal Tech'],
}

const DESK_TO_CATEGORY: ReadonlyMap<string, Category> = new Map(
  Object.entries(CATEGORY_TO_DESKS).flatMap(([category, desks]) =>
    desks.map((desk) => [desk.toLowerCase(), category as Category] as const),
  ),
)

export function deskToCategory(desk: string | undefined): Category {
  if (!desk) return 'general'
  return DESK_TO_CATEGORY.get(desk.toLowerCase()) ?? 'general'
}

/**
 * Build the NYT `fq` (filter query) clause, which uses Lucene syntax.
 * Values are quoted so that multi-word desks such as `"Personal Tech"` survive.
 */
export function buildFilterQuery(categories: Category[], authors: string[]): string | undefined {
  const clauses: string[] = []

  if (categories.length > 0) {
    const desks = categories.flatMap((category) => CATEGORY_TO_DESKS[category])
    clauses.push(`news_desk:(${desks.map((d) => `"${d}"`).join(' ')})`)
  }

  if (authors.length > 0) {
    clauses.push(`byline:(${authors.map((a) => `"${escapeLucene(a)}"`).join(' ')})`)
  }

  return clauses.length > 0 ? clauses.join(' AND ') : undefined
}

function escapeLucene(value: string): string {
  return value.replace(/["\\]/g, '\\$&')
}

/** NYT dates are `YYYYMMDD`; our domain uses `YYYY-MM-DD`. */
export function toNytDate(isoDate: string | undefined): string | undefined {
  if (!isoDate) return undefined
  return isoDate.replace(/-/g, '')
}

export function toArticle(doc: NytDoc): Article {
  // `byline.original` arrives as "By Jane Doe"; strip the prefix so author
  // values are comparable with the other providers'.
  const rawByline = doc.byline?.original?.trim()
  const author = rawByline ? rawByline.replace(/^by\s+/i, '') : undefined

  const article: Article = {
    id: `nytimes:${doc._id}`,
    title: stripHtml(doc.headline?.main ?? ''),
    description: stripHtml(doc.abstract || doc.snippet || doc.lead_paragraph || ''),
    url: doc.web_url,
    publishedAt: doc.pub_date,
    category: deskToCategory(doc.news_desk ?? doc.section_name),
    source: { id: 'nytimes', name: doc.source || 'The New York Times' },
  }

  if (author) article.author = author

  const image = doc.multimedia?.default?.url ?? doc.multimedia?.thumbnail?.url
  if (image) article.imageUrl = image

  return article
}
