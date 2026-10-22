import { formatKwh, formatPounds, type EnergyUsage } from '../hooks/useEnergy'
import { cn } from '../lib/cn'
import { LiveUsageGauge } from './LiveUsageGauge'

interface EnergyCardProps {
  today: EnergyUsage
  notice: string
  onOpen: () => void
}

interface Fact {
  label: string
  value: string
  detail: string
  tone?: string
}

const combined = (left: number | null, right: number | null) => (left == null && right == null ? null : (left ?? 0) + (right ?? 0))

const factsFor = (today: EnergyUsage): Fact[] => {
  const todayCost = combined(today.electric.cost, today.gas.cost)
  const todayKwh = combined(today.electric.kwh, today.gas.kwh)
  const period = today.electric.period === 'today' || today.gas.period === 'today' ? 'Today' : today.electric.period === 'yesterday' ? 'Yesterday' : ''
  return [
    { label: 'Electric', value: formatPounds(today.electric.cost), detail: formatKwh(today.electric.kwh) },
    { label: 'Gas', value: formatPounds(today.gas.cost), detail: formatKwh(today.gas.kwh) },
    { label: 'Today', value: formatPounds(todayCost), detail: [period, formatKwh(todayKwh)].filter((item) => item && item !== '—').join(' · ') },
    { label: '7-day', value: formatPounds(today.averageSpend), detail: today.averageDays > 0 && today.averageDays < 7 ? `${today.averageDays} days` : 'Average' },
    { label: 'Month', value: formatPounds(today.predictedMonthly), detail: 'Forecast' },
    { label: 'Car', value: today.carConnected ? 'Connected' : 'Not connected', detail: 'Pod Point', tone: today.carConnected ? 'text-gauge-green' : 'text-gauge-red' },
  ]
}

export const EnergyCard = ({ today, notice, onOpen }: EnergyCardProps) => {
  const facts = factsFor(today)
  const quiet = today.electric.cost == null && today.gas.cost == null && today.predictedMonthly == null
  return (
    <button className="flex h-full min-h-0 w-full items-center gap-3 rounded-md border border-line bg-white px-3 py-2 text-left max-md:h-auto" type="button" onClick={onOpen}>
      <LiveUsageGauge plain />
      <div className="grid min-w-0 flex-1 grid-cols-3 gap-x-3 gap-y-2">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0">
            <span className="block font-mono text-[10px] font-medium tracking-wide text-muted">{fact.label.toUpperCase()}</span>
            <strong className={cn('block truncate font-display text-lg font-bold leading-tight tracking-tight text-ink', fact.tone)}>{fact.value}</strong>
            <span className="block truncate font-mono text-[10px] text-muted">{fact.detail}</span>
          </div>
        ))}
      </div>
      {quiet && notice ? <span className="sr-only">{notice}</span> : null}
    </button>
  )
}
