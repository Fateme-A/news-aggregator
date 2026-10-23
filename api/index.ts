import { handleNewsProxy } from '../src/server/news-proxy'

/**
 * Single entry point for every `/api/*` path, reached through the rewrite in
 * `vercel.json`. Vercel does not support catch-all routes (`[...path].ts`)
 * outside Next.js, and one function keeps Fluid compute reusing instances
 * across routes rather than building five.
 *
 * The rewrite is internal, so `request.url` still carries the original
 * pathname — which is what `handleNewsProxy` routes on.
 *
 * The dev and container equivalents are `vite.config.ts` and
 * `nginx.conf.template`. Keep them in sync when adding a provider.
 */
export default {
  async fetch(request: Request): Promise<Response> {
    try {
      return await handleNewsProxy(request, {
        guardian: process.env.GUARDIAN_KEY ?? '',
        nyt: process.env.NYT_KEY ?? '',
        newsapi: process.env.NEWSAPI_KEY ?? '',
      })
    } catch (cause) {
      // Without this the platform swallows the cause and the browser sees an
      // opaque 500, which the client classifies as a vague "unexpected error".
      console.error('[api] proxy threw', cause)
      const error = cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause)
      return Response.json({ error }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
    }
  },
}
