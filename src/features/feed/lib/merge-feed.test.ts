import type { Article, SourceId } from '@/domain/article'
import { NewsSourceError, type NewsSource, type SourceCapabilities } from '@/domain/news-source'
import { createEmptyQuery, type ArticlePage, type ArticleQuery } from '@/domain/query'
import { describe, expect, it } from 'vitest'
import { mergeFeedResults, type PageRequest, type PageResult } from './merge-feed'

function fakeSource(id: SourceId, capabilities: Partial<SourceCapabilities> = {}): NewsSource {
  return {
    id,
    label: id.toUpperCase(),
    supportedCategories: [],
    capabilities: () => ({
      authorFilter: true,
      categoryFilter: true,
      dateRangeFilter: true,
      ...capabilities,
    }),
    fetchArticles: () => Promise.reject(new Error('not used')),
  }
}

const SOURCES: Record<string, NewsSource> = {
  guardian: fakeSource('guardian'),
  // The provider that cannot filter upstream, so the browser must.
  nytimes: fakeSource('nytimes', { categoryFilter: false, authorFilter: false }),
  newsapi: fakeSource('newsapi'),
}
const getSource = (id: SourceId) => SOURCES[id]!

function article(id: string, overrides: Partial<Article> = {}): Article {
  return {
    id,
    title: id,
    description: '',
    url: `https://example.com/${id}`,
    publishedAt: '2026-10-01T00:00:00Z',
    source: { id: 'guardian', name: 'The Guardian' },
    ...overrides,
  }
}

function page(articles: Article[], overrides: Partial<ArticlePage> = {}): ArticlePage {
  return { articles, hasMore: false, delivery: { origin: 'live' }, ...overrides }
}

function result(overrides: Partial<PageResult> = {}): PageResult {
  return { isFetching: false, isPending: false, ...overrides }
}

const merge = (
  requests: PageRequest[],
  results: PageResult[],
  query: ArticleQuery = createEmptyQuery(),
) => mergeFeedResults(requests, results, query, getSource)

describe('mergeFeedResults', () => {
  it('merges every source into one feed, newest first', () => {
    const merged = merge(
      [
        { sourceId: 'guardian', page: 1 },
        { sourceId: 'newsapi', page: 1 },
      ],
      [
        result({ data: page([article('older', { publishedAt: '2026-09-01T00:00:00Z' })]) }),
        result({ data: page([article('newer', { publishedAt: '2026-10-05T00:00:00Z' })]) }),
      ],
    )

    expect(merged.articles.map((a) => a.id)).toEqual(['newer', 'older'])
  })

  it('reports a failing source once, however many of its pages are in flight', () => {
    const error = new NewsSourceError('nytimes', 'boom', 'rate-limited')
    const merged = merge(
      [
        { sourceId: 'nytimes', page: 1 },
        { sourceId: 'nytimes', page: 2 },
      ],
      [result({ error }), result({ error })],
    )

    expect(merged.failures).toHaveLength(1)
    expect(merged.failures[0]).toMatchObject({ sourceId: 'nytimes', label: 'NYTIMES' })
    expect(merged.failures[0]?.message).toMatch(/rate limit/i)
  })

  it('keeps the other sources when one fails', () => {
    const merged = merge(
      [
        { sourceId: 'guardian', page: 1 },
        { sourceId: 'nytimes', page: 1 },
      ],
      [result({ data: page([article('kept')]) }), result({ error: new Error('down') })],
    )

    expect(merged.articles.map((a) => a.id)).toEqual(['kept'])
    expect(merged.failures).toHaveLength(1)
  })

  it('re-applies a filter the provider could not honour upstream', () => {
    const query = { ...createEmptyQuery(), categories: ['science' as const] }
    const merged = merge(
      [{ sourceId: 'nytimes', page: 1 }],
      [
        result({
          data: page([
            article('on-topic', { category: 'science' }),
            article('off-topic', { category: 'business' }),
          ]),
        }),
      ],
      query,
    )

    expect(merged.articles.map((a) => a.id)).toEqual(['on-topic'])
    expect(merged.clientFilters).toEqual([{ label: 'NYTIMES', filters: ['category'] }])
  })

  it('leaves a provider that filters upstream untouched', () => {
    const query = { ...createEmptyQuery(), categories: ['science' as const] }
    const merged = merge(
      [{ sourceId: 'guardian', page: 1 }],
      [result({ data: page([article('trusted', { category: 'business' })]) })],
      query,
    )

    // The Guardian said it filtered, so its results are taken at their word.
    expect(merged.articles.map((a) => a.id)).toEqual(['trusted'])
    expect(merged.clientFilters).toEqual([])
  })

  it('takes hasMore from the newest page only', () => {
    const merged = merge(
      [
        { sourceId: 'guardian', page: 1 },
        { sourceId: 'guardian', page: 2 },
      ],
      [
        result({ data: page([article('a')], { hasMore: true }) }),
        result({ data: page([article('b')], { hasMore: false }) }),
      ],
    )

    expect(merged.hasMore).toBe(false)
  })

  it('never offers another page of the recorded sample', () => {
    const merged = merge(
      [{ sourceId: 'guardian', page: 1 }],
      [
        result({
          data: page([article('a')], {
            hasMore: true,
            delivery: { origin: 'demo', reason: 'missing-key' },
          }),
        }),
      ],
    )

    expect(merged.hasMore).toBe(false)
    expect(merged.deliveries).toEqual([
      { sourceId: 'guardian', label: 'GUARDIAN', origin: 'demo', reason: 'missing-key' },
    ])
  })

  it('pairs results with their source by id, not by position', () => {
    // A page from each source, interleaved rather than grouped.
    const merged = merge(
      [
        { sourceId: 'guardian', page: 1 },
        { sourceId: 'newsapi', page: 1 },
        { sourceId: 'guardian', page: 2 },
      ],
      [
        result({ data: page([article('g1')]) }),
        result({ data: page([article('n1')]) }),
        result({ data: page([article('g2')]) }),
      ],
    )

    expect(merged.articles).toHaveLength(3)
    expect(merged.deliveries.map((d) => d.sourceId)).toEqual(['guardian', 'newsapi'])
  })

  it('is loading while any page is', () => {
    const merged = merge(
      [
        { sourceId: 'guardian', page: 1 },
        { sourceId: 'newsapi', page: 1 },
      ],
      [result({ data: page([]) }), result({ isFetching: true, isPending: true })],
    )

    expect(merged.isFetching).toBe(true)
    expect(merged.isPending).toBe(true)
  })

  it('returns an empty feed when nothing has arrived', () => {
    const merged = merge([{ sourceId: 'guardian', page: 1 }], [result({ isPending: true })])

    expect(merged.articles).toEqual([])
    expect(merged.deliveries).toEqual([])
  })
})
