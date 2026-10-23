/** Guardian Content API wire format, taken from a recorded response rather than the docs. */

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
