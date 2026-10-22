import { cn } from '@/lib/cn'
import { IconX } from '@tabler/icons-react'
import * as RadixDialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

export function Dialog({ open, onOpenChange, title, description, children, footer }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ink/35 backdrop-blur-[3px]" />
        <RadixDialog.Content
          className={cn(
            'fixed z-50 flex flex-col bg-surface shadow-lift focus:outline-none',
            'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-sheet',
            'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[85dvh] sm:w-[min(34rem,92vw)]',
            'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-sheet sm:ring-1 sm:ring-border',
          )}
        >
          <div className="flex justify-center pt-3 sm:hidden" aria-hidden="true">
            <span className="h-1 w-10 rounded-full bg-border-strong" />
          </div>

          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 sm:px-6 sm:pt-6">
            <div className="min-w-0">
              <RadixDialog.Title className="font-serif text-xl leading-tight font-medium tracking-tight text-ink sm:text-2xl">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="mt-1.5 text-sm leading-relaxed text-muted">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              aria-label="Close"
              className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-subtle transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <IconX size={18} stroke={1.75} aria-hidden />
            </RadixDialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
            {children}
          </div>

          {footer && (
            <div className="flex justify-end gap-2 border-t border-border bg-surface px-5 pt-3 pb-safe sm:px-6 sm:pb-4">
              {footer}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
