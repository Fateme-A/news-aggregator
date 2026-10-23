import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleNewsProxy, type NewsProxyKeys } from './news-proxy'

const NONE: NewsProxyKeys = { guardian: '', nyt: '', newsapi: '' }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('news proxy', () => {
  it('reports which keys exist and does not return the values', async () => {
    const response = await handleNewsProxy(new Request('http://localhost/api/status'), {
      ...NONE,
      guardian: 'guardian-secret',
      newsapi: '   ',
    })

    expect(await response.json()).toEqual({ guardian: true, nytimes: false, newsapi: false })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('rejects paths the app does not call', async () => {
    const response = await handleNewsProxy(new Request('http://localhost/api/guardian/tags'), NONE)
    expect(response.status).toBe(404)
  })

  it('puts the Guardian key on the upstream URL, not in the response', async () => {
    const spy = vi.fn(async (_input: RequestInfo | URL) =>
      Response.json({ response: { results: [] } }),
    )
    vi.stubGlobal('fetch', spy)

    const response = await handleNewsProxy(
      new Request('http://localhost/api/guardian/search?q=climate&api-key=from-the-browser'),
      { ...NONE, guardian: 'guardian-secret' },
    )

    const upstream = new URL(String(spy.mock.calls[0]?.[0]))
    expect(upstream.origin + upstream.pathname).toBe('https://content.guardianapis.com/search')
    expect(upstream.searchParams.get('q')).toBe('climate')
    expect(upstream.searchParams.get('api-key')).toBe('guardian-secret')
    expect(await response.text()).not.toContain('guardian-secret')
  })

  it('sends the NYT key to Article Search', async () => {
    const spy = vi.fn(async (_input: RequestInfo | URL) => Response.json({ status: 'OK' }))
    vi.stubGlobal('fetch', spy)

    await handleNewsProxy(new Request('http://localhost/api/nyt/articlesearch.json?q=climate'), {
      ...NONE,
      nyt: 'nyt-secret',
    })

    const upstream = new URL(String(spy.mock.calls[0]?.[0]))
    expect(upstream.origin + upstream.pathname).toBe(
      'https://api.nytimes.com/svc/search/v2/articlesearch.json',
    )
    expect(upstream.searchParams.get('api-key')).toBe('nyt-secret')
  })

  it('sends the NewsAPI key as a header', async () => {
    const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({ status: 'ok' }),
    )
    vi.stubGlobal('fetch', spy)

    await handleNewsProxy(new Request('http://localhost/api/newsapi/everything?q=climate'), {
      ...NONE,
      newsapi: 'newsapi-secret',
    })

    const [url, init] = spy.mock.calls[0] ?? []
    expect(String(url)).toBe('https://newsapi.org/v2/everything?q=climate')
    const headers = new Headers(init?.headers)
    expect(headers.get('x-api-key')).toBe('newsapi-secret')
    expect(headers.get('user-agent')).toBe('newsstand/1.0')
  })
})
