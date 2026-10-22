import { describe, expect, it } from 'vitest'
import fixture from '@/samples/guardian-search.json'
import { CATEGORY_TO_SECTIONS, sectionToCategory, sectionsParam, toArticle } from './mapper'
import type { GuardianResult, GuardianSearchResponse } from './types'

const response = fixture as GuardianSearchResponse
const results = response.response.results

describe('guardian mapper', () => {
  it('normalises a real API result into an Article', () => {
    const first = results[0]!
    const article = toArticle(first)

    expect(article.id).toBe(`guardian:${first.id}`)
    expect(article.url).toBe(first.webUrl)
    expect(article.publishedAt).toBe(first.webPublicationDate)
    expect(article.source).toEqual({ id: 'guardian', name: 'The Guardian' })
    expect(article.title.length).toBeGreaterThan(0)
  })

  it('strips the HTML The Guardian embeds in trailText', () => {
    // The recorded fixture genuinely contains `<strong>` in this field, which is
    // why descriptions are sanitised rather than rendered as markup.
    const withMarkup = results.find((r) => r.fields?.trailText?.includes('<'))
    expect(withMarkup, 'fixture should contain an HTML trailText').toBeDefined()

    const article = toArticle(withMarkup!)
    expect(article.description).not.toContain('<')
    expect(article.description).not.toContain('>')
  })

  it('prefers contributor tags over the raw byline', () => {
    const withContributors = results.find((r) => r.tags?.some((tag) => tag.type === 'contributor'))!
    const expected = withContributors
      .tags!.filter((tag) => tag.type === 'contributor')
      .map((tag) => tag.webTitle)
      .join(', ')

    expect(toArticle(withContributors).author).toBe(expected)
  })

  it('falls back to fields.byline when no contributor tags exist', () => {
    const result: GuardianResult = {
      id: 'x/y',
      type: 'article',
      sectionId: 'world',
      sectionName: 'World news',
      webPublicationDate: '2026-01-01T00:00:00Z',
      webTitle: 'Headline',
      webUrl: 'https://example.com/a',
      fields: { byline: 'Jane Doe' },
      tags: [],
    }
    expect(toArticle(result).author).toBe('Jane Doe')
  })

  it('omits author entirely when the provider supplies none', () => {
    const result: GuardianResult = {
      id: 'x/z',
      type: 'article',
      sectionId: 'world',
      sectionName: 'World news',
      webPublicationDate: '2026-01-01T00:00:00Z',
      webTitle: 'Headline',
      webUrl: 'https://example.com/b',
    }
    expect(toArticle(result).author).toBeUndefined()
  })

  describe('category mapping', () => {
    it('maps known sections to their canonical category', () => {
      expect(sectionToCategory('environment')).toBe('science')
      expect(sectionToCategory('football')).toBe('sports')
      expect(sectionToCategory('technology')).toBe('technology')
    })

    it('falls back to general for unmapped sections', () => {
      expect(sectionToCategory('commentisfree')).toBe('general')
      expect(sectionToCategory('not-a-real-section')).toBe('general')
    })

    it('maps every section in the forward table back to the same category', () => {
      // Guards the derived reverse lookup against drifting from the source table.
      for (const [category, sections] of Object.entries(CATEGORY_TO_SECTIONS)) {
        for (const section of sections) {
          expect(sectionToCategory(section)).toBe(category)
        }
      }
    })
  })

  describe('sectionsParam', () => {
    it('is undefined when no category is selected, so the param is omitted', () => {
      expect(sectionsParam([])).toBeUndefined()
    })

    it('joins the sections of several categories with the pipe the API expects', () => {
      expect(sectionsParam(['technology'])).toBe('technology')
      expect(sectionsParam(['sports'])).toBe('sport|football')
      expect(sectionsParam(['technology', 'sports'])).toBe('technology|sport|football')
    })
  })
})
