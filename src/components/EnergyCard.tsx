import { Zap } from 'lucide-react'
import { formatKwh, formatPounds, type EnergyUsage, type FuelReading } from '../hooks/useEnergy'
import { cn } from '../lib/cn'
import { LiveUsageGauge } from './LiveUsageGauge'

interface EnergyCardProps {
  today: EnergyUsage
  notice: string
  onOpen: () => void
}

interface Column {
  label: string
  cost: string
  usage: string
}

const periodLabel = (period: FuelReading['period']) => (period === 'today' ? 'Today' : period === 'yesterday' ? 'Yesterday' : '')

const combinedCost = (electric: FuelReading, gas: FuelReading) => (
  electric.cost == null && gas.cost == null ? null : (electric.cost ?? 0) + (gas.cost ?? 0)
)

const columnsFor = (today: EnergyUsage): Column[] => {
  const total = combinedCost(today.electric, today.gas)
  const columns: Column[] = [
    { label: 'Electric', cost: formatPounds(today.electric.cost), usage: formatKwh(today.electric.kwh) },
    { label: 'Gas', cost: formatPounds(today.gas.cost), usage: formatKwh(today.gas.kwh) },
  ]
  if (total != null) columns.push({ label: 'Total', cost: formatPounds(total), usage: '' })
  if (today.averageSpend != null) columns.push({ label: '7-day', cost: formatPounds(today.averageSpend), usage: '' })
  if (today.predictedMonthly != null) columns.push({ label: 'Month', cost: formatPounds(today.predictedMonthly), usage: '' })
  return columns
}

const columnGrid = (count: number) => {
  if (count >= 5) return 'grid-cols-5'
  if (count === 4) return 'grid-cols-4'
  if (count === 3) return 'grid-cols-3'
  return 'grid-cols-2'
}

export const EnergyCard = ({ today, notice, onOpen }: EnergyCardProps) => {
  const columns = columnsFor(today)
  const sharedPeriod = today.electric.period && today.electric.period === today.gas.period ? periodLabel(today.electric.period) : ''
  const averageDetail = today.averageDays > 0 && today.averageDays < 7 ? `${today.averageDays} ${today.averageDays === 1 ? 'day' : 'days'} so far` : ''
  const caption = [sharedPeriod, averageDetail].filter(Boolean).join(' · ')
  const costSize = columns.length >= 5 ? 'text-xl' : 'text-3xl'
  return (
    <button className="flex h-full w-full flex-col rounded-md border border-line bg-white px-4 py-3 text-left" type="button" onClick={onOpen}>
      <div className="flex items-center gap-2">
        <Zap className="shrink-0 text-sage" size={22} />
        <strong className="text-lg font-bold text-ink">Energy</strong>
        <span className="ml-auto truncate font-mono text-xs text-muted">{caption ? caption.toUpperCase() : 'OCTOPUS'}</span>
        <Connection connected={today.carConnected} />
      </div>
      <div className="mt-3 flex min-h-0 flex-1 gap-2">
        <div className={cn('grid min-h-0 flex-1 gap-2', columnGrid(columns.length))}>
          {columns.map((column) => (
            <div key={column.label} className="flex min-h-0 flex-col items-center justify-center gap-1.5 rounded-md bg-sage-mist px-1 py-3 text-center">
              <span className="font-mono text-xs font-medium tracking-wide text-muted">{column.label.toUpperCase()}</span>
              <strong className={cn('font-display font-bold tracking-tight text-ink', costSize)}>{column.cost}</strong>
              <span className="min-h-5 font-mono text-sm text-ink">{column.usage}</span>
            </div>
          ))}
        </div>
        <LiveUsageGauge />
      </div>
      {today.electric.cost == null && today.gas.cost == null && notice ? <p className="pt-2 text-sm text-muted">{notice}</p> : null}
    </button>
  )
}

const Connection = ({ connected }: { connected: boolean }) => (
  <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-bold tracking-wide', connected ? 'bg-sage text-paper' : 'bg-clay/15 text-clay')}>
    CAR CHARGING {connected ? 'YES' : 'NO'}
  </span>
)
