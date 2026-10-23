import { handleNewsProxy } from './src/server/news-proxy'

export const config = {
  matcher: ['/api/:path*'],
  runtime: 'nodejs',
}

export default function middleware(request: Request): Promise<Response> {
  return handleNewsProxy(request, {
    guardian: process.env.GUARDIAN_KEY ?? '',
    nyt: process.env.NYT_KEY ?? '',
    newsapi: process.env.NEWSAPI_KEY ?? '',
  })
}
