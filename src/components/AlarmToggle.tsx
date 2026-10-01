import { useState } from 'react'
import { cn } from '../lib/cn'
import type { CallService } from '../types/dashboard'
import type { EntityState } from '../types/homeAssistant'

interface AlarmToggleProps {
  alarm: EntityState | undefined
  callService: CallService
}

const armedState = (state: string) => /^(armed|triggered|pending|arming)/.test(state)

export const AlarmToggle = ({ alarm, callService }: AlarmToggleProps) => {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const armed = alarm ? armedState(alarm.state) : false

  const toggle = async () => {
    if (!alarm || alarm.state === 'unavailable') return
    setBusy(true)
    setError(null)
    try {
      await callService('alarm_control_panel', armed ? 'alarm_disarm' : 'alarm_arm_away', { entity_id: alarm.entity_id })
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'The alarm did not change.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="flex min-w-0 flex-col justify-center rounded-md border border-line bg-white px-4 py-4">
      <span className="font-mono text-xs font-medium tracking-wide text-muted">ALARM</span>
      <button
        type="button"
        role="switch"
        aria-checked={armed}
        aria-label={armed ? 'Alarm armed' : 'Alarm disarmed'}
        disabled={!alarm || busy || alarm.state === 'unavailable'}
        onClick={() => void toggle()}
        className={cn('relative mt-3 grid h-12 grid-cols-2 items-center overflow-hidden rounded-full text-base font-bold disabled:cursor-wait disabled:opacity-50', armed ? 'bg-clay text-white' : 'bg-signal text-white')}
      >
        <span className={cn('absolute top-1 h-10 w-[calc(50%-0.25rem)] rounded-full bg-white', armed ? 'left-1/2' : 'left-1')} />
        <span className={cn('relative z-10', !armed ? 'text-signal' : 'text-white')}>Disarmed</span>
        <span className={cn('relative z-10', armed ? 'text-clay' : 'text-white')}>Armed</span>
      </button>
      {error ? <p className="mt-2 text-sm text-clay" role="status">{error}</p> : null}
    </article>
  )
}
