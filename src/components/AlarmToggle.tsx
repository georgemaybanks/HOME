import { cn } from '../lib/cn'
import { useAlarmCommand } from '../hooks/useAlarmCommand'
import type { CallService } from '../types/dashboard'
import type { EntityState } from '../types/homeAssistant'

interface AlarmToggleProps {
  alarm: EntityState | undefined
  callService: CallService
}

export const AlarmToggle = ({ alarm, callService }: AlarmToggleProps) => {
  const { armed, busy, error, waiting, pending, ready, command } = useAlarmCommand(alarm, callService)
  const asking = pending === 'armed_away' ? 'Arming' : 'Disarming'

  return (
    <article className="flex h-full min-w-0 flex-col justify-center rounded-md border border-line bg-white px-4 py-4">
      <span className="font-mono text-xs font-medium tracking-wide text-muted">ALARM</span>
      <button
        type="button"
        role="switch"
        aria-checked={armed}
        aria-label={armed ? 'Alarm armed' : 'Alarm disarmed'}
        disabled={!ready || busy}
        onClick={() => void command(armed ? 'alarm_disarm' : 'alarm_arm_away')}
        className={cn('relative mt-3 grid h-12 grid-cols-2 items-center overflow-hidden rounded-full text-base font-bold disabled:cursor-wait disabled:opacity-50', armed ? 'bg-clay text-white' : 'bg-signal text-white')}
      >
        <span className={cn('absolute top-1 h-10 w-[calc(50%-0.25rem)] rounded-full bg-white', armed ? 'left-1/2' : 'left-1')} />
        <span className={cn('relative z-10', !armed ? 'text-signal' : 'text-white')}>Disarmed</span>
        <span className={cn('relative z-10', armed ? 'text-clay' : 'text-white')}>Armed</span>
      </button>
      {busy ? <p className="mt-2 text-sm text-muted" role="status">{asking}. Blink is slow to answer.</p> : null}
      {waiting ? <p className="mt-2 text-sm text-muted" role="status">Blink is slow to answer. The last state is still shown.</p> : null}
      {error ? <p className="mt-2 text-sm text-clay" role="status">{error}</p> : null}
    </article>
  )
}
