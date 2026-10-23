import { createEmptyQuery } from '@/domain/query'
import { narrowSample } from '@/sources/demo'
import { guardianSource } from '@/sources/guardian/adapter'
import { newsapiSource } from '@/sources/newsapi/adapter'
import { context } from '@/test/context'
import { stubFetch } from '@/test/fetch-spy'
import { afterEach, describe, expect, it, vi } from 'vitest'

const ALL_KEYS = { guardian: true, nytimes: true, newsapi: true } as const

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('demo and auto data', () => {
  it('does not call the network when demo is selected', async () => {
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)

    const page = await guardianSource.fetchArticles(createEmptyQuery(), context('demo'))

    expect(spy).not.toHaveBeenCalled()
    expect(page.articles.length).toBeGreaterThan(0)
    expect(page.delivery).toEqual({ origin: 'demo', reason: 'chosen' })
  })

  it('narrows the sample to articles that match the keyword', async () => {
    const page = await newsapiSource.fetchArticles(createEmptyQuery(), context('demo'))

    const matched = narrowSample(page.articles, { ...createEmptyQuery(), keyword: 'climate' })

    expect(matched.length).toBeGreaterThan(0)
    expect(
      matched.every((article) => /climate/i.test(`${article.title} ${article.description}`)),
    ).toBe(true)
    expect(matched.length).toBeLessThan(page.articles.length)
  })

  it('uses the recorded top-headlines sample for a category NewsAPI query', async () => {
    const page = await newsapiSource.fetchArticles(
      { ...createEmptyQuery(), categories: ['sports'] },
      context('demo'),
    )

    expect(page.articles.some((article) => article.title.includes('Fight Night'))).toBe(true)
  })

  it('skips a provider whose key is missing', async () => {
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)

    const page = await guardianSource.fetchArticles(
      createEmptyQuery(),
      context('auto', { ...ALL_KEYS, guardian: false }),
    )

    expect(spy).not.toHaveBeenCalled()
    expect(page.articles.length).toBeGreaterThan(0)
    expect(page.delivery).toEqual({ origin: 'demo', reason: 'missing-key' })
  })

  it('falls back to the sample when a live provider is rate-limited', async () => {
    stubFetch({}, { ok: false, status: 429 })

    const page = await guardianSource.fetchArticles(createEmptyQuery(), context('auto', ALL_KEYS))

    expect(page.articles.length).toBeGreaterThan(0)
    expect(page.delivery).toEqual({ origin: 'demo', reason: 'rate-limited' })
  })

  it('reports a refusing provider so the caller can stop asking', async () => {
    stubFetch({}, { ok: false, status: 429 })
    const breaker = {}

    await guardianSource.fetchArticles(createEmptyQuery(), context('auto', ALL_KEYS, breaker))

    expect(breaker).toEqual({ guardian: 'rate-limited' })
  })

  it('does not call a provider the caller has marked as refusing', async () => {
    const spy = stubFetch({}, { ok: false, status: 429 })
    const breaker = {}

    await guardianSource.fetchArticles(createEmptyQuery(), context('auto', ALL_KEYS, breaker))
    const page = await guardianSource.fetchArticles(
      { ...createEmptyQuery(), keyword: 'climate' },
      context('auto', ALL_KEYS, breaker),
    )

    expect(spy).toHaveBeenCalledTimes(1)
    expect(page.articles.length).toBeGreaterThan(0)
    expect(page.delivery.reason).toBe('rate-limited')
  })

  it('calls again once the caller clears the breaker', async () => {
    const spy = stubFetch({}, { ok: false, status: 429 })

    await guardianSource.fetchArticles(createEmptyQuery(), context('auto', ALL_KEYS, {}))
    // A fresh record is what changing mode produces in the store.
    await guardianSource.fetchArticles(createEmptyQuery(), context('auto', ALL_KEYS, {}))

    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('falls back when NewsAPI reports the limit inside an HTTP 200', async () => {
    stubFetch({ status: 'error', code: 'rateLimited', message: 'Too many requests' })

    const page = await newsapiSource.fetchArticles(createEmptyQuery(), context('auto', ALL_KEYS))

    expect(page.articles.length).toBeGreaterThan(0)
    expect(page.delivery).toEqual({ origin: 'demo', reason: 'rate-limited' })
  })

  it('keeps a server error visible in auto mode', async () => {
    stubFetch({}, { ok: false, status: 500 })

    await expect(
      guardianSource.fetchArticles(createEmptyQuery(), context('auto', ALL_KEYS)),
    ).rejects.toMatchObject({ kind: 'unknown' })
  })

  it('surfaces a rate limit rather than hiding it when Live is explicit', async () => {
    stubFetch({}, { ok: false, status: 429 })

    await expect(
      guardianSource.fetchArticles(createEmptyQuery(), context('live')),
    ).rejects.toMatchObject({ kind: 'rate-limited' })
  })

  it('records a successful response as live', async () => {
    stubFetch({ status: 'ok', totalResults: 0, articles: [] })

    const page = await newsapiSource.fetchArticles(createEmptyQuery(), context('live'))

    expect(page.delivery).toEqual({ origin: 'live' })
  })
})
