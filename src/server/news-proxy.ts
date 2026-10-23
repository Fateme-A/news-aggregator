export interface NewsProxyKeys {
  guardian: string
  nyt: string
  newsapi: string
}

const ROUTES = {
  '/api/guardian/search': {
    origin: 'https://content.guardianapis.com',
    basePath: '',
    auth: 'query',
    key: 'guardian',
  },
  '/api/nyt/articlesearch.json': {
    origin: 'https://api.nytimes.com',
    basePath: '/svc/search/v2',
    auth: 'query',
    key: 'nyt',
  },
  '/api/newsapi/everything': {
    origin: 'https://newsapi.org',
    basePath: '/v2',
    auth: 'header',
    key: 'newsapi',
  },
  '/api/newsapi/top-headlines': {
    origin: 'https://newsapi.org',
    basePath: '/v2',
    auth: 'header',
    key: 'newsapi',
  },
} as const satisfies Record<
  string,
  { origin: string; basePath: string; auth: 'query' | 'header'; key: keyof NewsProxyKeys }
>

function present(value: string): boolean {
  return value.trim().length > 0
}

function status(keys: NewsProxyKeys): Response {
  return Response.json(
    {
      guardian: present(keys.guardian),
      nytimes: present(keys.nyt),
      newsapi: present(keys.newsapi),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

/**
 * Same-origin stand-in for the Vite dev proxy and the nginx container.
 * Only the four paths the app calls are forwarded, so this is not an open relay.
 */
export async function handleNewsProxy(request: Request, keys: NewsProxyKeys): Promise<Response> {
  const incoming = new URL(request.url)
  if (incoming.pathname === '/api/status') return status(keys)

  const route = ROUTES[incoming.pathname as keyof typeof ROUTES]
  if (!route) return new Response('Not found', { status: 404 })
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  const secret = keys[route.key].trim()
  const params = new URLSearchParams(incoming.search)
  params.delete('api-key')
  if (route.auth === 'query' && secret) params.set('api-key', secret)

  const headers = new Headers({ Accept: 'application/json' })
  if (route.auth === 'header') {
    headers.set('User-Agent', 'newsstand/1.0')
    if (secret) headers.set('X-Api-Key', secret)
  }

  const rest = incoming.pathname.slice(incoming.pathname.lastIndexOf('/'))
  const query = params.toString()
  const upstream = await fetch(
    `${route.origin}${route.basePath}${rest}${query ? `?${query}` : ''}`,
    {
      method: 'GET',
      headers,
      redirect: 'manual',
    },
  )

  const responseHeaders = new Headers()
  const contentType = upstream.headers.get('content-type')
  if (contentType) responseHeaders.set('content-type', contentType)
  responseHeaders.set(
    'Cache-Control',
    upstream.ok
      ? 'public, s-maxage=300'
      : upstream.status === 401 || upstream.status === 403 || upstream.status === 429
        ? 'public, s-maxage=30'
        : 'no-store',
  )

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders })
}
