import type { ReactNode } from 'react'
import { Flame, Zap } from 'lucide-react'
import { formatKwh, type EnergyDay, type EnergyUsage } from '../hooks/useEnergy'

interface EnergyBoardProps {
  today: EnergyUsage
  week: EnergyDay[]
  notice: string
}

export const EnergyBoard = ({ today, week, notice }: EnergyBoardProps) => (
  <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto" aria-label="Energy">
    <h1 className="sr-only">Energy</h1>
    <div className="grid shrink-0 grid-cols-2 gap-4 max-md:grid-cols-1">
      <Meter icon={<Zap size={22} />} label="Electric" value={formatKwh(today.electricKwh)} />
      <Meter icon={<Flame size={22} />} label="Gas" value={formatKwh(today.gasKwh)} />
    </div>
    <article className="min-h-0 flex-1 rounded-md border border-line bg-white px-4 py-3">
      <strong className="text-lg font-bold text-ink">Last 7 days</strong>
      <div className="mt-2">
        {week.map((day) => (
          <div key={day.label} className="grid min-h-12 grid-cols-[7rem_1fr_1fr] items-center gap-3 border-t border-line/70">
            <span className="font-mono text-sm text-ink">{day.label}</span>
            <span className="text-base text-muted">Electric {formatKwh(day.electricKwh)}</span>
            <span className="text-base text-muted">Gas {formatKwh(day.gasKwh)}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-base text-muted">{notice}</p>
    </article>
  </section>
)

const Meter = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <article className="rounded-md border border-line bg-white px-5 py-4">
    <div className="flex items-center gap-2.5 text-sage">
      {icon}
      <span className="font-mono text-xs font-medium tracking-wide text-muted">{label.toUpperCase()}</span>
    </div>
    <strong className="mt-3 block font-display text-4xl font-bold tracking-tight text-ink">{value}</strong>
    <span className="mt-1 block text-sm text-muted">Today</span>
  </article>
)
