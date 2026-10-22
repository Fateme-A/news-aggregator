import { afterEach, describe, expect, it, vi } from 'vitest'
import { NewsSourceError } from '@/domain/news-source'
import { createEmptyQuery } from '@/domain/query'
import { requestedUrl, stubFetch } from '@/test/fetch-spy'
import { newsapiSource } from './adapter'

const EMPTY_OK = { status: 'ok', totalResults: 0, articles: [] }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('newsapi adapter', () => {
  describe('endpoint selection', () => {
    // NewsAPI splits functionality across two endpoints that cannot be combined:
    // /everything searches text and dates but ignores categories, while
    // /top-headlines filters by category but not by date. Callers must never
    // have to know this.

    it('uses /everything when a keyword is present', async () => {
      const spy = stubFetch(EMPTY_OK)
      await newsapiSource.fetchArticles({ ...createEmptyQuery(), keyword: 'climate' })

      const url = requestedUrl(spy)
      expect(url.pathname).toBe('/api/newsapi/everything')
      expect(url.searchParams.get('q')).toBe('climate')
    })

    it('uses /top-headlines when only a category is selected', async () => {
      const spy = stubFetch(EMPTY_OK)
      await newsapiSource.fetchArticles({ ...createEmptyQuery(), categories: ['technology'] })

      const url = requestedUrl(spy)
      expect(url.pathname).toBe('/api/newsapi/top-headlines')
      expect(url.searchParams.get('category')).toBe('technology')
    })

    it('prefers /everything when a keyword and a category are both present', async () => {
      // /top-headlines is a poor keyword search, so the keyword wins.
      const spy = stubFetch(EMPTY_OK)
      await newsapiSource.fetchArticles({
        ...createEmptyQuery(),
        keyword: 'climate',
        categories: ['science'],
      })

      expect(requestedUrl(spy).pathname).toBe('/api/newsapi/everything')
    })

    it('falls back to a broad term when nothing is specified', async () => {
      // /everything rejects a request carrying no query at all.
      const spy = stubFetch(EMPTY_OK)
      await newsapiSource.fetchArticles(createEmptyQuery())

      expect(requestedUrl(spy).searchParams.get('q')).toBe('news')
    })
  })

  describe('query parameters', () => {
    it('passes a date range through to /everything', async () => {
      const spy = stubFetch(EMPTY_OK)
      await newsapiSource.fetchArticles({
        ...createEmptyQuery(),
        keyword: 'climate',
        dateFrom: '2026-01-01',
        dateTo: '2026-02-01',
      })

      const url = requestedUrl(spy)
      expect(url.searchParams.get('from')).toBe('2026-01-01')
      expect(url.searchParams.get('to')).toBe('2026-02-01')
    })

    it('omits empty parameters instead of sending blanks', async () => {
      const spy = stubFetch(EMPTY_OK)
      await newsapiSource.fetchArticles({ ...createEmptyQuery(), keyword: 'climate' })

      const url = requestedUrl(spy)
      expect(url.searchParams.has('from')).toBe(false)
      expect(url.searchParams.has('to')).toBe(false)
    })

    it('sorts by relevance for keyword searches and by date otherwise', async () => {
      const withKeyword = stubFetch(EMPTY_OK)
      await newsapiSource.fetchArticles({ ...createEmptyQuery(), keyword: 'climate' })
      expect(requestedUrl(withKeyword).searchParams.get('sortBy')).toBe('relevancy')

      vi.unstubAllGlobals()
      const withoutKeyword = stubFetch(EMPTY_OK)
      await newsapiSource.fetchArticles(createEmptyQuery())
      expect(requestedUrl(withoutKeyword).searchParams.get('sortBy')).toBe('publishedAt')
    })
  })

  describe('error handling', () => {
    it('translates a 200-with-error-body into a NewsSourceError', async () => {
      // NewsAPI reports rate limiting as HTTP 200 with status:"error", so the
      // shared HTTP layer cannot catch it.
      stubFetch({ status: 'error', code: 'rateLimited', message: 'Too many requests' })

      await expect(newsapiSource.fetchArticles(createEmptyQuery())).rejects.toMatchObject({
        name: 'NewsSourceError',
        kind: 'rate-limited',
      })
    })

    it('classifies an invalid key as an auth failure', async () => {
      stubFetch({ status: 'error', code: 'apiKeyInvalid', message: 'Bad key' })

      await expect(newsapiSource.fetchArticles(createEmptyQuery())).rejects.toMatchObject({
        kind: 'auth',
      })
    })

    it('maps a 429 response to a rate-limited error', async () => {
      stubFetch({}, { ok: false, status: 429 })

      const error = await newsapiSource.fetchArticles(createEmptyQuery()).catch((e) => e)
      expect(error).toBeInstanceOf(NewsSourceError)
      expect(error.kind).toBe('rate-limited')
    })
  })

  describe('results', () => {
    it('drops [Removed] placeholders before they reach the feed', async () => {
      stubFetch({
        status: 'ok',
        totalResults: 2,
        articles: [
          {
            source: { id: null, name: 'Example' },
            author: null,
            title: '[Removed]',
            description: null,
            url: 'https://removed.com/',
            urlToImage: null,
            publishedAt: '2026-01-01T00:00:00Z',
            content: null,
          },
          {
            source: { id: null, name: 'Example' },
            author: 'Jane',
            title: 'Real story',
            description: 'Body',
            url: 'https://example.com/real',
            urlToImage: null,
            publishedAt: '2026-01-02T00:00:00Z',
            content: null,
          },
        ],
      })

      const page = await newsapiSource.fetchArticles(createEmptyQuery())
      expect(page.articles).toHaveLength(1)
      expect(page.articles[0]!.title).toBe('Real story')
    })

    it('reports hasMore from the total against the requested page', async () => {
      stubFetch({ status: 'ok', totalResults: 100, articles: [] })
      const page = await newsapiSource.fetchArticles({ ...createEmptyQuery(), pageSize: 12 })
      expect(page.hasMore).toBe(true)
    })
  })

  it('declares that it cannot filter by author server-side', () => {
    // This flag is what makes useArticles fall back to client-side filtering
    // rather than silently ignoring the author filter.
    expect(newsapiSource.capabilities.authorFilter).toBe(false)
  })
})
