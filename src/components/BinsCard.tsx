import { Leaf, Recycle, Trash2 } from 'lucide-react'
import { binCountdown, type BinId, type BinRound } from '../lib/bins'
import { cn } from '../lib/cn'

const icons: Record<BinId, typeof Trash2> = {
  waste: Trash2,
  green: Leaf,
  recycling: Recycle,
}

const symbolOrder: BinId[] = ['waste', 'green', 'recycling']

interface BinsCardProps {
  now: Date
  round: BinRound | null
  notice: string
}

export const BinsCard = ({ now, round, notice }: BinsCardProps) => {
  const countdown = binCountdown(now, round)
  const symbols = symbolOrder.map((id) => countdown.bins.find((bin) => bin.id === id)).filter((bin) => bin != null)
  return (
    <section className="flex h-full min-h-0 flex-col justify-center rounded-md border border-line bg-white px-3 py-3 max-md:h-auto" aria-label="Bin collections">
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="font-display text-5xl font-extrabold leading-none text-ink">{countdown.days}</p>
        <p className="mt-1 font-mono text-xs font-medium tracking-wide text-muted">{countdown.days === 0 ? 'TODAY' : countdown.days === 1 ? 'DAY' : 'DAYS'}</p>
      </div>
      <div className="mt-3 flex items-center justify-around">
        {symbols.map((bin) => {
          const Icon = icons[bin.id]
          return (
            <span key={bin.id} className={cn(bin.collected ? 'text-gauge-green' : 'text-gauge-red')} aria-label={`${bin.label} ${bin.collected ? 'will be collected' : 'will not be collected'}`}>
              <Icon size={22} aria-hidden="true" />
            </span>
          )
        })}
      </div>
      {notice ? <p className="mt-2 truncate text-xs text-muted">{notice}</p> : null}
    </section>
  )
}
