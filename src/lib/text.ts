/**
 * Several providers return HTML inside fields we render as plain text
 * (The Guardian's `trailText` contains `<strong>`, for example). We strip rather
 * than render it: article summaries are untrusted third-party content, so they
 * must never reach `dangerouslySetInnerHTML`.
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

/**
 * Normalise an author string for comparison.
 *
 * Providers disagree on byline formatting — the NYT prefixes with `"By "`, the
 * others do not — so author filtering compares normalised forms rather than raw
 * strings.
 */
export function normaliseAuthor(input: string): string {
  return input
    .replace(/^by\s+/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Split a combined byline ("A, B and C") into individual contributor names. */
export function splitByline(byline: string): string[] {
  return byline
    .replace(/^by\s+/i, '')
    .split(/,| and /i)
    .map((name) => name.trim())
    .filter(Boolean)
}

/**
 * "1 category" / "3 categories".
 *
 * Trivial, but it is the kind of detail that makes an interface read as
 * finished — and it appeared in three separate places in the feed header.
 */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
