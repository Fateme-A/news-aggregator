import type { Article, Category } from '@/domain/article'
import { stripHtml } from '@/lib/text'
import type { NytDoc } from './types'

/**
 * Canonical category → NYT news desks.
 *
 * Same single-table pattern as the Guardian mapper: the reverse lookup is
 * derived, never written twice. Desk names are matched case-insensitively
 * because the NYT is inconsistent about casing ("OpEd", "Foreign", "RealEstate").
 *
 * This table is now used in one direction only. It used to build an `fq` clause
 * as well, but that parameter returns nothing on the free tier (see
 * `adapter.ts`), so the NYT declares `categoryFilter: false` and `useArticles`
 * matches on the category this mapper assigns instead.
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
