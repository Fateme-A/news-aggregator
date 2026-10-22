import type { DataPreference, DemoReason, SourceDelivery } from '@/store/data-mode'

const REASON: Record<DemoReason, string> = {
  chosen: 'demo mode is on',
  'missing-key': 'no API key is configured',
  'rate-limited': 'the live API hit its rate limit',
  auth: 'the API key was rejected',
}

function sampleClause(delivery: SourceDelivery): string {
  const reason = delivery.reason ? REASON[delivery.reason] : 'sample articles are in use'
  return `${delivery.label} (${reason})`
}

export function describeDataMode(
  preference: DataPreference,
  deliveries: readonly SourceDelivery[],
  pending: boolean,
): string {
  if (preference === 'demo') {
    return 'Demo — recorded sample articles, narrowed in the browser. No requests are sent to the news APIs.'
  }

  if (preference === 'live') {
    return 'Live — every search is sent to the news APIs.'
  }

  if (pending || deliveries.length === 0) {
    return 'Auto — live results where a key is available, sample articles when a provider is missing or rate-limited.'
  }

  const samples = deliveries.filter((delivery) => delivery.origin === 'demo')
  const live = deliveries.filter((delivery) => delivery.origin === 'live')

  if (samples.length === 0) return 'Live results from the selected sources.'

  const sampleText = samples.map(sampleClause).join('; ')
  if (live.length === 0) return `Sample articles — ${sampleText}.`

  const liveLabels = live.map((delivery) => delivery.label)
  const last = liveLabels.at(-1) ?? 'The remaining sources'
  const liveText =
    liveLabels.length === 1
      ? `${last} is live`
      : `${liveLabels.slice(0, -1).join(', ')} and ${last} are live`

  return `Sample articles for ${sampleText}. ${liveText}.`
}
