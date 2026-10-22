import { formatDistanceToNowStrict, isValid, parseISO } from 'date-fns'

/** `YYYY-MM-DD` for today, for use as a date-input max. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * "3 hours ago" for recent items, an absolute date beyond a week.
 *
 * Relative times read better in a feed, but stop being useful once an article is
 * old — and the NYT archive reaches back to 1851.
 */
export function formatRelativeDate(iso: string): string {
  const date = parseISO(iso)
  if (!isValid(date)) return ''

  const ageMs = Date.now() - date.getTime()
  const weekMs = 7 * 24 * 60 * 60 * 1000

  if (ageMs < 0 || ageMs > weekMs) {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return `${formatDistanceToNowStrict(date)} ago`
}
