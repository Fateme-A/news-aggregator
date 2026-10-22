/**
 * Loaded pages are merged into one list sorted by recency, so an arriving page
 * does not simply append — NewsAPI's 24-hour delay puts page 2 of a live
 * provider above page 1 of a lagging one, pushing the card being read down the
 * viewport.
 *
 * Fix: note which card sits below the sticky header and how far down, then
 * scroll by however far it moved once the new list is laid out.
 */

const CARD_SELECTOR = '[data-article-id]'
const HEADER_SELECTOR = '[data-sticky-header]'

export interface ReadingAnchor {
  id: string
  /** Offset from the top of the viewport, in CSS pixels. */
  top: number
}

function cards(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(CARD_SELECTOR)]
}

/** The bottom edge of the sticky header, which covers the top of the viewport. */
function visibleTop(root: ParentNode): number {
  const header = root.querySelector(HEADER_SELECTOR)
  return header ? Math.max(0, header.getBoundingClientRect().bottom) : 0
}

/** The first card not hidden behind the header — what the reader is looking at. */
export function findReadingAnchor(root: ParentNode = document): ReadingAnchor | null {
  const threshold = visibleTop(root)
  for (const card of cards(root)) {
    const { bottom, top } = card.getBoundingClientRect()
    if (bottom > threshold) {
      const id = card.dataset.articleId
      return id ? { id, top } : null
    }
  }
  return null
}

/** How far the anchored card moved, or 0 if a changed filter dropped it. */
export function anchorDrift(anchor: ReadingAnchor, root: ParentNode = document): number {
  const card = cards(root).find((item) => item.dataset.articleId === anchor.id)
  if (!card) return 0
  return card.getBoundingClientRect().top - anchor.top
}
