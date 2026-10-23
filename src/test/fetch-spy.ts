import { vi } from 'vitest';

/** Spies on `fetch` so adapter tests can assert the upstream URL. */
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

export function requestedUrl(spy: ReturnType<typeof stubFetch>): URL {
  const call = spy.mock.calls[0]
  if (!call) throw new Error('fetch was never called')
  // Relative proxy paths need a base to parse against.
  return new URL(String(call[0]), 'http://localhost')
}
