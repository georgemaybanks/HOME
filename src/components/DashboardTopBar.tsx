import { House, Wifi } from 'lucide-react'
import { cn } from '../lib/cn'
import type { ConnectionStatus } from '../types/homeAssistant'

interface DashboardTopBarProps {
  now: Date
  networkName: string | null
  speedLabel: string
  status: ConnectionStatus
  connectionLabel: string
  onGoHome: () => void
}

const connectionTone: Record<ConnectionStatus, string> = {
  connected: 'bg-signal ring-4 ring-signal/20',
  connecting: 'bg-amber-500',
  error: 'bg-clay',
  disconnected: 'bg-stone-400',
}

export const DashboardTopBar = ({ now, networkName, speedLabel, status, connectionLabel, onGoHome }: DashboardTopBarProps) => {
  const clockLabel = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(now)
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(now)

  return (
    <header className="grid min-h-20 grid-cols-[1fr_auto_1fr] items-center border-b border-line bg-paper/90 px-7 max-md:min-h-16 max-md:px-4">
      <button className="flex items-center gap-2.5 justify-self-start" type="button" onClick={onGoHome}>
        <span className="grid h-9 w-9 place-items-center rounded bg-sage text-paper"><House size={19} strokeWidth={1.8} /></span>
        <span className="font-display text-xl font-extrabold tracking-tight text-ink">Casa <span className="text-clay">Maybanks</span></span>
      </button>
      <time className="font-display text-clock font-bold tabular-nums tracking-tight max-md:text-3xl" dateTime={now.toISOString()}>{clockLabel}</time>
      <div className="flex items-center justify-self-end gap-3.5 text-base text-muted">
        <div className="flex min-w-0 max-w-64 items-center gap-2 text-right text-sage">
          <Wifi size={18} aria-hidden="true" />
          <div className="min-w-0">
            <strong className="block truncate text-sm font-semibold text-ink">{networkName ?? 'Wi-Fi'}</strong>
            <span className="mt-0.5 block truncate font-mono text-xs text-muted">{speedLabel}</span>
          </div>
        </div>
        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', connectionTone[status])} />
        <span className="sr-only">{connectionLabel}. {networkName ? `Network ${networkName}. ` : ''}{speedLabel}</span>
        <time className="max-md:hidden" dateTime={now.toISOString()}>{dateLabel}</time>
      </div>
    </header>
  )
}
