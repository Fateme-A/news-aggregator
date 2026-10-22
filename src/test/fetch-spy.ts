import { vi } from 'vitest'

/**
 * Replaces `fetch` with a spy returning a canned JSON body.
 *
 * Adapter tests care about one thing: given an `ArticleQuery`, does the adapter
 * build the right upstream URL? A spy answers that directly, without the
 * indirection of a mock server.
 */
export function stubFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const spy = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      ({
        ok: init.ok ?? true,
        status: init.status ?? 200,
        statusText: 'OK',
        json: async () => body,
      }) as Response,
  )
  vi.stubGlobal('fetch', spy)
  return spy
}

/** The URL the adapter requested, parsed for convenient assertions. */
export function requestedUrl(spy: ReturnType<typeof stubFetch>): URL {
  const call = spy.mock.calls[0]
  if (!call) throw new Error('fetch was never called')
  // Relative proxy paths need a base to parse against.
  return new URL(String(call[0]), 'http://localhost')
}
