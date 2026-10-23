/**
 * NYT Article Search v2 wire format.
 *
 * Derived from a recorded live response (`src/samples/nyt-search.json`).
 * Note that the current shape differs from much of the published documentation:
 * `multimedia` is an object keyed by rendition (not an array of path fragments),
 * its URLs are already absolute, and pagination metadata lives under
 * `response.metadata` rather than `response.meta`.
 */

export interface NytMultimediaRendition {
  url: string
  width?: number
  height?: number
}

export interface NytMultimedia {
  caption?: string
  credit?: string
  default?: NytMultimediaRendition
  thumbnail?: NytMultimediaRendition
}

export interface NytDoc {
  _id: string
  web_url: string
  snippet?: string
  abstract?: string
  lead_paragraph?: string | null
  pub_date: string
  news_desk?: string
  section_name?: string
  source?: string
  byline?: { original?: string | null } | null
  headline?: { main?: string; kicker?: string | null; print_headline?: string }
  multimedia?: NytMultimedia | null
}

export interface NytSearchResponse {
  status: string
  /** `docs` is `null`, not `[]`, when a query matches nothing. */
  response?: {
    docs: NytDoc[] | null
    metadata?: { hits?: number; offset?: number; time?: number } | null
  } | null
}
