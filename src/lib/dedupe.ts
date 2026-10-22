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
 * Two articles with the same headline are the same story only if they were
 * published at roughly the same time. Without this window, recurring headlines
 * — "Morning briefing", "What we know so far", a weekly column title — would
 * collapse months of coverage into a single card.
 */
const SAME_STORY_WINDOW_MS = 48 * 60 * 60 * 1000

/** The day-bucket a title key is scoped to, so near-in-time copies still match. */
function titleBucket(iso: string): string {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return 'undated'
  return String(Math.floor(time / SAME_STORY_WINDOW_MS))
}

/**
 * Removes duplicates, keeping the first occurrence.
 *
 * Callers sort before deduping so that "first" is the preferred copy — see
 * `mergeArticles`, which orders by recency so the freshest version survives.
 *
 * A URL match is conclusive on its own. A title match is not, so it is scoped
 * to a 48-hour window and checked against the adjacent bucket as well, which
 * stops a story that straddles a bucket boundary from slipping through.
 */
export function dedupeArticles(articles: Article[]): Article[] {
  const seen = new Set<string>()
  const result: Article[] = []

  for (const article of articles) {
    const byUrl = urlKey(article.url)
    const byTitle = titleKey(article.title)
    const bucket = Number(titleBucket(article.publishedAt))

    const lookups: string[] = []
    if (byUrl) lookups.push(`u:${byUrl}`)
    if (byTitle) {
      // An empty title key would collapse unrelated untitled items together.
      if (Number.isNaN(bucket)) lookups.push(`t:${byTitle}:undated`)
      else lookups.push(`t:${byTitle}:${bucket}`, `t:${byTitle}:${bucket - 1}`)
    }

    if (lookups.some((key) => seen.has(key))) continue

    if (byUrl) seen.add(`u:${byUrl}`)
    if (byTitle) seen.add(Number.isNaN(bucket) ? `t:${byTitle}:undated` : `t:${byTitle}:${bucket}`)
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
