import { describe, expect, it } from 'vitest'
import type { Article } from '@/domain/article'
import { dedupeArticles, mergeArticles } from './dedupe'

function article(overrides: Partial<Article> & { id: string }): Article {
  return {
    title: 'Default headline',
    description: '',
    url: `https://example.com/${overrides.id}`,
    publishedAt: '2026-01-01T00:00:00Z',
    source: { id: 'guardian', name: 'The Guardian' },
    ...overrides,
  }
}

describe('dedupeArticles', () => {
  it('collapses the same URL arriving from two providers', () => {
    // NewsAPI syndicates outlets the other providers publish directly, so the
    // identical story genuinely arrives twice.
    const result = dedupeArticles([
      article({ id: 'a', url: 'https://theguardian.com/world/story' }),
      article({
        id: 'b',
        url: 'https://www.theguardian.com/world/story?utm_source=rss',
        source: { id: 'newsapi', name: 'The Guardian' },
      }),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('a')
  })

  it('collapses the same headline published at different URLs', () => {
    const result = dedupeArticles([
      article({ id: 'a', title: 'Climate deal reached', url: 'https://one.com/x' }),
      article({ id: 'b', title: 'Climate Deal Reached!', url: 'https://two.com/y' }),
    ])
    expect(result).toHaveLength(1)
  })

  it('ignores an appended outlet suffix when comparing headlines', () => {
    const result = dedupeArticles([
      article({ id: 'a', title: 'EA announces Fight Night', url: 'https://one.com/x' }),
      article({
        id: 'b',
        title: 'EA announces Fight Night - Bleacher Report',
        url: 'https://two.com/y',
      }),
    ])
    expect(result).toHaveLength(1)
  })

  it('keeps genuinely different stories', () => {
    const result = dedupeArticles([
      article({ id: 'a', title: 'First story', url: 'https://one.com/a' }),
      article({ id: 'b', title: 'Second story', url: 'https://two.com/b' }),
    ])
    expect(result).toHaveLength(2)
  })

  it('does not collapse distinct untitled articles together', () => {
    // An empty title normalises to an empty key, which must not match.
    const result = dedupeArticles([
      article({ id: 'a', title: '', url: 'https://one.com/a' }),
      article({ id: 'b', title: '', url: 'https://two.com/b' }),
    ])
    expect(result).toHaveLength(2)
  })

  it('tolerates malformed URLs instead of throwing', () => {
    const result = dedupeArticles([
      article({ id: 'a', title: 'One', url: 'not a url' }),
      article({ id: 'b', title: 'Two', url: '' }),
    ])
    expect(result).toHaveLength(2)
  })
})

describe('mergeArticles', () => {
  it('orders the combined feed newest first', () => {
    const merged = mergeArticles([
      [article({ id: 'old', title: 'Old', publishedAt: '2026-01-01T00:00:00Z' })],
      [article({ id: 'new', title: 'New', publishedAt: '2026-06-01T00:00:00Z' })],
    ])
    expect(merged.map((a) => a.id)).toEqual(['new', 'old'])
  })

  it('keeps the freshest copy when the same story is duplicated', () => {
    const merged = mergeArticles([
      [article({ id: 'stale', title: 'Same story', publishedAt: '2026-01-01T00:00:00Z' })],
      [
        article({
          id: 'fresh',
          title: 'Same story',
          url: 'https://other.com/s',
          publishedAt: '2026-06-01T00:00:00Z',
        }),
      ],
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0]!.id).toBe('fresh')
  })

  it('sorts unparseable dates last rather than throwing', () => {
    const merged = mergeArticles([
      [article({ id: 'bad', title: 'Bad date', publishedAt: 'not-a-date' })],
      [article({ id: 'good', title: 'Good date', publishedAt: '2026-01-01T00:00:00Z' })],
    ])
    expect(merged.map((a) => a.id)).toEqual(['good', 'bad'])
  })

  it('returns an empty feed when every source returned nothing', () => {
    expect(mergeArticles([[], []])).toEqual([])
  })
})
