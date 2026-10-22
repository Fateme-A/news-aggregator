import { createEmptyQuery } from '@/domain/query'
import { context } from '@/test/context'
import { requestedUrl, stubFetch } from '@/test/fetch-spy'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nytimesSource } from './adapter'
import sample from '@/samples/nyt-search.json'
import { CATEGORY_TO_DESKS, deskToCategory, toArticle, toNytDate } from './mapper'
import type { NytDoc, NytSearchResponse } from './types'

// `response` and `docs` are both nullable on the wire — see types.ts — so the
// recorded page has to be narrowed here just as the adapter narrows a live one.
const docs = (sample as NytSearchResponse).response?.docs ?? []

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('nytimes mapper', () => {
  it('normalises a real API document into an Article', () => {
    const first = docs[0]!
    const article = toArticle(first)

    expect(article.id).toBe(`nytimes:${first._id}`)
    expect(article.url).toBe(first.web_url)
    expect(article.publishedAt).toBe(first.pub_date)
    expect(article.source.id).toBe('nytimes')
    expect(article.title.length).toBeGreaterThan(0)
  })

  it('strips the "By " prefix the NYT puts on every byline', () => {
    // Every byline in the recorded fixture starts with "By ", unlike the other
    // two providers — without stripping it, author matching across sources fails.
    const withByline = docs.find((d) => d.byline?.original)!
    expect(withByline.byline!.original!).toMatch(/^By /)

    const article = toArticle(withByline)
    expect(article.author).not.toMatch(/^By /)
    expect(article.author).toBe(withByline.byline!.original!.replace(/^By /, ''))
  })

  it('reads image URLs from the multimedia object as absolute URLs', () => {
    // The current API returns `multimedia` as an object of renditions holding
    // absolute URLs, not the array of relative paths older docs describe.
    const withImage = docs.find((d) => d.multimedia?.default?.url)!
    const article = toArticle(withImage)

    expect(article.imageUrl).toBe(withImage.multimedia!.default!.url)
    expect(article.imageUrl).toMatch(/^https:\/\//)
  })

  it('tolerates documents with no byline or multimedia', () => {
    const bare: NytDoc = {
      _id: 'nyt://article/bare',
      web_url: 'https://www.nytimes.com/x',
      pub_date: '2026-01-01T00:00:00Z',
      headline: { main: 'Bare headline' },
      byline: null,
      multimedia: null,
    }
    const article = toArticle(bare)

    expect(article.author).toBeUndefined()
    expect(article.imageUrl).toBeUndefined()
    expect(article.title).toBe('Bare headline')
  })

  describe('category mapping', () => {
    it('maps news desks case-insensitively', () => {
      expect(deskToCategory('Climate')).toBe('science')
      expect(deskToCategory('climate')).toBe('science')
      expect(deskToCategory('RealEstate')).toBe('business')
    })

    it('falls back to general for unknown or missing desks', () => {
      expect(deskToCategory(undefined)).toBe('general')
      expect(deskToCategory('NoSuchDesk')).toBe('general')
    })

    it('maps every desk in the forward table back to the same category', () => {
      for (const [category, desks] of Object.entries(CATEGORY_TO_DESKS)) {
        for (const desk of desks) {
          expect(deskToCategory(desk)).toBe(category)
        }
      }
    })
  })

  describe('toNytDate', () => {
    it('converts ISO dates to the YYYYMMDD form the API requires', () => {
      expect(toNytDate('2026-10-21')).toBe('20261021')
    })

    it('passes undefined through so the param is omitted', () => {
      expect(toNytDate(undefined)).toBeUndefined()
    })
  })
})

describe('nytimes adapter resilience', () => {
  it('treats a null docs list as an empty page rather than crashing', async () => {
    // The live API answers `{"response":{"docs":null,...}}` for a zero-hit
    // query, which is why the wire type is `NytDoc[] | null`.
    const spy = stubFetch({
      status: 'OK',
      response: { docs: null, metadata: { hits: 0 } },
    })

    const page = await nytimesSource.fetchArticles(createEmptyQuery(), context())

    expect(spy).toHaveBeenCalled()
    expect(page.articles).toEqual([])
    expect(page.hasMore).toBe(false)
  })

  it('survives a response with no envelope at all', async () => {
    stubFetch({ status: 'OK' })
    const page = await nytimesSource.fetchArticles(createEmptyQuery(), context())
    expect(page.articles).toEqual([])
  })

  it('declares category and author unsupported, because the fq parameter is dead', async () => {
    // Measured: any fq clause empties the result set on the free tier, so the
    // adapter must not send one — and must not claim to have filtered.
    const spy = stubFetch({ status: 'OK', response: { docs: [], metadata: { hits: 0 } } })
    await nytimesSource.fetchArticles(
      { ...createEmptyQuery(), categories: ['science'], authors: ['Fiona Harvey'] },
      context(),
    )

    expect(requestedUrl(spy).searchParams.has('fq')).toBe(false)

    const capabilities = nytimesSource.capabilities(createEmptyQuery())
    expect(capabilities.categoryFilter).toBe(false)
    expect(capabilities.authorFilter).toBe(false)
    expect(capabilities.dateRangeFilter).toBe(true)
  })
})
