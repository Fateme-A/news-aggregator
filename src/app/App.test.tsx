import { useDataMode } from '@/store/data-mode'
import { usePreferences } from '@/store/preferences'
import { mockApi } from '@/test/mock-api'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

function renderApp() {
  // A fresh client per test so one test's cache cannot satisfy another's query.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

/** The feed renders one <li> per article. */
function articleItems() {
  return screen.queryAllByRole('listitem')
}

beforeEach(() => {
  localStorage.clear()
  usePreferences.getState().reset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('renders a merged feed from all three sources', async () => {
    const { requests } = mockApi()
    renderApp()

    await waitFor(() => expect(articleItems().length).toBeGreaterThan(0))

    // One request per source, fanned out rather than chained.
    expect(requests.some((url) => url.includes('/api/guardian/'))).toBe(true)
    expect(requests.some((url) => url.includes('/api/nyt/'))).toBe(true)
    expect(requests.some((url) => url.includes('/api/newsapi/'))).toBe(true)

    // Scope to the feed: "The Guardian" also labels the source checkbox.
    const feed = within(screen.getByRole('main'))
    expect(feed.getAllByText('The Guardian').length).toBeGreaterThan(0)
    // NewsAPI contributes articles badged with their original outlet, not "NewsAPI",
    // which is what makes the merged feed look like an aggregator.
    expect(feed.getAllByText('The New York Times').length).toBeGreaterThan(0)
  })

  it('orders the feed newest first', async () => {
    mockApi()
    renderApp()

    await waitFor(() => expect(articleItems().length).toBeGreaterThan(1))

    const times = screen
      .getAllByRole('listitem')
      .map((item) => within(item).getByRole('time' as never) as HTMLTimeElement | undefined)
      .map((el) => el?.getAttribute('datetime'))
      .filter((value): value is string => Boolean(value))
      .map((value) => Date.parse(value))

    const sorted = [...times].sort((a, b) => b - a)
    expect(times).toEqual(sorted)
  })

  describe('search', () => {
    it('debounces typing into a single request per source', async () => {
      const user = userEvent.setup()
      const { requests } = mockApi()
      renderApp()

      await waitFor(() => expect(articleItems().length).toBeGreaterThan(0))
      const initialCount = requests.length

      await user.type(screen.getByLabelText(/search articles/i), 'climate')

      // The debounce must collapse seven keystrokes into one round of requests —
      // the NYT allows only five requests per minute.
      await waitFor(
        () => {
          expect(requests.some((url) => url.includes('q=climate'))).toBe(true)
        },
        { timeout: 2000 },
      )

      const newRequests = requests.length - initialCount
      expect(newRequests).toBeLessThanOrEqual(3)
    })

    it('passes the keyword through to every selected source', async () => {
      const user = userEvent.setup()
      const { requests } = mockApi()
      renderApp()

      await waitFor(() => expect(articleItems().length).toBeGreaterThan(0))
      await user.type(screen.getByLabelText(/search articles/i), 'climate')

      await waitFor(
        () => {
          expect(requests.filter((url) => url.includes('climate')).length).toBeGreaterThanOrEqual(3)
        },
        { timeout: 2000 },
      )
    })
  })

  describe('source filtering', () => {
    it('stops querying a source when it is deselected', async () => {
      const user = userEvent.setup()
      const { requests } = mockApi()
      renderApp()

      await waitFor(() => expect(articleItems().length).toBeGreaterThan(0))

      await user.click(screen.getByRole('checkbox', { name: /the guardian/i }))

      await waitFor(() => {
        expect(usePreferences.getState().sources).toContain('guardian')
      })

      const countAfter = requests.filter((url) => url.includes('/api/guardian/')).length
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(requests.filter((url) => url.includes('/api/guardian/')).length).toBe(countAfter)
    })

    it('prompts to pick a source when every source is deselected', async () => {
      const user = userEvent.setup()
      mockApi()
      renderApp()

      await waitFor(() => expect(articleItems().length).toBeGreaterThan(0))

      // NewsAPI's accessible name also carries its capability hint.
      for (const name of [/the guardian/i, /the new york times/i, /newsapi/i]) {
        await user.click(screen.getByRole('checkbox', { name }))
      }

      expect(await screen.findByText(/no sources selected/i)).toBeInTheDocument()
    })
  })

  describe('date filtering', () => {
    it('sends the selected range to the providers in their own formats', async () => {
      const user = userEvent.setup()
      const { requests } = mockApi()
      renderApp()

      await waitFor(() => expect(articleItems().length).toBeGreaterThan(0))

      await user.type(screen.getByLabelText('From'), '2026-01-01')

      await waitFor(
        () => {
          // The Guardian takes ISO dates…
          expect(requests.some((url) => url.includes('from-date=2026-01-01'))).toBe(true)
          // …while the NYT requires YYYYMMDD. Both come from one domain value.
          expect(requests.some((url) => url.includes('begin_date=20260101'))).toBe(true)
        },
        { timeout: 2000 },
      )
    })

    it('leaves explore dates behind when switching to the personalised feed', async () => {
      const user = userEvent.setup()
      usePreferences.getState().toggleCategory('technology')
      const { requests } = mockApi()
      renderApp()

      await waitFor(() => expect(articleItems().length).toBeGreaterThan(0))
      await user.type(screen.getByLabelText('From'), '2026-01-01')

      await waitFor(() => {
        expect(requests.some((url) => url.includes('from-date=2026-01-01'))).toBe(true)
      })

      const beforeSwitch = requests.length
      await user.click(screen.getByRole('button', { name: /my feed/i }))

      await waitFor(() => expect(requests.length).toBeGreaterThan(beforeSwitch))
      const personalised = requests.slice(beforeSwitch)
      expect(personalised.some((url) => url.includes('technology'))).toBe(true)
      expect(personalised.some((url) => url.includes('from-date='))).toBe(false)
      expect(personalised.some((url) => url.includes('begin_date='))).toBe(false)
    })
  })

  describe('graceful degradation', () => {
    it('shows a notice for a failed source but still renders the others', async () => {
      mockApi({ failing: ['newsapi'] })
      renderApp()

      await waitFor(() => expect(articleItems().length).toBeGreaterThan(0))

      // The rate-limit message surfaces…
      expect(await screen.findByText(/rate limit/i)).toBeInTheDocument()
      // …and the working sources still produced a feed.
      expect(articleItems().length).toBeGreaterThan(0)
    })

    it('shows a distinct error state when every source fails', async () => {
      mockApi({ failing: ['guardian', 'nyt', 'newsapi'] })
      renderApp()

      expect(await screen.findByText(/could not load any articles/i)).toBeInTheDocument()
    })
  })

  describe('preferences', () => {
    it('persists preferred authors across a remount', async () => {
      const user = userEvent.setup()
      mockApi()
      const { unmount } = renderApp()

      await waitFor(() => expect(articleItems().length).toBeGreaterThan(0))

      await user.click(screen.getByRole('button', { name: /personalise/i }))
      await user.type(await screen.findByLabelText(/add an author/i), 'Fiona Harvey')
      await user.click(screen.getByRole('button', { name: /^add$/i }))

      expect(await screen.findByText('Fiona Harvey')).toBeInTheDocument()

      unmount()
      renderApp()

      // Zustand rehydrates from localStorage, so the choice survives a reload.
      await waitFor(() => {
        expect(usePreferences.getState().authors).toContain('Fiona Harvey')
      })
    })

    it('switches to the personalised feed on demand', async () => {
      const user = userEvent.setup()
      mockApi()
      renderApp()

      await waitFor(() => expect(articleItems().length).toBeGreaterThan(0))

      await user.click(screen.getByRole('button', { name: /my feed/i }))

      expect(await screen.findByText(/showing your personalised feed/i)).toBeInTheDocument()
      expect(usePreferences.getState().mode).toBe('my-feed')
    })
  })

  describe('browsing mode', () => {
    it('loads the next page when infinite scroll is selected', async () => {
      const user = userEvent.setup()
      class ImmediateObserver {
        constructor(private readonly callback: IntersectionObserverCallback) {}
        observe() {
          this.callback(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          )
        }
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return []
        }
      }
      vi.stubGlobal('IntersectionObserver', ImmediateObserver)

      const { requests } = mockApi()
      renderApp()

      await waitFor(() => expect(articleItems().length).toBeGreaterThan(0))
      const firstPage = requests.length

      await user.click(screen.getByRole('button', { name: 'Infinite' }))

      await waitFor(() => {
        expect(requests.some((url) => /[?&]page=2(?:&|$)/.test(url))).toBe(true)
      })
      expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
      expect(requests.length).toBeGreaterThan(firstPage)

      await user.click(screen.getByRole('button', { name: 'Pages' }))
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
      expect(usePreferences.getState().browseMode).toBe('pages')
    })
  })

  describe('live and demo data', () => {
    it('serves the recorded sample without calling the network in demo mode', async () => {
      useDataMode.getState().setPreference('demo')
      const { requests } = mockApi()
      renderApp()

      await waitFor(() => expect(articleItems().length).toBeGreaterThan(0))

      expect(requests).toHaveLength(0)
      expect(screen.getByText(/no requests are sent to the news apis/i)).toBeInTheDocument()
      // The sample is a single recorded page, so there is nothing to page into.
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    })

    it('stops calling the providers after switching from live to demo', async () => {
      const user = userEvent.setup()
      const { requests } = mockApi()
      renderApp()

      await waitFor(() => expect(articleItems().length).toBeGreaterThan(0))
      const liveRequests = requests.length

      await user.click(screen.getByRole('button', { name: 'Demo' }))

      expect(await screen.findByText(/no requests are sent to the news apis/i)).toBeInTheDocument()
      expect(requests).toHaveLength(liveRequests)
      expect(useDataMode.getState().preference).toBe('demo')
    })
  })
})
