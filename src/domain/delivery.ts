/**
 * How a request should be served, and how it actually was.
 *
 * Separate from `news-source.ts` so `query.ts` can describe a page's delivery
 * without the two importing each other.
 */

/** Decided by the caller, never by the transport. */
export type DataMode = 'auto' | 'live' | 'demo'

/** Why the recorded sample was served instead of a live response. */
export type DemoReason = 'chosen' | 'missing-key' | 'rate-limited' | 'auth'

export interface Delivery {
  origin: 'live' | 'demo'
  reason?: DemoReason
}
