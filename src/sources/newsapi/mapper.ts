import type { Article, Category } from '@/domain/article'
import { stripHtml } from '@/lib/text'
import type { NewsApiArticle } from './types'

/** NewsAPI's vocabulary is the canonical one, so there is no table to map. */
export function toNewsApiCategory(category: Category): string {
  return category
}

/**
 * NewsAPI reports the outlet, not a category per article, so the requested
 * category is passed through rather than inferred.
 */
export function toArticle(raw: NewsApiArticle, requestedCategory?: Category): Article {
  const article: Article = {
    // NewsAPI has no stable per-article id, so the canonical URL is the only
    // dependable identity it offers.
    id: `newsapi:${raw.url}`,
    title: stripHtml(raw.title ?? ''),
    description: stripHtml(raw.description ?? ''),
    url: raw.url,
    publishedAt: raw.publishedAt,
    source: { id: 'newsapi', name: raw.source.name },
  }

  if (raw.author) article.author = stripHtml(raw.author)
  if (raw.urlToImage) article.imageUrl = raw.urlToImage
  if (requestedCategory) article.category = requestedCategory

  return article
}

/** `/everything` returns removed articles as literal "[Removed]" placeholders. */
export function isUsable(raw: NewsApiArticle): boolean {
  return Boolean(raw.url) && raw.title !== null && raw.title !== '[Removed]'
}
