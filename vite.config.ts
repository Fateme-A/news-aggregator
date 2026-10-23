import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type Connect, type Plugin, type ProxyOptions } from 'vite'

/**
 * Upstream routing for the three news providers.
 *
 * The browser only ever talks to same-origin `/api/<source>/…` paths. This serves
 * two purposes:
 *   1. NewsAPI.org refuses cross-origin browser requests outright (it sends no
 *      `access-control-*` headers and permits localhost origins only), so a proxy
 *      is the only way to reach it from a deployed page at all.
 *   2. API keys stay server-side and never enter the JS bundle.
 *
 * The production equivalents are `nginx.conf.template` and `src/server/news-proxy.ts`.
 * Keep them in sync when adding a provider.
 */
interface Upstream {
  origin: string
  basePath: string
  auth: { kind: 'query'; param: string } | { kind: 'header'; name: string }
  envVar: string
}

const UPSTREAMS: Record<string, Upstream> = {
  guardian: {
    origin: 'https://content.guardianapis.com',
    basePath: '',
    auth: { kind: 'query', param: 'api-key' },
    envVar: 'GUARDIAN_KEY',
  },
  nyt: {
    origin: 'https://api.nytimes.com',
    basePath: '/svc/search/v2',
    auth: { kind: 'query', param: 'api-key' },
    envVar: 'NYT_KEY',
  },
  newsapi: {
    origin: 'https://newsapi.org',
    basePath: '/v2',
    // NewsAPI accepts a header, which keeps the key out of proxy access logs.
    auth: { kind: 'header', name: 'X-Api-Key' },
    envVar: 'NEWSAPI_KEY',
  },
}

/**
 * Tells the browser which providers have a key, without revealing the key.
 *
 * Auto mode reads this before it decides between a live request and the
 * recorded sample. Registered ahead of the proxy so `/api/status` is never
 * forwarded upstream.
 */
function statusMiddleware(env: Record<string, string>): Connect.NextHandleFunction {
  return (req, res, next) => {
    const path = req.url?.split('?')[0]
    if (path !== '/api/status') {
      next()
      return
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    res.end(
      JSON.stringify({
        guardian: Boolean(env.GUARDIAN_KEY?.trim()),
        nytimes: Boolean(env.NYT_KEY?.trim()),
        newsapi: Boolean(env.NEWSAPI_KEY?.trim()),
      }),
    )
  }
}

function statusPlugin(env: Record<string, string>): Plugin {
  const attach = (middlewares: Connect.Server) => {
    middlewares.use(statusMiddleware(env))
  }

  return {
    name: 'newsstand-api-status',
    // Adding the middleware inside `configureServer` (not in the returned
    // post-hook) places it before Vite's proxy.
    configureServer(server) {
      attach(server.middlewares)
    },
    configurePreviewServer(server) {
      attach(server.middlewares)
    },
  }
}

function buildProxy(env: Record<string, string>): Record<string, ProxyOptions> {
  const entries = Object.entries(UPSTREAMS).map(([id, up]) => {
    const prefix = `/api/${id}`
    const key = env[up.envVar] ?? ''

    if (!key) {
      console.warn(
        `[proxy] ${up.envVar} is not set — requests to ${prefix}/* will fail. ` +
          `Copy .env.example to .env.local and fill it in.`,
      )
    }

    const options: ProxyOptions = {
      target: up.origin,
      changeOrigin: true,
      rewrite: (path) => {
        const [rest = '', search = ''] = path.slice(prefix.length).split('?')
        const params = new URLSearchParams(search)
        if (up.auth.kind === 'query') params.set(up.auth.param, key)
        const qs = params.toString()
        return `${up.basePath}${rest}${qs ? `?${qs}` : ''}`
      },
    }

    if (up.auth.kind === 'header') {
      const headerName = up.auth.name
      options.configure = (proxy) => {
        proxy.on('proxyReq', (proxyReq) => {
          proxyReq.setHeader(headerName, key)
        })
      }
    }

    return [prefix, options] as const
  })

  return Object.fromEntries(entries)
}

export default defineConfig(({ mode }) => {
  // `''` prefix so non-VITE_ vars load too: these keys are read here in the Node
  // process and injected by the proxy, never exposed to client code.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss(), statusPlugin(env)],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      proxy: buildProxy(env),
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/test/**', 'src/**/*.test.{ts,tsx}', 'src/**/types.ts'],
      },
    },
  }
})
