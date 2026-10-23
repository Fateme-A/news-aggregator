/**
 * Pages are merged into one recency-sorted list, so a new page can land above
 * the card being read. NewsAPI's 24-hour delay is what makes that happen
 * across providers.
 */

const CARD_SELECTOR = '[data-article-id]'
const HEADER_SELECTOR = '[data-sticky-header]'

export interface ReadingAnchor {
  id: string
  top: number
}

function cards(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(CARD_SELECTOR)]
}

function visibleTop(root: ParentNode): number {
  const header = root.querySelector(HEADER_SELECTOR)
  return header ? Math.max(0, header.getBoundingClientRect().bottom) : 0
}

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
