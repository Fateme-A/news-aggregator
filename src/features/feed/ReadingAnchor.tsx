import { Component, type ReactNode } from 'react'
import { anchorDrift, findReadingAnchor, type ReadingAnchor as Anchor } from './reading-anchor'

interface ReadingAnchorProps {
  /** A new identity whenever the rendered list changes. */
  items: unknown
  /** True only while a further page of the *same* feed is loading. */
  armed: boolean
  children: ReactNode
}

/**
 * Holds the reader's place when a loaded page merges into the feed.
 *
 * A class because `getSnapshotBeforeUpdate` has no hook equivalent — it is the
 * only point the old layout can still be measured. A cached scroll position
 * cannot stand in: lazy-loaded images resize cards between scroll events, so
 * it would be stale by the time the merge lands.
 */
export class ReadingAnchor extends Component<ReadingAnchorProps> {
  override getSnapshotBeforeUpdate(previous: ReadingAnchorProps): Anchor | null {
    const merging = previous.armed && previous.items !== this.props.items
    return merging ? findReadingAnchor() : null
  }

  override componentDidUpdate(
    _previous: ReadingAnchorProps,
    _state: unknown,
    anchor: Anchor | null,
  ) {
    if (!anchor) return
    const drift = anchorDrift(anchor)
    // Sub-pixel drift is rounding, not movement.
    if (Math.abs(drift) >= 1) window.scrollBy({ top: drift, behavior: 'instant' })
  }

  override render() {
    return this.props.children
  }
}
