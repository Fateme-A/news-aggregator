import { describe, expect, it } from 'vitest'
import everything from '@/samples/newsapi-everything.json'
import topHeadlines from '@/samples/newsapi-topheadlines.json'
import { isUsable, toArticle } from './mapper'
import type { NewsApiArticle, NewsApiResponse } from './types'

const everythingArticles = (everything as NewsApiResponse).articles!
const headlineArticles = (topHeadlines as NewsApiResponse).articles!

function stub(overrides: Partial<NewsApiArticle> = {}): NewsApiArticle {
  return {
    source: { id: null, name: 'Example Times' },
    author: 'Jane Doe',
    title: 'A headline',
    description: 'A description',
    url: 'https://example.com/story',
    urlToImage: 'https://example.com/image.jpg',
    publishedAt: '2026-01-01T00:00:00Z',
    content: null,
    ...overrides,
  }
}

describe('newsapi mapper', () => {
  it('normalises a real /everything article', () => {
    const first = everythingArticles[0]!
    const article = toArticle(first)

    expect(article.id).toBe(`newsapi:${first.url}`)
    expect(article.url).toBe(first.url)
    expect(article.publishedAt).toBe(first.publishedAt)
    // Unlike the single-publisher providers, the outlet name varies per article.
    expect(article.source).toEqual({ id: 'newsapi', name: first.source.name })
  })

  it('uses the same shape for /top-headlines articles', () => {
    const article = toArticle(headlineArticles[0]!)
    expect(article.source.id).toBe('newsapi')
    expect(article.title.length).toBeGreaterThan(0)
  })

  it('records the requested category only when one was requested', () => {
    // NewsAPI never reports a category per article, so the only honest value is
    // the one the caller asked for.
    expect(toArticle(stub(), 'technology').category).toBe('technology')
    expect(toArticle(stub()).category).toBeUndefined()
  })

  it('omits optional fields rather than emitting nulls', () => {
    const article = toArticle(stub({ author: null, urlToImage: null, description: null }))
    expect(article.author).toBeUndefined()
    expect(article.imageUrl).toBeUndefined()
    expect(article.description).toBe('')
  })

  describe('isUsable', () => {
    it('rejects the [Removed] placeholders /everything returns', () => {
      expect(isUsable(stub({ title: '[Removed]' }))).toBe(false)
    })

    it('rejects articles with no title', () => {
      expect(isUsable(stub({ title: null }))).toBe(false)
    })

    it('accepts ordinary articles', () => {
      expect(isUsable(stub())).toBe(true)
    })

    it('accepts every article in the recorded fixtures', () => {
      expect(everythingArticles.every(isUsable)).toBe(true)
    })
  })
})
