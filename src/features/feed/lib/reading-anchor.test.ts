import { afterEach, describe, expect, it } from 'vitest'
import { anchorDrift, findReadingAnchor } from './reading-anchor'

/**
 * jsdom lays nothing out, so the geometry is supplied directly — which is the
 * point: these are the rect comparisons, not the layout engine.
 */
function build(cards: { id: string; top: number; height?: number }[], headerBottom = 80) {
  document.body.innerHTML = `
    <div data-sticky-header></div>
    <ul>
      ${cards.map((card) => `<li data-article-id="${card.id}"></li>`).join('')}
    </ul>
  `

  const header = document.querySelector('[data-sticky-header]')!
  header.getBoundingClientRect = () => ({ bottom: headerBottom }) as DOMRect

  for (const card of cards) {
    const element = document.querySelector(`[data-article-id="${card.id}"]`)!
    const height = card.height ?? 200
    element.getBoundingClientRect = () => ({ top: card.top, bottom: card.top + height }) as DOMRect
  }
}

function reposition(id: string, top: number, height = 200) {
  const element = document.querySelector(`[data-article-id="${id}"]`)!
  element.getBoundingClientRect = () => ({ top, bottom: top + height }) as DOMRect
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('findReadingAnchor', () => {
  it('skips cards hidden behind the sticky header', () => {
    build([
      { id: 'a', top: -400 },
      { id: 'b', top: -150 },
      { id: 'c', top: 60 },
    ])

    // `b` ends at 50, above the header's 80px bottom edge; `c` is the first
    // card the reader can actually see.
    expect(findReadingAnchor()).toEqual({ id: 'c', top: 60 })
  })

  it('anchors a card the header only partly covers', () => {
    build([{ id: 'a', top: -20 }])

    expect(findReadingAnchor()).toEqual({ id: 'a', top: -20 })
  })

  it('returns nothing when the feed is empty', () => {
    build([])

    expect(findReadingAnchor()).toBeNull()
  })

  it('returns nothing when every card is scrolled past', () => {
    build([{ id: 'a', top: -500, height: 100 }])

    expect(findReadingAnchor()).toBeNull()
  })
})

describe('anchorDrift', () => {
  it('measures how far the anchored card moved', () => {
    build([{ id: 'a', top: 100 }])
    const anchor = findReadingAnchor()!

    // A page merged above it pushed it 640px down the viewport.
    reposition('a', 740)

    expect(anchorDrift(anchor)).toBe(640)
  })

  it('is zero when nothing moved', () => {
    build([{ id: 'a', top: 100 }])

    expect(anchorDrift(findReadingAnchor()!)).toBe(0)
  })

  it('is zero when the anchored card is gone, so the viewport is left alone', () => {
    build([{ id: 'a', top: 100 }])
    const anchor = findReadingAnchor()!

    // A changed filter dropped it from the feed.
    build([{ id: 'z', top: 100 }])

    expect(anchorDrift(anchor)).toBe(0)
  })
})
