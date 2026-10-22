import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Section } from '@/components/ui/Section'
import { describeDataMode } from '@/features/data-mode/lib/describe'
import { useDataMode, type DataPreference, type SourceDelivery } from '@/store/data-mode'
import { usePreferences, type BrowseMode } from '@/store/preferences'

const BROWSE_OPTIONS = [
  { value: 'pages', label: 'Pages' },
  { value: 'infinite', label: 'Infinite' },
] as const satisfies readonly { value: BrowseMode; label: string }[]

const DATA_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'live', label: 'Live' },
  { value: 'demo', label: 'Demo' },
] as const satisfies readonly { value: DataPreference; label: string }[]

const BROWSE_HINT: Record<BrowseMode, string> = {
  pages: 'Move through the feed one page at a time.',
  infinite: 'Load the next page automatically as you reach the end.',
}

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deliveries: readonly SourceDelivery[]
  pending: boolean
  onBrowseModeChange: (mode: BrowseMode) => void
  onDataPreferenceChange: (preference: DataPreference) => void
}

export function SettingsDialog({
  open,
  onOpenChange,
  deliveries,
  pending,
  onBrowseModeChange,
  onDataPreferenceChange,
}: SettingsDialogProps) {
  const browseMode = usePreferences((state) => state.browseMode)
  const preference = useDataMode((state) => state.preference)

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Settings"
      description="How the feed is browsed, and where its articles come from."
      footer={
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      <div className="divide-y divide-border">
        <Section title="Browsing" first>
          <SegmentedControl
            aria-label="Browsing"
            segments={BROWSE_OPTIONS}
            value={browseMode}
            onChange={onBrowseModeChange}
            className="flex w-full"
          />
          <p className="mt-3 text-xs leading-relaxed text-subtle">{BROWSE_HINT[browseMode]}</p>
        </Section>

        <Section title="Article data">
          <SegmentedControl
            aria-label="Article data"
            segments={DATA_OPTIONS}
            value={preference}
            onChange={onDataPreferenceChange}
            className="flex w-full"
          />
          <p className="mt-3 text-xs leading-relaxed text-subtle">
            {describeDataMode(preference, deliveries, pending)}
          </p>
        </Section>
      </div>
    </Dialog>
  )
}
