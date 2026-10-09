import { Zap } from 'lucide-react'
import { formatKwh, type EnergyUsage } from '../hooks/useEnergy'

interface EnergyCardProps {
  today: EnergyUsage
  notice: string
  onOpen: () => void
}

export const EnergyCard = ({ today, notice, onOpen }: EnergyCardProps) => (
  <button className="flex h-full w-full flex-col rounded-md border border-line bg-white px-4 py-3 text-left" type="button" onClick={onOpen}>
    <div className="flex items-center gap-2.5 text-sage">
      <Zap size={22} />
      <strong className="text-lg font-bold text-ink">Energy</strong>
      <span className="ml-auto font-mono text-xs text-muted">TODAY</span>
    </div>
    <div className="mt-2 grid grid-cols-2 gap-3">
      <Reading label="Electric" value={formatKwh(today.electricKwh)} />
      <Reading label="Gas" value={formatKwh(today.gasKwh)} />
    </div>
    <p className="mt-auto pt-2 text-sm text-muted">{notice}</p>
  </button>
)

const Reading = ({ label, value }: { label: string; value: string }) => (
  <div>
    <span className="font-mono text-xs font-medium tracking-wide text-muted">{label.toUpperCase()}</span>
    <strong className="mt-1 block font-display text-2xl font-bold tracking-tight text-ink">{value}</strong>
  </div>
)
