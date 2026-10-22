import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReadingAnchor } from './ReadingAnchor'

/** One card, whose viewport offset the test moves between renders. */
function Feed({ top }: { top: number }) {
  return (
    <ul>
      <li data-article-id="a" ref={(node) => stubRect(node, top)} />
    </ul>
  )
}

function stubRect(node: HTMLElement | null, top: number) {
  if (node) node.getBoundingClientRect = () => ({ top, bottom: top + 200 }) as DOMRect
}

const scrollBy = vi.fn()

beforeEach(() => {
  scrollBy.mockClear()
  vi.stubGlobal('scrollBy', scrollBy)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ReadingAnchor', () => {
  it('scrolls by however far the anchored card moved when a page merges', () => {
    const { rerender } = render(
      <ReadingAnchor items={['a']} armed>
        <Feed top={100} />
      </ReadingAnchor>,
    )

    // A newly merged page pushed the card 640px down the list.
    rerender(
      <ReadingAnchor items={['a', 'b']} armed={false}>
        <Feed top={740} />
      </ReadingAnchor>,
    )

    expect(scrollBy).toHaveBeenCalledWith({ top: 640, behavior: 'instant' })
  })

  it('leaves the viewport alone when no page was in flight', () => {
    const { rerender } = render(
      <ReadingAnchor items={['a']} armed={false}>
        <Feed top={100} />
      </ReadingAnchor>,
    )

    rerender(
      <ReadingAnchor items={['a', 'b']} armed={false}>
        <Feed top={740} />
      </ReadingAnchor>,
    )

    expect(scrollBy).not.toHaveBeenCalled()
  })

  it('leaves the viewport alone when the list did not change', () => {
    const items = ['a']
    const { rerender } = render(
      <ReadingAnchor items={items} armed>
        <Feed top={100} />
      </ReadingAnchor>,
    )

    rerender(
      <ReadingAnchor items={items} armed={false}>
        <Feed top={740} />
      </ReadingAnchor>,
    )

    expect(scrollBy).not.toHaveBeenCalled()
  })

  it('does not scroll when the card stayed put', () => {
    const { rerender } = render(
      <ReadingAnchor items={['a']} armed>
        <Feed top={100} />
      </ReadingAnchor>,
    )

    // Articles appended below the reader move nothing above them.
    rerender(
      <ReadingAnchor items={['a', 'b']} armed={false}>
        <Feed top={100} />
      </ReadingAnchor>,
    )

    expect(scrollBy).not.toHaveBeenCalled()
  })
})
