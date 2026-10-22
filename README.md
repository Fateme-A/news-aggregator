# Newsstand — News Aggregator

A news aggregator UI built for the innoscripta Frontend Developer case study. It searches and
filters articles across **The Guardian**, **The New York Times** and **NewsAPI.org**, merges them
into one feed, and lets a reader personalise that feed by source, category and author.

React 19 · TypeScript (strict) · Vite · TanStack Query · Zustand · Tailwind CSS · nginx

---

## Quick start with Docker

The only prerequisites are Docker and three free API keys.

```bash
# 1. Get the keys (all free, all self-serve)
#    Guardian  https://open-platform.theguardian.com/access/
#    NYT       https://developer.nytimes.com/   (the API key only — not the secret)
#    NewsAPI   https://newsapi.org/register

# 2. Provide them
cp .env.example .env.local   # then fill in the three values

# 3. Build and run
docker build -t newsstand .
docker run --rm -p 8080:80 --env-file .env.local newsstand
```

Open <http://localhost:8080>.

Keys are read at **container start**, not at build time — the image contains no credentials and can
be rebuilt or shared without leaking them. To pass them individually instead of via `--env-file`:

```bash
docker run --rm -p 8080:80 \
  -e GUARDIAN_KEY=… -e NYT_KEY=… -e NEWSAPI_KEY=… \
  newsstand
```

Or with Compose:

```bash
docker compose up --build     # reads .env.local automatically
```

## Local development

```bash
npm install
cp .env.example .env.local    # fill in the three keys
npm run dev                   # http://localhost:5173
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server with the API proxy |
| `npm run build` | Typecheck then produce the production bundle |
| `npm run test` | Vitest suite (81 tests) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

---

## Why these three sources

innoscripta's brief lists seven. Only three are actually usable today:

| Listed source | Status |
| --- | --- |
| NewsAPI (#1) and NewsAPI.org (#7) | The same service, listed twice |
| OpenNews | `opennews.org` is a journalism nonprofit; `api.opennews.org` does not resolve |
| NewsCred | Absorbed into Optimizely; `newscred.com` redirects there and the public API is retired |
| BBC News | No public API — BBC's own API is internal. RSS only |
| **The Guardian, NYT, NewsAPI.org** | **Live, documented, free tiers** |

Their verified free-tier limits, which shaped the architecture:

| | Guardian | NYT | NewsAPI.org |
| --- | --- | --- | --- |
| Quota | 5,000/day, 12/sec | 500/day, **5/min** | **100/day** |
| Freshness | Real time | Real time | 24-hour delay |
| Archive | 1999→ | 1851→ | 1 month |
| CORS | `*` | `*` | **None — localhost only** |
| Author data | Contributor tags | Structured byline | Often `null` |

## Architecture

### The `NewsSource` port

Every provider implements one interface (`src/domain/news-source.ts`). Nothing outside
`src/sources/<provider>/` knows any provider's wire format.

```
src/
  domain/          Framework-agnostic contracts — no React, no fetch
    article.ts       Article, Category, SourceId
    query.ts         ArticleQuery, ArticlePage, cache keys
    news-source.ts   The NewsSource port + SourceCapabilities + NewsSourceError
  sources/
    registry.ts      The single extension point
    http.ts          Shared fetch: timeout, cancellation, status→error mapping
    guardian/        adapter · mapper · types   (same shape for each provider)
    nytimes/
    newsapi/
  hooks/
    useArticles.ts   Fan out across sources, merge, dedupe, client-side fallbacks
  features/          search · feed · preferences
  store/             Persisted preferences (Zustand)
  lib/               dedupe · dates · text · cn
```

**Adding a fourth provider** means writing one folder and appending one line to
`src/sources/registry.ts`. No hook, feature or component changes.

### How the brief's guidelines map to the code

- **Single responsibility** — each adapter handles exactly one provider; `http.ts` owns transport;
  mappers own normalisation; `useArticles` owns orchestration.
- **Open/closed** — the registry is the only extension point, as above.
- **Liskov** — adapters are interchangeable behind `NewsSource`; `useArticles` never branches on
  which provider it is talking to.
- **Interface segregation** — `SourceCapabilities` declares what each provider can do *server-side*.
  It is load-bearing, not decorative: NewsAPI has no author parameter, so `useArticles` filters its
  results in the browser and the UI says so, rather than silently ignoring the filter.
- **Dependency inversion** — features depend on the `NewsSource` abstraction, never on a concrete API.
- **DRY** — one canonical `Article`, one canonical `Category` vocabulary, one HTTP layer. Each
  mapper holds a single category table and *derives* its reverse lookup, so the two directions
  cannot drift apart (a test asserts this).
- **KISS** — no global state manager for server data, no custom cache, no premature memoisation.

### Rate limits drove three decisions

The NYT's 5 requests/minute and NewsAPI's 100/day are the tightest constraints in the project:

1. **Debounced search** (400 ms) — one request per settled keyword, not per keystroke.
2. **Long cache windows** — `staleTime` 5 min, `gcTime` 30 min, no refetch on window focus.
3. **No retry on 4xx** — retrying a 429 or a rejected key only spends more of the budget.

### Live data and the demo sample

The header strip offers **Auto**, **Live** and **Demo**. Auto is the default.

`GET /api/status` reports which keys are configured (booleans only — the keys stay on the server). Auto then:

- calls a provider when its key is set;
- serves that provider's recorded sample, with no request, when the key is blank;
- if a live call comes back rate-limited or rejected, substitutes the same sample, says why, and does not call that provider again until the mode is switched.

Demo never calls the news APIs. Live always does, and a failure stays a failure. The sample is the fixture set under `src/test/fixtures/` — one recorded page per provider. Keyword, category, date and author are applied to that page in the browser, so a search only shows sample stories that match; it cannot find anything outside the recording. The strip names every provider that is on the sample, so those stories are not presented as live.

### Why a proxy

The browser only ever calls same-origin `/api/<source>/…` paths:

- **NewsAPI.org sends no CORS headers at all** and permits localhost origins only, so a deployed
  page cannot call it directly.
- **Keys stay server-side.** They are never in the JS bundle, and never visible in DevTools.

The same paths work in both environments — dev via Vite's `server.proxy` (`vite.config.ts`),
production via nginx (`nginx.conf.template`) — so the client has exactly one code path. The two
files are the only place a provider's upstream URL appears; keep them in sync when adding a source.

### Graceful degradation

`useArticles` issues **one query per source** rather than one combined query. A rate-limited or
failing provider surfaces as a dismissible notice while the others still render. Only when *every*
source fails does the page show an error state.

## Testing

```bash
npm run test
```

65 tests across six files:

- **Mappers** are tested against **recorded live API responses** (`src/test/fixtures/`), not
  hand-written guesses. This caught a real discrepancy: the NYT's current `multimedia` field is an
  object of renditions with absolute URLs, not the array of relative paths most documentation
  describes.
- **Adapters** assert the exact upstream URL built from a given `ArticleQuery` — including
  NewsAPI's switch between `/everything` and `/top-headlines`, which callers never see.
- **Dedupe** covers the same story arriving from two providers via different URLs and titles.
- **App** exercises search debouncing, source/date filtering, per-source failure, and preference
  persistence through the real adapters, with only `fetch` replaced.

The fixtures are also the demo sample the app serves when a provider is unavailable, so UI work never spends NewsAPI's 100-request daily budget.

## Design system

The visual identity is "editorial paper": a warm off-white ground, ink-black text, one saturated
accent, and a serif (Fraunces) reserved for headlines so the product reads as a publication rather
than a dashboard.

Everything is defined as tokens in `src/index.css` and consumed as Tailwind utilities, so a change
to the palette, the radius rhythm or the elevation scale is a one-file edit:

- **Surfaces** `canvas` → `surface` → `surface-muted`, back to front.
- **Radii** three steps tied to roles — `rounded-field` (controls), `rounded-card` (cards, panels),
  `rounded-sheet` (dialogs).
- **Elevation** `shadow-subtle` / `shadow-card` / `shadow-lift`, warm-tinted rather than neutral grey
  so cards sit on the paper ground instead of floating above a different one.

Shared primitives live in `src/components/ui/`: `Button`, `Chip`, `Toggle`, `SegmentedControl` and
`Dialog`. `Chip` in particular was extracted because the filter panel, the preferences dialog and
the mobile category rail each had their own copy of the same class list.

## Mobile

Mobile is treated as its own layout rather than a narrowed desktop:

- **The header is one wrapping flex row, not two headers.** Below `lg` the search wraps onto its own
  full-width line beneath the brand and the two icon buttons; from `lg`, `order` utilities slot it
  between them for a single compact row. Every control is a single DOM node at every width, so the
  two presentations cannot drift apart.
- **A swipeable category rail** (`features/search/CategoryRail`) appears only below `lg`. On desktop
  the categories live in the sidebar; on a phone that sidebar is behind a sheet, so the most-used
  filter would otherwise cost two taps. The rail is bled to the viewport edges so chips run off-screen
  — signalling scrollability — while scrolling inside its own container.
- **Controls reorder by width.** On a phone the mode switch and category rail group together and the
  result count sits directly above the results; from `lg` the count moves up beside the switch to
  reclaim a line.
- **Dialogs are bottom sheets below `sm`**, with a grab handle, a body that scrolls under a pinned
  footer, and padding that clears the iOS home indicator.
- **The filter panel sizes itself with a container query, not a media query**, because it is ~232px
  wide in the sidebar but ~335px inside the sheet. Keying off the viewport gave two crushed date
  inputs on desktop and two needlessly stacked ones on a phone — exactly backwards.
- **Touch targets** are 44px for primary actions and 40px for chips up to `lg`, dropping to 36px only
  where a precise cursor is available.
- Search inputs are 16px on mobile specifically, below which iOS Safari zooms the viewport on focus.

Verified with headless Chromium at 320 / 375 / 430 / 768 / 1280: **no horizontal scroll and no
undersized touch target at any width**.

## Accessibility

- Real `<input type="checkbox">` elements and Radix dialogs, so focus trapping, Escape handling and
  screen-reader semantics come for free. Every filter is a `<button>` with `aria-pressed`.
- Visible focus rings throughout; `prefers-reduced-motion` disables transitions and card hover lifts.
- Article summaries are stripped of HTML rather than rendered — third-party content never reaches
  `dangerouslySetInnerHTML`.
- Cards use an `::after` overlay link so the whole card is clickable without nesting interactive
  elements or duplicating the headline for screen readers.

## Known limitations

- **Free tiers are non-commercial / development-only.** NewsAPI's free plan explicitly forbids
  staging and production use; this project is an evaluation exercise and stays within that.
- **NewsAPI articles are up to 24 hours old** on the free tier, so its items sort below the other
  two in a recency-ordered feed.
- **NewsAPI cannot filter by author**, which the UI discloses rather than hiding.
- **Category mapping is lossy by design.** Providers' taxonomies are mapped onto NewsAPI's seven
  canonical categories; unmapped sections fall back to `general`.
- Pagination is per-source and page-based. Because sources are merged and deduped after fetching,
  a page may contain slightly fewer than `pageSize × sources` articles.
