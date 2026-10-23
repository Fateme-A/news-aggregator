import { formatDistanceToNowStrict, isValid, parseISO } from 'date-fns'

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Relative within a week; absolute after that. The NYT archive goes back to 1851. */
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

export function formatDay(iso: string): string {
  const date = parseISO(iso)
  if (!isValid(date)) return iso
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
