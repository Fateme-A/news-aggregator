import { vi } from 'vitest'
import guardianFixture from './fixtures/guardian-search.json'
import newsapiFixture from './fixtures/newsapi-everything.json'
import nytFixture from './fixtures/nyt-search.json'

/**
 * Routes `fetch` to a recorded fixture based on the proxy path.
 *
 * Component tests exercise the real adapters and the real merge/dedupe pipeline —
 * only the network boundary is replaced. That keeps the tests honest about the
 * wire formats while never spending the providers' request quota.
 */

export interface MockApiOptions {
  /** Paths matching these source ids reject instead of resolving. */
  failing?: string[]
  /** Records every requested URL for assertions. */
  onRequest?: (url: string) => void
}

const FIXTURES: Record<string, unknown> = {
  guardian: guardianFixture,
  nyt: nytFixture,
  newsapi: newsapiFixture,
}

export function mockApi(options: MockApiOptions = {}) {
  const requests: string[] = []

  const spy = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input)
    requests.push(url)
    options.onRequest?.(url)

    const route = Object.keys(FIXTURES).find((id) => url.includes(`/api/${id}/`))

    if (!route) {
      return { ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) } as Response
    }

    if (options.failing?.includes(route)) {
      return {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({}),
      } as Response
    }

    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => FIXTURES[route],
    } as Response
  })

  vi.stubGlobal('fetch', spy)
  return { spy, requests }
}
