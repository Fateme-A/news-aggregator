import { CATEGORY_ICONS, SOURCE_ICONS } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Dialog } from '@/components/ui/Dialog'
import { Toggle } from '@/components/ui/Toggle'
import { CATEGORIES, CATEGORY_LABELS } from '@/domain/article'
import { SOURCES } from '@/sources/registry'
import { usePreferences } from '@/store/preferences'
import { IconX } from '@tabler/icons-react'
import { useState, type FormEvent, type ReactNode } from 'react'

interface PreferencesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PreferencesDialog({ open, onOpenChange }: PreferencesDialogProps) {
  const {
    sources,
    categories,
    authors,
    toggleSource,
    toggleCategory,
    addAuthor,
    removeAuthor,
    reset,
  } = usePreferences()
  const [authorDraft, setAuthorDraft] = useState('')

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
        <Group title="Preferred sources" first>
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
        </Group>

        <Group title="Preferred categories">
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
        </Group>

        <Group title="Preferred authors">
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

          {authors.length > 0 ? (
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
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-subtle">
              NewsAPI cannot filter by author upstream, so its results are narrowed in the browser.
            </p>
          )}
        </Group>
      </div>
    </Dialog>
  )
}

function Group({
  title,
  children,
  first,
}: {
  title: string
  children: ReactNode
  first?: boolean
}) {
  return (
    <section className={first ? 'pb-5' : 'py-5'}>
      <h3 className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-subtle uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}
