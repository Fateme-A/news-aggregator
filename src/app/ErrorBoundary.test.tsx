import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function Boom({ throws }: { throws: boolean }): React.ReactElement {
  if (throws) throw new Error('Unknown news source: bbc')
  return <p>The feed</p>
}

beforeEach(() => {
  // React logs the caught error itself; the boundary logs it again on purpose.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders its children while nothing throws', () => {
    render(
      <ErrorBoundary>
        <Boom throws={false} />
      </ErrorBoundary>,
    )

    expect(screen.getByText('The feed')).toBeInTheDocument()
  })

  it('replaces a crashed tree with a recoverable message instead of a blank page', () => {
    render(
      <ErrorBoundary>
        <Boom throws />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument()
    expect(screen.getByText('Unknown news source: bbc')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset saved choices/i })).toBeInTheDocument()
  })

  it('re-renders the tree when the reader retries', async () => {
    const user = userEvent.setup()
    let failing = true

    function Flaky() {
      if (failing) throw new Error('transient')
      return <p>The feed</p>
    }

    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument()

    failing = false
    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(screen.getByText('The feed')).toBeInTheDocument()
  })
})
