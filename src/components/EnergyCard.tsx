import { formatPounds, type EnergyUsage } from '../hooks/useEnergy'
import { cn } from '../lib/cn'
import { LiveUsageGauge } from './LiveUsageGauge'

interface EnergyCardProps {
  today: EnergyUsage
  notice: string
  onOpen: () => void
}

export const EnergyCard = ({ today, notice, onOpen }: EnergyCardProps) => (
  <button className="flex h-full min-h-0 w-full items-center gap-3 rounded-md border border-line bg-white px-3 py-2 text-left max-md:h-auto" type="button" onClick={onOpen}>
    <div className="min-w-0 flex-1">
      <span className="font-mono text-xs font-medium tracking-wide text-muted">CAR</span>
      <strong className={cn('mt-1 block truncate font-display text-lg font-bold', today.carConnected ? 'text-gauge-green' : 'text-gauge-red')}>
        {today.carConnected ? 'Connected' : 'Not connected'}
      </strong>
    </div>
    <LiveUsageGauge plain />
    <div className="min-w-0 flex-1 text-right">
      <span className="font-mono text-xs font-medium tracking-wide text-muted">MONTH</span>
      <strong className="mt-1 block truncate font-display text-2xl font-bold tracking-tight text-ink">{formatPounds(today.predictedMonthly)}</strong>
      {today.predictedMonthly == null && notice ? <span className="mt-1 block truncate text-xs text-muted">{notice}</span> : null}
    </div>
  </button>
)
