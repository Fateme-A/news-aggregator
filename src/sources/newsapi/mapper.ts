import type { Article, Category } from '@/domain/article'
import { stripHtml } from '@/lib/text'
import type { NewsApiArticle } from './types'

/**
 * NewsAPI's own vocabulary *is* our canonical vocabulary, so no lookup table is
 * needed here — the other two providers map into this set. That is precisely why
 * `Category` was defined from NewsAPI's seven values.
 */
export function toNewsApiCategory(category: Category): string {
  return category
}

/**
 * NewsAPI aggregates thousands of outlets, so unlike the single-publisher
 * providers it cannot tell us a category per article — only the outlet name.
 * We therefore pass the requested category through rather than inferring one,
 * and leave it undefined when the user has not asked for a category.
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

/**
 * NewsAPI's `/everything` endpoint returns removed articles as literal
 * `"[Removed]"` placeholders. They carry no usable content, so they are dropped
 * before they reach the feed.
 */
export function isUsable(raw: NewsApiArticle): boolean {
  return Boolean(raw.url) && raw.title !== null && raw.title !== '[Removed]'
}
