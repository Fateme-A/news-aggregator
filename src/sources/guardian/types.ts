/**
 * The Guardian Content API wire format.
 *
 * Hand-written from a recorded live response (`src/test/fixtures/guardian-search.json`)
 * rather than from the docs, so the optionality below reflects what the API
 * actually sends. Nothing outside this folder imports these types.
 */

export interface GuardianTag {
  id: string
  type: string
  webTitle: string
  firstName?: string
  lastName?: string
}

export interface GuardianFields {
  trailText?: string
  byline?: string
  thumbnail?: string
}

export interface GuardianResult {
  id: string
  type: string
  sectionId: string
  sectionName: string
  webPublicationDate: string
  webTitle: string
  webUrl: string
  fields?: GuardianFields
  tags?: GuardianTag[]
}

export interface GuardianSearchResponse {
  response: {
    status: string
    total: number
    pageSize: number
    currentPage: number
    pages: number
    results: GuardianResult[]
  }
}
