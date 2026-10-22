import guardianSample from '@/samples/guardian-search.json'
import newsapiEverythingSample from '@/samples/newsapi-everything.json'
import newsapiHeadlinesSample from '@/samples/newsapi-topheadlines.json'
import nytSample from '@/samples/nyt-search.json'
import { vi } from 'vitest'

/**
 * Routes `fetch` to the recorded samples, honouring the parameters it is sent.
 *
 * Component tests exercise the real adapters and the real merge/dedupe pipeline —
 * only the network boundary is replaced. That keeps them honest about the wire
 * formats while never spending the providers' request quota.
 *
 * The filtering below matters more than it looks. A fake that returns the same
 * page whatever it is asked is useless for asserting that a filter *worked*:
 * every such test passes by accident. So this one applies the parameters each
 * provider genuinely applies upstream — and nothing more, so that a filter the
 * provider does not support stays unapplied here too, and the client-side
 * fallback in `useArticles` is what the test actually measures.
 */

export interface MockApiOptions {
  /** Paths matching these source ids reject with a 429 instead of resolving. */
  failing?: string[]
  /** Records every requested URL for assertions. */
  onRequest?: (url: string) => void
}

function ok(body: unknown): Response {
  return { ok: true, status: 200, statusText: 'OK', json: async () => body } as Response
}

type GuardianResult = (typeof guardianSample)['response']['results'][number]
type NytDoc = (typeof nytSample)['response']['docs'][number]

function guardianPage(params: URLSearchParams) {
  let results: GuardianResult[] = guardianSample.response.results

  // `section` accepts pipe-separated alternatives — the real API's behaviour.
  const section = params.get('section')
  if (section) {
    const wanted = new Set(section.split('|'))
    results = results.filter((result) => wanted.has(result.sectionId))
  }

  const q = params.get('q')?.toLowerCase()
  if (q) {
    results = results.filter((result) =>
      `${result.webTitle} ${result.fields?.trailText ?? ''}`.toLowerCase().includes(q),
    )
  }

  const from = params.get('from-date')
  const to = params.get('to-date')
  if (from) results = results.filter((result) => result.webPublicationDate.slice(0, 10) >= from)
  if (to) results = results.filter((result) => result.webPublicationDate.slice(0, 10) <= to)

  // `tag` carries pipe-separated contributor profiles.
  const tag = params.get('tag')
  if (tag) {
    const wanted = new Set(tag.split('|'))
    results = results.filter((result) =>
      (result.tags ?? []).some((candidate) => wanted.has(candidate.id)),
    )
  }

  return {
    response: { ...guardianSample.response, total: results.length, pages: 1, results },
  }
}

function nytPage(params: URLSearchParams) {
  let docs: NytDoc[] = nytSample.response.docs

  const q = params.get('q')?.toLowerCase()
  if (q) {
    docs = docs.filter((doc) =>
      `${doc.headline?.main ?? ''} ${doc.abstract ?? ''}`.toLowerCase().includes(q),
    )
  }

  // YYYYMMDD upstream, compared against the ISO timestamp's date part.
  const begin = params.get('begin_date')
  const end = params.get('end_date')
  const day = (doc: NytDoc) => doc.pub_date.slice(0, 10).replace(/-/g, '')
  if (begin) docs = docs.filter((doc) => day(doc) >= begin)
  if (end) docs = docs.filter((doc) => day(doc) <= end)

  // Deliberately no `fq` handling: the live API ignores it (returns nothing),
  // so the NYT declares categoryFilter/authorFilter false and `useArticles`
  // narrows these results in the browser. Filtering here would hide that.
  return { status: 'OK', response: { docs, metadata: { hits: docs.length } } }
}

function newsapiPage(url: string, params: URLSearchParams) {
  const topHeadlines = url.includes('top-headlines')
  const sample = topHeadlines ? newsapiHeadlinesSample : newsapiEverythingSample
  let articles = sample.articles

  const q = params.get('q')?.toLowerCase()
  if (q && q !== 'news') {
    articles = articles.filter((article) =>
      `${article.title ?? ''} ${article.description ?? ''}`.toLowerCase().includes(q),
    )
  }

  // `/everything` honours from/to; `/top-headlines` silently ignores them, and
  // reproducing that is the point — it is what the client-side date fallback
  // in `useArticles` exists to cover.
  if (!topHeadlines) {
    const from = params.get('from')
    const to = params.get('to')
    if (from) articles = articles.filter((article) => article.publishedAt.slice(0, 10) >= from)
    if (to) articles = articles.filter((article) => article.publishedAt.slice(0, 10) <= to)
  }

  return { status: 'ok', totalResults: articles.length, articles }
}

export function mockApi(options: MockApiOptions = {}) {
  const requests: string[] = []

  const spy = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const raw = String(input)
    requests.push(raw)
    options.onRequest?.(raw)

    const parsed = new URL(raw, 'http://localhost')
    const params = parsed.searchParams
    const route = ['guardian', 'nyt', 'newsapi'].find((id) =>
      parsed.pathname.startsWith(`/api/${id}/`),
    )

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

    if (route === 'guardian') return ok(guardianPage(params))
    if (route === 'nyt') return ok(nytPage(params))
    return ok(newsapiPage(raw, params))
  })

  vi.stubGlobal('fetch', spy)
  return { spy, requests }
}
