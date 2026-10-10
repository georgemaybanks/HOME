import { useEffect, useState } from 'react'
import type { CallService } from '../types/dashboard'
import type { EntityState } from '../types/homeAssistant'

const CONFIRM_MS = 60_000

const armedState = (state: string) => /^(armed|triggered|pending|arming)/.test(state)

const reachable = (state: string) => state !== 'unavailable' && state !== 'unknown'

const confirmed = (requested: string, live: string) => (
  requested === 'disarmed' ? live === 'disarmed' : armedState(live)
)

export function useAlarmCommand(alarm: EntityState | undefined, callService: CallService) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastState, setLastState] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const live = alarm && reachable(alarm.state) ? alarm.state : null

  useEffect(() => {
    if (live) setLastState(live)
  }, [live])

  useEffect(() => {
    if (!pending || !live || !confirmed(pending, live)) return undefined
    setPending(null)
    setBusy(false)
    setError(null)
    return undefined
  }, [live, pending])

  useEffect(() => {
    if (!pending) return undefined
    const timer = window.setTimeout(() => {
      setPending(null)
      setBusy(false)
      setError('Blink has not confirmed that yet. The switch still shows the last answer.')
    }, CONFIRM_MS)
    return () => window.clearTimeout(timer)
  }, [pending])

  const shown = pending ?? live ?? lastState
  const armed = shown ? armedState(shown) : false
  const waiting = Boolean(alarm && !live && shown && !pending)

  const command = async (service: 'alarm_arm_away' | 'alarm_disarm') => {
    if (!alarm || !shown || busy) return
    setBusy(true)
    setError(null)
    setPending(service === 'alarm_disarm' ? 'disarmed' : 'armed_away')
    try {
      await callService('alarm_control_panel', service, { entity_id: alarm.entity_id })
    } catch (commandError) {
      setPending(null)
      setBusy(false)
      setError(commandError instanceof Error ? commandError.message : 'The alarm did not change.')
    }
  }

  return { armed, busy, error, waiting, pending, ready: Boolean(shown), state: shown, command }
}
