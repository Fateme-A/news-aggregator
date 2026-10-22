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
docker run --rm -p 8080:8080 --env-file .env.local newsstand
```

Open <http://localhost:8080>.

Keys are read at **container start**, not at build time — the image contains no credentials and can
be rebuilt or shared without leaking them. To pass them individually instead of via `--env-file`:

```bash
docker run --rm -p 8080:8080 \
  -e GUARDIAN_KEY=… -e NYT_KEY=… -e NEWSAPI_KEY=… \
  newsstand
```

Or with Compose:

```bash
docker compose up --build     # reads .env.local automatically
```

**Without any keys it still runs.** Leave `.env.local` blank and every provider serves its recorded
sample; the header strip says so, per provider, and names the reason.

## Local development

```bash
npm install
cp .env.example .env.local    # fill in the three keys
npm run dev                   # http://localhost:5173
```

| Script               | Purpose                                      |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Dev server with the API proxy                |
| `npm run build`      | Typecheck then produce the production bundle |
| `npm run test`       | Vitest suite (99 tests across 9 files)       |
| `npm run test:watch` | Vitest in watch mode                         |
| `npm run lint`       | ESLint — clean, no warnings                  |
| `npm run format`     | Prettier                                     |

---

## Why these three sources

innoscripta's brief lists seven. Only three are actually usable today:

| Listed source                      | Status                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| NewsAPI (#1) and NewsAPI.org (#7)  | The same service, listed twice                                                         |
| OpenNews                           | `opennews.org` is a journalism nonprofit; `api.opennews.org` does not resolve          |
| NewsCred                           | Absorbed into Optimizely; `newscred.com` redirects there and the public API is retired |
| BBC News                           | No public API — BBC's own API is internal. RSS only                                    |
| **The Guardian, NYT, NewsAPI.org** | **Live, documented, free tiers**                                                       |

Their verified free-tier limits, which shaped the architecture:

|                     | Guardian                            | NYT                                | NewsAPI.org                       |
| ------------------- | ----------------------------------- | ---------------------------------- | --------------------------------- |
| Quota               | 5,000/day, 12/sec                   | 500/day, **5/min**                 | **100/day**                       |
| Freshness           | Real time                           | Real time                          | 24-hour delay                     |
| Archive             | 1999→                               | 1851→                              | 1 month                           |
| CORS                | `*`                                 | `*`                                | **None — localhost only**         |
| Server-side filters | keyword, date, section, contributor | keyword, date **only** (see below) | keyword + date, _or_ one category |

## What each provider will actually filter

This is the single most important thing I learned building against these APIs, and it drives the
design. **Two of the three cannot apply the filters their documentation advertises**, and both fail
silently — an unfiltered or empty result set looks exactly like a legitimate one.

### The NYT `fq` parameter returns nothing

Article Search documents a Lucene `fq` for filtering by news desk, section and byline. Measured
against the live API with a valid key, same minute, HTTP 200 on every call:

```
q=climate                              →  10,000 hits
q=climate & fq=news_desk:("Climate")   →       0 hits, docs: null
fq=news_desk:("Foreign")               →       0 hits   (desk is present in the data)
fq=section_name:("World")              →       0 hits
fq=document_type:("article")           →       0 hits   (trivially true filter)
fq=glocations:("Iraq")                 →       0 hits   (NYT's own documentation example)
```

Any `fq` empties the result set, including filters that cannot possibly match nothing. Sending it
would drop the NYT out of every filtered feed. So the adapter does not send it: `nytimesSource`
declares `categoryFilter: false` and `authorFilter: false`, and those filters are applied in the
browser instead. `begin_date`/`end_date` are unaffected and still go upstream.

### NewsAPI splits filters across two incompatible endpoints

|            | `/everything`           | `/top-headlines`     |
| ---------- | ----------------------- | -------------------- |
| keyword    | yes, full archive       | yes, headlines only  |
| category   | **no parameter at all** | yes, one at a time   |
| date range | yes                     | **silently ignored** |

A keyword therefore cannot be allowed to decide the endpoint. If a category is selected the request
goes to `/top-headlines` and the keyword rides along; the corpus is smaller, but a narrow correct
result beats a broad wrong one. The date range is then applied in the browser, and if more than one
category is selected the UI says that NewsAPI contributed only the first — that is missing coverage,
not a filter the browser can re-apply.

## Architecture

### The `NewsSource` port

Every provider implements one interface (`src/domain/news-source.ts`). Nothing outside
`src/sources/<provider>/` knows any provider's wire format.

```
src/
  domain/          Framework-agnostic contracts — no React, no fetch
    article.ts       Article, Category, SourceId
    query.ts         ArticleQuery, ArticlePage, cache keys
    news-source.ts   NewsSource port · SourceCapabilities · FetchContext · NewsSourceError
  sources/
    registry.ts      The single extension point
    http.ts          Shared fetch: timeout, cancellation, status→error mapping
    demo.ts          Recorded-sample delivery and the rate-limit circuit breaker
    guardian/        adapter · mapper · types   (same shape for each provider)
    nytimes/
    newsapi/
  samples/         Recorded provider responses — production data, borrowed by the tests
  hooks/
    useArticles.ts   Fan out across sources, merge, dedupe, client-side fallbacks
    useFeedQuery.ts  Everything that decides *what to ask for* (Explore vs My Feed)
  features/          search · feed · preferences · data-mode
  store/             Persisted preferences, theme, data mode (Zustand)
  lib/               dedupe · dates · text · cn
```

**Adding a fourth provider** means writing one folder, appending one line to
`src/sources/registry.ts`, and adding its upstream to the two proxy tables (`vite.config.ts` and
`nginx.conf.template`). No hook, feature or component changes. The proxy tables are the honest
caveat here: they are the one place the open/closed property does not hold, because dev and
production route the same URLs through different software.

### `SourceCapabilities` is a function of the query

```ts
capabilities(query: ArticleQuery): SourceCapabilities
```

It takes the query because for two of the three providers the honest answer depends on what else was
asked for — NewsAPI supports a date range on `/everything` and not on `/top-headlines`, so the same
provider answers differently for two queries that differ only by category. A static boolean could
only have been right about one of them.

Every `false` is then honoured by `applyClientSideFilters` in `useArticles`, which re-applies that
predicate in the browser. The flags are behaviour, not documentation: if the category flag were
ignored, the NYT would contribute off-category articles to every filtered feed, and a test asserts
that it does not.

Where a provider simply does not have the articles — NewsAPI's one-category-per-request limit —
`capabilities` returns a `caveat` instead, and the UI states it rather than leaving the feed looking
mysteriously thin.

### How the brief's guidelines map to the code

- **Single responsibility** — each adapter handles one provider; `http.ts` owns transport; mappers
  own normalisation; `useFeedQuery` owns what to ask for; `useArticles` owns orchestration.
- **Open/closed** — the registry is the extension point, with the proxy-table caveat above.
- **Liskov** — adapters are interchangeable behind `NewsSource`; `useArticles` never branches on
  which provider it is talking to, only on what that provider says it can do.
- **Interface segregation** — `SourceCapabilities`, as above.
- **Dependency inversion** — features depend on the `NewsSource` abstraction, never on a concrete
  API. The transport layer likewise takes a `FetchContext` rather than reading a store, so
  `sources/` contains no application state and can be tested by passing a value.
- **DRY** — one canonical `Article`, one canonical `Category` vocabulary, one HTTP layer. Each
  mapper holds a single category table and _derives_ its reverse lookup, so the two directions
  cannot drift apart (a test asserts this).
- **KISS** — no global state manager for server data, no custom cache, no hand-rolled pagination
  accumulator.

### Rate limits drove four decisions

The NYT's 5 requests/minute and NewsAPI's 100/day are the tightest constraints in the project:

1. **Debounced search** (400 ms) — one request per settled keyword, not per keystroke.
2. **Long cache windows** — `staleTime` 5 min, `gcTime` 30 min, no refetch on window focus.
3. **No retry on 4xx** — retrying a 429 or a rejected key only spends more of the budget.
4. **A shared cache in nginx** — the client cache is per tab, which does nothing for a second tab, a
   refresh, or a second reader. `proxy_cache` holds responses for five minutes, matching `staleTime`
   so both layers expire together, and its key excludes the credential so everyone shares one entry.

### Infinite scroll is not a second data path

Browsing by pages asks for page _N_. Infinite scroll asks for pages _1…N_. Every page but the newest
is already in the TanStack Query cache, so re-requesting them costs nothing and no request leaves the
browser.

That is the whole mechanism. There is no accumulator in component state, no refs mirroring state, and
no effect to keep them in step — the rendered list is derived from the cache, so it cannot drift out
of sync with it. Scrolling is capped at 25 pages, and the UI says so when you reach it rather than
silently stopping.

### Live data and the demo sample

The header strip offers **Auto**, **Live** and **Demo**. Auto is the default, and you can always get
back to it.

`GET /api/status` reports which keys are configured (booleans only — the keys stay on the server).
Auto then:

- calls a provider when its key is set;
- serves that provider's recorded sample, with no request, when the key is blank;
- if a live call comes back rate-limited or rejected, substitutes the same sample, says why, and does
  not call that provider again until the mode is switched.

Demo never calls the news APIs. Live always does, and a failure stays a failure. The sample is the
recorded set under `src/samples/` — one page per provider endpoint. Keyword, category, date and
author are applied to that page in the browser, so a search only shows sample stories that match; it
cannot find anything outside the recording. The strip names every provider that is on the sample, so
those stories are never presented as live.

### Why a proxy

The browser only ever calls same-origin `/api/<source>/…` paths:

- **NewsAPI.org sends no CORS headers at all** and permits localhost origins only, so a deployed
  page cannot call it directly.
- **Keys stay server-side.** They are never in the JS bundle, and never visible in DevTools.

The same paths work in both environments — dev via Vite's `server.proxy` (`vite.config.ts`),
production via nginx (`nginx.conf.template`) — so the client has exactly one code path.

In production each of the three endpoints the app actually calls is matched **exactly**. A prefix
match would make the container an open relay: anyone who could reach it could spend the key on any
path those hosts expose. Anything else under `/api/` returns 404.

### Graceful degradation

`useArticles` issues **one query per source per page** rather than one combined query. A rate-limited
or failing provider surfaces as a notice while the others still render. Only when _every_ source
fails does the page show an error state.

## Testing

```bash
npm run test
```

99 tests across 9 files.

- **Mappers** are tested against **recorded live API responses** (`src/samples/`), not hand-written
  guesses. This caught two real discrepancies: the NYT's current `multimedia` field is an object of
  renditions with absolute URLs rather than the array of relative paths most documentation
  describes, and `response.docs` is `null` — not `[]` — on a zero-hit query, which is why the wire
  type says `NytDoc[] | null`.
- **Adapters** assert the exact upstream URL built from a given `ArticleQuery` — including
  NewsAPI's switch between `/everything` and `/top-headlines`, which callers never see, and the
  absence of any `fq` on NYT requests.
- **Filters are asserted on the results, not just the request.** Selecting a category must remove
  off-category articles from the rendered feed, including from the provider that cannot filter
  upstream. Asserting only the outgoing URL cannot distinguish a provider that filtered from one
  that ignored the filter, and that gap is exactly where two silent bugs lived.
- **The fake honours its parameters.** `src/test/mock-api.ts` applies `section`, `q`, dates and
  contributor tags the way each provider applies them upstream — and deliberately ignores `fq`,
  because the real API does. A fake that returns the same page whatever it is asked makes every
  filter test pass by accident.
- **Dedupe** covers the same story arriving from two providers via different URLs and titles, and
  the inverse: a recurring headline months apart is _not_ one story.
- **App** exercises search debouncing, every filter, per-source failure, the Auto/Live/Demo
  round-trip, and preference persistence through the real adapters, with only `fetch` replaced.

The samples double as the data Demo mode serves, so UI work never spends NewsAPI's 100-request daily
budget. They live under `src/samples/` rather than in a test folder because production owns them;
the tests borrow them.

## Design system

The visual identity is "newsroom desk": a cool paper ground, navy ink, one press-blue accent, and a
serif (Fraunces) reserved for headlines so the product reads as a publication rather than a
dashboard.

Everything is defined as tokens in `src/index.css` and consumed as Tailwind utilities, so a change
to the palette, the radius rhythm or the elevation scale is a one-file edit:

- **Surfaces** `canvas` → `surface` → `surface-muted`, back to front.
- **Radii** three steps tied to roles — `rounded-field` (controls), `rounded-card` (cards, panels),
  `rounded-sheet` (dialogs).
- **Elevation** `shadow-subtle` / `shadow-card` / `shadow-lift`, navy-tinted rather than neutral
  grey so cards sit on the cool paper ground instead of floating above a different one.

Dark mode rewrites the same tokens under `html.dark`, so no component carries a second set of
classes. An inline script in `index.html` applies the stored choice before first paint, so there is
no flash of the wrong theme.

Fonts are **self-hosted** (`src/fonts.css`, `public/fonts`, Latin and Latin-Extended subsets only).
Linking them from Google would make an otherwise self-contained container depend on a third-party
host at runtime, and behind a restrictive network both faces would fall back silently.

Shared primitives live in `src/components/ui/`: `Button`, `Chip`, `Toggle`, `SegmentedControl` and
`Dialog`. `Chip` in particular was extracted because the filter panel, the preferences dialog and
the mobile category rail each had their own copy of the same class list.

## Mobile

Mobile is treated as its own layout rather than a narrowed desktop:

- **The header is one wrapping flex row, not two headers.** Below `lg` the search wraps onto its own
  full-width line beneath the brand and the icon buttons; from `lg`, `order` utilities slot it
  between them for a single compact row. Every control is a single DOM node at every width, so the
  two presentations cannot drift apart.
- **A swipeable category rail** (`src/features/search/CategoryRail.tsx`) appears only below `lg`. On
  desktop the categories live in the sidebar; on a phone that sidebar is behind a sheet, so the
  most-used filter would otherwise cost two taps. The rail is bled to the viewport edges so chips run
  off-screen — signalling scrollability — while scrolling inside its own container.
- **Controls reorder by width.** On a phone the mode switch and category rail group together and the
  result count sits directly above the results; from `lg` the count moves up beside the switch.
- **Dialogs are bottom sheets below `sm`**, with a grab handle, a body that scrolls under a pinned
  footer, and padding that clears the iOS home indicator.
- **The filter panel sizes itself with a container query, not a media query**, because it is ~232px
  wide in the sidebar but ~335px inside the sheet. Keying off the viewport gave two crushed date
  inputs on desktop and two needlessly stacked ones on a phone — exactly backwards.
- **Touch targets** are at least 44px below `lg` — including the Auto/Live/Demo and Pages/Infinite
  tracks, which drop to 32px only from `lg`, where a precise cursor is available.
- Search inputs are 16px on mobile specifically, below which iOS Safari zooms the viewport on focus.

Measured in headless Chromium at 320 / 375 / 390 / 430 / 768 / 1024 / 1280 by walking the rendered
DOM: `scrollWidth === clientWidth` at every width (no horizontal scroll), and no interactive element
below 40px tall under `lg`.

## Accessibility

- One `<h1>`, a skip link to the feed, and real landmarks (`header`, `main`, `aside`, `nav`).
- Real `<input type="checkbox">` elements and Radix dialogs, so focus trapping, Escape handling and
  screen-reader semantics come for free. Every filter is a `<button>` with `aria-pressed`.
- Visible focus rings throughout; `prefers-reduced-motion` disables transitions and card hover lifts.
- Article summaries are stripped of HTML rather than rendered — third-party content never reaches
  `dangerouslySetInnerHTML`.
- Cards use an `::after` overlay link so the whole card is clickable without nesting interactive
  elements or duplicating the headline for screen readers.
- Filters that were applied in the browser rather than upstream are disclosed in text, not hidden.

## Known limitations

- **Free tiers are non-commercial / development-only.** NewsAPI's free plan explicitly forbids
  staging and production use; this project is an evaluation exercise and stays within that.
- **The NYT cannot filter by category or author** on the free tier, for the reason measured above,
  so those are applied in the browser — which means they narrow the ten documents that page
  returned, rather than searching the whole archive for matches.
- **NewsAPI returns one category per request**, so a multi-category selection gets that provider's
  first category only. The UI says which.
- **NewsAPI articles are up to 24 hours old** on the free tier, so its items sort below the other
  two in a recency-ordered feed.
- **Category mapping is lossy by design.** Providers' taxonomies are mapped onto NewsAPI's seven
  canonical categories; unmapped sections fall back to `general`.
- **Responses are typed, not validated.** The wire types are hand-written from recorded live
  responses and the adapters are defensive about missing fields, but nothing parses the payload at
  runtime. `/api/status` is the exception — it is validated, because it decides whether to spend
  quota. For a production system I would validate the provider payloads too.
- **The dev proxy prefix-matches** where nginx matches each endpoint exactly. It binds to localhost
  and never ships, so it is not worth the duplication; the production path is the one that is locked
  down.
- Pagination is per-source and page-based. Because sources are merged and deduped after fetching,
  a page may contain slightly fewer than `pageSize × sources` articles.
