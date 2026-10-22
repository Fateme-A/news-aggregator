import type { Article } from '@/domain/article'
import { describe, expect, it } from 'vitest'
import { collectAuthors } from './authors'

function article(author: string | undefined, id = author ?? 'none'): Article {
  return {
    id: `guardian:${id}`,
    title: id,
    description: '',
    url: `https://example.com/${encodeURIComponent(id)}`,
    publishedAt: '2026-10-01T00:00:00Z',
    source: { id: 'guardian', name: 'The Guardian' },
    ...(author ? { author } : {}),
  }
}

describe('collectAuthors', () => {
  it('returns nothing when no article carries a byline', () => {
    expect(collectAuthors([article(undefined, 'a'), article(undefined, 'b')])).toEqual([])
  })

  it('orders by how often a contributor appears', () => {
    expect(
      collectAuthors([
        article('Fiona Harvey', 'a'),
        article('Damian Carrington', 'b'),
        article('Fiona Harvey', 'c'),
      ]),
    ).toEqual(['Fiona Harvey', 'Damian Carrington'])
  })

  it('counts the same person once across the providers’ byline formats', () => {
    // The NYT prefixes with "By"; the others do not. Two spellings of one
    // person would otherwise fill two suggestion slots and match the same feed.
    expect(collectAuthors([article('By Fiona Harvey', 'a'), article('Fiona Harvey', 'b')])).toEqual(
      ['Fiona Harvey'],
    )
  })

  it('splits a combined byline into individual contributors', () => {
    expect(collectAuthors([article('Fiona Harvey, Damian Carrington and Jon Watts')])).toEqual([
      'Damian Carrington',
      'Fiona Harvey',
      'Jon Watts',
    ])
  })

  it('drops fragments too short to be a usable filter', () => {
    expect(collectAuthors([article('A. B. Jones and X')])).toEqual(['A. B. Jones'])
  })

  it('breaks ties alphabetically so the list is stable between openings', () => {
    expect(collectAuthors([article('Zoe Adams', 'a'), article('Alan Bell', 'b')])).toEqual([
      'Alan Bell',
      'Zoe Adams',
    ])
  })

  it('honours the limit', () => {
    const many = ['Ann One', 'Ben Two', 'Cat Three', 'Dan Four'].map((name) => article(name, name))
    expect(collectAuthors(many, 2)).toHaveLength(2)
  })
})
