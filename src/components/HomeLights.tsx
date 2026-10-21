import { Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { displayName } from '../lib/entityGroups'
import { cn } from '../lib/cn'
import type { CallService } from '../types/dashboard'
import type { EntityState } from '../types/homeAssistant'

interface HomeLightsProps {
  lights: EntityState[]
  callService: CallService
}

export const HomeLights = ({ lights, callService }: HomeLightsProps) => {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (!lights.length) return null
  const onCount = lights.filter((light) => light.state === 'on').length

  const toggle = async (light: EntityState) => {
    setBusyId(light.entity_id)
    setError(null)
    try {
      await callService('light', light.state === 'on' ? 'turn_off' : 'turn_on', { entity_id: light.entity_id })
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'The light did not change.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <article className="shrink-0 rounded-md border border-line bg-white px-4 py-2.5">
      <div className="flex items-center gap-2.5 text-sage">
        <Lightbulb size={22} />
        <strong className="text-lg font-bold text-ink">Lights</strong>
        <span className="ml-auto font-mono text-xs text-muted">{onCount ? `${onCount} on` : 'All off'}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {lights.map((light) => {
          const on = light.state === 'on'
          return (
            <button
              key={light.entity_id}
              className={cn('min-h-11 rounded-md px-3 text-left text-sm font-semibold leading-tight disabled:cursor-wait disabled:opacity-50', on ? 'bg-sage text-paper' : 'bg-sage-soft text-sage-deep')}
              type="button"
              aria-pressed={on}
              disabled={busyId === light.entity_id || light.state === 'unavailable'}
              onClick={() => void toggle(light)}
            >
              {displayName(light)}
            </button>
          )
        })}
      </div>
      {error ? <p className="mt-2 text-sm text-clay" role="status">{error}</p> : null}
    </article>
  )
}
