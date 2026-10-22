import type { Article } from '@/domain/article'

/**
 * Aggregating several providers means the same story can arrive more than once —
 * NewsAPI syndicates outlets that The Guardian and the NYT also publish directly.
 * Showing it twice looks like a bug, so near-duplicates are collapsed.
 */

/** Canonical URL ignoring tracking parameters and trailing slashes. */
function urlKey(url: string): string | undefined {
  try {
    const parsed = new URL(url)
    parsed.search = ''
    parsed.hash = ''
    parsed.pathname = parsed.pathname.replace(/\/+$/, '')
    return `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname}`
  } catch {
    return undefined
  }
}

/** Title reduced to comparable form: no case, punctuation or outlet suffix. */
function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+[|–-]\s+[^|–-]{0,40}$/u, '') // strip " - Bleacher Report" style suffixes
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Removes duplicates, keeping the first occurrence.
 *
 * Callers sort before deduping so that "first" is the preferred copy — see
 * `mergeArticles`, which orders by recency so the freshest version survives.
 */
export function dedupeArticles(articles: Article[]): Article[] {
  const seen = new Set<string>()
  const result: Article[] = []

  for (const article of articles) {
    const byUrl = urlKey(article.url)
    const byTitle = titleKey(article.title)

    // An empty title key would collapse unrelated untitled items together.
    const keys = [byUrl && `u:${byUrl}`, byTitle && `t:${byTitle}`].filter(Boolean) as string[]

    if (keys.some((key) => seen.has(key))) continue
    for (const key of keys) seen.add(key)
    result.push(article)
  }

  return result
}

/** Newest first; entries with an unparseable date sort last rather than throwing. */
function byRecency(a: Article, b: Article): number {
  const ta = Date.parse(a.publishedAt)
  const tb = Date.parse(b.publishedAt)
  if (Number.isNaN(ta) && Number.isNaN(tb)) return 0
  if (Number.isNaN(ta)) return 1
  if (Number.isNaN(tb)) return -1
  return tb - ta
}

/** Flatten per-source results into one feed: newest first, duplicates removed. */
export function mergeArticles(pages: Article[][]): Article[] {
  return dedupeArticles(pages.flat().sort(byRecency))
}
