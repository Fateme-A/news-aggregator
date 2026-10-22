import { CATEGORY_ICONS, SOURCE_ICONS } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Dialog } from '@/components/ui/Dialog'
import { Section } from '@/components/ui/Section'
import { Toggle } from '@/components/ui/Toggle'
import { CATEGORIES, CATEGORY_LABELS } from '@/domain/article'
import { useAuthorSuggestions } from '@/features/preferences/use-author-suggestions'
import { normaliseAuthor } from '@/lib/text'
import { SOURCES } from '@/sources/registry'
import { usePreferences } from '@/store/preferences'
import { IconPlus, IconX } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'

interface PreferencesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PreferencesDialog({ open, onOpenChange }: PreferencesDialogProps) {
  // Selectors, not the whole store: an unselected `usePreferences()` re-renders
  // on every unrelated change.
  const sources = usePreferences((state) => state.sources)
  const categories = usePreferences((state) => state.categories)
  const authors = usePreferences((state) => state.authors)
  const toggleSource = usePreferences((state) => state.toggleSource)
  const toggleCategory = usePreferences((state) => state.toggleCategory)
  const addAuthor = usePreferences((state) => state.addAuthor)
  const removeAuthor = usePreferences((state) => state.removeAuthor)
  const reset = usePreferences((state) => state.reset)
  const [authorDraft, setAuthorDraft] = useState('')

  const chosen = new Set(authors.map(normaliseAuthor))
  const suggestions = useAuthorSuggestions(open).filter(
    (name) => !chosen.has(normaliseAuthor(name)),
  )

  function handleAddAuthor(event: FormEvent) {
    event.preventDefault()
    addAuthor(authorDraft)
    setAuthorDraft('')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Personalise your feed"
      description="Saved in this browser and applied whenever My Feed is active."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={reset}>
            Reset
          </Button>
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </>
      }
    >
      <div className="divide-y divide-border">
        <Section title="Preferred sources" first>
          <div className="space-y-1.5">
            {SOURCES.map((source) => (
              <Toggle
                key={source.id}
                icon={SOURCE_ICONS[source.id]}
                label={source.label}
                checked={sources.includes(source.id)}
                onChange={() => toggleSource(source.id)}
              />
            ))}
          </div>
        </Section>

        <Section title="Preferred categories">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <Chip
                key={category}
                icon={CATEGORY_ICONS[category]}
                selected={categories.includes(category)}
                onClick={() => toggleCategory(category)}
              >
                {CATEGORY_LABELS[category]}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Preferred authors">
          <form onSubmit={handleAddAuthor} className="flex gap-2">
            <label htmlFor="author-input" className="sr-only">
              Add an author
            </label>
            <input
              id="author-input"
              value={authorDraft}
              onChange={(event) => setAuthorDraft(event.target.value)}
              placeholder="e.g. Fiona Harvey"
              className="h-11 min-w-0 flex-1 rounded-field bg-surface px-3.5 text-base text-ink ring-1 ring-border ring-inset transition-shadow placeholder:text-subtle focus:ring-accent/40 focus:shadow-focus focus:outline-none sm:text-sm"
            />
            <Button type="submit" disabled={!authorDraft.trim()}>
              Add
            </Button>
          </form>

          {authors.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {authors.map((author) => (
                <li key={author} className="min-w-0">
                  <span className="inline-flex h-9 max-w-full items-center gap-1 rounded-full bg-surface-muted py-1 pr-1 pl-3.5 text-[13px] text-ink ring-1 ring-border ring-inset">
                    <span className="truncate">{author}</span>
                    <button
                      type="button"
                      onClick={() => removeAuthor(author)}
                      aria-label={`Remove ${author}`}
                      className="grid size-6 shrink-0 place-items-center rounded-full text-subtle transition-colors hover:bg-border hover:text-ink"
                    >
                      <IconX size={12} stroke={2.5} aria-hidden />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {suggestions.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-subtle">In the articles you have loaded</p>
              <ul className="flex flex-wrap gap-2">
                {suggestions.map((name) => (
                  <li key={name} className="min-w-0">
                    <Chip icon={IconPlus} onClick={() => addAuthor(name)} className="max-w-full">
                      <span className="truncate">{name}</span>
                    </Chip>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-3 text-xs leading-relaxed text-subtle">
            {authors.length > 0
              ? 'The New York Times and NewsAPI cannot filter by author upstream, so their results are narrowed in the browser.'
              : 'Add an author to narrow My Feed to their work.'}
          </p>
        </Section>
      </div>
    </Dialog>
  )
}
