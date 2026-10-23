/**
 * Several providers return HTML in fields rendered as plain text (The
 * Guardian's `trailText`). Summaries are untrusted third-party content, so
 * they are stripped rather than rendered.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Byline formats differ — the NYT prefixes with "By " — so compare normalised forms. */
export function normaliseAuthor(input: string): string {
  return input
    .replace(/^by\s+/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function splitByline(byline: string): string[] {
  return byline
    .replace(/^by\s+/i, '')
    .split(/,| and /i)
    .map((name) => name.trim())
    .filter(Boolean)
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
