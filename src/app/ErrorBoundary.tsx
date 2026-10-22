import { Button } from '@/components/ui/Button'
import { usePreferences } from '@/store/preferences'
import { IconAlertCircle } from '@tabler/icons-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Expected failures — a rate-limited provider, a rejected key, an empty result
 * — are modelled as state and rendered as notices. This catches the rest:
 * without it a render-time throw leaves a blank page with no way back.
 *
 * Saved preferences get their own reset because they outlive the session, and
 * so can reproduce a crash on every reload.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Newsstand failed to render.', error, info.componentStack)
  }

  private readonly retry = () => {
    this.setState({ error: null })
  }

  private readonly resetSavedChoices = () => {
    void usePreferences.persist.clearStorage()
    window.location.reload()
  }

  override render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <main className="grid min-h-dvh place-items-center px-6 py-16">
        <div className="flex max-w-md flex-col items-center rounded-card bg-surface px-6 py-12 text-center ring-1 ring-border ring-inset sm:py-16">
          <div
            className="mb-4 grid size-12 place-items-center rounded-full bg-danger/10 text-danger"
            aria-hidden="true"
          >
            <IconAlertCircle size={22} stroke={1.75} />
          </div>

          <h1 className="font-serif text-xl font-medium text-ink sm:text-2xl">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Newsstand stopped unexpectedly. Trying again usually works; if it does not, clearing
            your saved sources, categories and authors will start the app from its defaults.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button variant="primary" onClick={this.retry}>
              Try again
            </Button>
            <Button onClick={this.resetSavedChoices}>Reset saved choices</Button>
          </div>

          <p className="mt-6 max-w-full truncate text-xs text-subtle" title={error.message}>
            {error.message}
          </p>
        </div>
      </main>
    )
  }
}
