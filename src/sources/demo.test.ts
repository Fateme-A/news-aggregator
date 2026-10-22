import { createEmptyQuery } from '@/domain/query'
import { narrowDemoArticles, readDelivery } from '@/sources/demo'
import { guardianSource } from '@/sources/guardian/adapter'
import { newsapiSource } from '@/sources/newsapi/adapter'
import { useDataMode } from '@/store/data-mode'
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
    useDataMode.getState().setPreference('demo')

    const page = await guardianSource.fetchArticles(createEmptyQuery())

    expect(spy).not.toHaveBeenCalled()
    expect(page.articles.length).toBeGreaterThan(0)
    expect(readDelivery('guardian')).toEqual({ origin: 'demo', reason: 'chosen' })
  })

  it('narrows the sample to articles that match the keyword', async () => {
    useDataMode.getState().setPreference('demo')
    const page = await newsapiSource.fetchArticles(createEmptyQuery())

    const matched = narrowDemoArticles(page.articles, { ...createEmptyQuery(), keyword: 'climate' })

    expect(matched.length).toBeGreaterThan(0)
    expect(
      matched.every((article) => /climate/i.test(`${article.title} ${article.description}`)),
    ).toBe(true)
    expect(matched.length).toBeLessThan(page.articles.length)
  })

  it('uses the recorded top-headlines sample for a category-only NewsAPI query', async () => {
    useDataMode.getState().setPreference('demo')

    const page = await newsapiSource.fetchArticles({
      ...createEmptyQuery(),
      categories: ['sports'],
    })

    expect(page.articles.some((article) => article.title.includes('Fight Night'))).toBe(true)
  })

  it('skips a provider whose key is missing', async () => {
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)
    useDataMode.getState().setPreference('auto')
    useDataMode.getState().setAvailability({ ...ALL_KEYS, guardian: false })

    const page = await guardianSource.fetchArticles(createEmptyQuery())

    expect(spy).not.toHaveBeenCalled()
    expect(page.articles.length).toBeGreaterThan(0)
    expect(readDelivery('guardian')).toEqual({ origin: 'demo', reason: 'missing-key' })
  })

  it('falls back to the sample when a live provider is rate-limited', async () => {
    useDataMode.getState().setPreference('auto')
    useDataMode.getState().setAvailability({ ...ALL_KEYS })
    stubFetch({}, { ok: false, status: 429 })

    const page = await guardianSource.fetchArticles(createEmptyQuery())

    expect(page.articles.length).toBeGreaterThan(0)
    expect(readDelivery('guardian')).toEqual({ origin: 'demo', reason: 'rate-limited' })
  })

  it('does not call a rate-limited provider again on the next query', async () => {
    useDataMode.getState().setPreference('auto')
    useDataMode.getState().setAvailability({ ...ALL_KEYS })
    const spy = stubFetch({}, { ok: false, status: 429 })

    await guardianSource.fetchArticles(createEmptyQuery())
    const page = await guardianSource.fetchArticles({ ...createEmptyQuery(), keyword: 'climate' })

    expect(spy).toHaveBeenCalledTimes(1)
    expect(page.articles.length).toBeGreaterThan(0)
    expect(readDelivery('guardian').reason).toBe('rate-limited')
  })

  it('falls back when NewsAPI reports the limit inside an HTTP 200', async () => {
    useDataMode.getState().setPreference('auto')
    useDataMode.getState().setAvailability({ ...ALL_KEYS })
    stubFetch({ status: 'error', code: 'rateLimited', message: 'Too many requests' })

    const page = await newsapiSource.fetchArticles(createEmptyQuery())

    expect(page.articles.length).toBeGreaterThan(0)
    expect(readDelivery('newsapi')).toEqual({ origin: 'demo', reason: 'rate-limited' })
  })

  it('keeps a server error visible in auto mode', async () => {
    useDataMode.getState().setPreference('auto')
    useDataMode.getState().setAvailability({ ...ALL_KEYS })
    stubFetch({}, { ok: false, status: 500 })

    await expect(guardianSource.fetchArticles(createEmptyQuery())).rejects.toMatchObject({
      kind: 'unknown',
    })
  })

  it('records a successful response as live', async () => {
    useDataMode.getState().setPreference('live')
    stubFetch({ status: 'ok', totalResults: 0, articles: [] })

    await newsapiSource.fetchArticles(createEmptyQuery())

    expect(readDelivery('newsapi')).toEqual({ origin: 'live' })
  })
})
