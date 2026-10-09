import type { ReactNode } from 'react'
import { Flame, Zap } from 'lucide-react'
import { formatKwh, formatPence, formatPounds, type EnergyDay, type EnergyMonth, type EnergyUsage, type FuelReading } from '../hooks/useEnergy'

interface EnergyBoardProps {
  today: EnergyUsage
  week: EnergyDay[]
  months: EnergyMonth[]
  averageMonthly: number | null
  notice: string
}

const dayTotal = (day: EnergyDay) => (day.electricCost == null && day.gasCost == null ? null : (day.electricCost ?? 0) + (day.gasCost ?? 0))

const rowClass = 'grid grid-cols-[6.5rem_1fr_1fr_5.5rem] items-center gap-3 border-t border-line/70'

export const EnergyBoard = ({ today, week, months, averageMonthly, notice }: EnergyBoardProps) => (
  <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden max-md:overflow-auto" aria-label="Energy">
    <h1 className="sr-only">Energy</h1>
    <div className="grid shrink-0 grid-cols-3 gap-4 max-md:grid-cols-1">
      <Meter icon={<Zap size={22} />} label="Electric" reading={today.electric} />
      <Meter icon={<Flame size={22} />} label="Gas" reading={today.gas} />
      <article className="rounded-md border border-line bg-white px-5 py-3">
        <div className="flex min-h-[22px] items-center">
          <span className="font-mono text-xs font-medium tracking-wide text-muted">AVERAGE MONTHLY</span>
        </div>
        <strong className="mt-1 block font-display text-3xl font-bold tracking-tight text-ink">{formatPounds(averageMonthly)}</strong>
        <span className="mt-1 block text-base text-ink">{today.predictionDays} recorded {today.predictionDays === 1 ? 'day' : 'days'}</span>
      </article>
    </div>
    <article className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-line bg-white px-4 py-3">
      <div className="flex shrink-0 items-baseline gap-3">
        <strong className="text-lg font-bold text-ink">Last 7 days</strong>
        {today.points != null ? <span className="ml-auto font-mono text-xs text-muted">{today.points.toLocaleString('en-GB')} Octoplus points</span> : null}
      </div>
      <div className="mt-2 grid min-h-0 flex-1 grid-rows-7">
        {week.map((day) => (
          <div key={day.label} className={rowClass}>
            <span className="font-mono text-sm text-ink">{day.label}</span>
            <span className="truncate text-base text-ink">Electric {formatPounds(day.electricCost)} · {formatKwh(day.electricKwh)}</span>
            <span className="truncate text-base text-ink">Gas {formatPounds(day.gasCost)} · {formatKwh(day.gasKwh)}</span>
            <strong className="text-right font-display text-xl font-bold text-ink">{formatPounds(dayTotal(day))}</strong>
          </div>
        ))}
      </div>
      <div className="mt-1 shrink-0">
        <div className="flex items-baseline py-1">
          <strong className="text-lg font-bold text-ink">By month</strong>
        </div>
        {months.map((month) => (
          <div key={month.label} className={rowClass}>
            <span className="font-mono text-sm leading-tight text-ink">{month.label}<span className="mt-0.5 block text-xs text-muted">{month.complete ? 'Full month' : `${month.days} ${month.days === 1 ? 'day' : 'days'} so far`}</span></span>
            <span className="truncate text-base text-ink">Electric {formatPounds(month.electricCost)} · {formatKwh(month.electricKwh)}</span>
            <span className="truncate text-base text-ink">Gas {formatPounds(month.gasCost)} · {formatKwh(month.gasKwh)}</span>
            <strong className="text-right font-display text-xl font-bold text-ink">{formatPounds(month.total)}</strong>
          </div>
        ))}
        {months.length === 0 ? <p className="border-t border-line/70 py-2 text-base text-muted">No monthly usage saved yet.</p> : null}
      </div>
      {notice ? <p className="mt-1 shrink-0 text-sm text-muted">{notice}</p> : null}
    </article>
  </section>
)

const Meter = ({ icon, label, reading }: { icon: ReactNode; label: string; reading: FuelReading }) => (
  <article className="rounded-md border border-line bg-white px-5 py-3">
    <div className="flex items-center gap-2.5 text-sage">
      {icon}
      <span className="font-mono text-xs font-medium tracking-wide text-muted">{label.toUpperCase()}</span>
      <span className="ml-auto font-mono text-xs text-muted">{reading.period === 'today' ? 'TODAY' : reading.period === 'yesterday' ? 'YESTERDAY' : ''}</span>
    </div>
    <strong className="mt-1 block font-display text-3xl font-bold tracking-tight text-ink">{formatPounds(reading.cost)}</strong>
    <span className="mt-1 block text-base text-ink">{formatKwh(reading.kwh)}</span>
    <span className="mt-0.5 block text-sm text-muted">{formatPence(reading.rate)} / kWh · {formatPounds(reading.standing)} standing</span>
  </article>
)
