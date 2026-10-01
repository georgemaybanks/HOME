import { useState } from 'react'
import { displayName } from '../lib/entityGroups'
import { labelState } from '../lib/homeEntities'
import { cn } from '../lib/cn'
import type { CallService } from '../types/dashboard'
import type { EntityState } from '../types/homeAssistant'

interface EntityControlProps {
  entity: EntityState
  callService: CallService
}

const stringList = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [])

export const EntityControl = ({ entity, callService }: EntityControlProps) => {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const name = displayName(entity)
  const domain = entity.entity_id.split('.')[0]
  const unavailable = entity.state === 'unavailable'
  const features = typeof entity.attributes.supported_features === 'number' ? entity.attributes.supported_features : 0

  const run = async (serviceDomain: string, service: string, serviceData: Record<string, unknown> = {}) => {
    setBusy(true)
    setError(null)
    try {
      await callService(serviceDomain, service, { entity_id: entity.entity_id, ...serviceData })
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Home Assistant rejected that action.')
    } finally {
      setBusy(false)
    }
  }

  const buttonClass = 'min-h-12 rounded-md bg-sage px-3 text-base font-bold text-paper disabled:cursor-wait disabled:opacity-50'
  const quietClass = 'min-h-12 rounded-md bg-sage-soft px-3 text-base font-semibold text-sage-deep disabled:cursor-wait disabled:opacity-50'

  let actions = null
  if (domain === 'switch') {
    const isOn = entity.state === 'on'
    actions = <button className={cn(buttonClass, !isOn && quietClass)} type="button" disabled={busy || unavailable} onClick={() => void run('switch', isOn ? 'turn_off' : 'turn_on')}>{isOn ? 'Turn off' : 'Turn on'}</button>
  } else if (domain === 'button') {
    actions = <button className={buttonClass} type="button" disabled={busy || unavailable} onClick={() => void run('button', 'press')}>Run</button>
  } else if (domain === 'select') {
    const options = stringList(entity.attributes.options)
    actions = (
      <select className="min-h-12 w-full rounded-md border border-line bg-white px-3 text-base text-ink disabled:opacity-50" aria-label={name} value={options.includes(entity.state) ? entity.state : ''} disabled={busy || unavailable || !options.length} onChange={(event) => void run('select', 'select_option', { option: event.target.value })}>
        {options.includes(entity.state) ? null : <option value="">{labelState(entity.state)}</option>}
        {options.map((option) => <option key={option} value={option}>{labelState(option)}</option>)}
      </select>
    )
  } else if (domain === 'alarm_control_panel') {
    const armed = entity.state.startsWith('armed') || entity.state === 'triggered' || entity.state === 'pending'
    actions = (
      <div className="flex flex-wrap gap-2">
        {(features & 2) !== 0 && !armed ? <button className={buttonClass} type="button" disabled={busy || unavailable} onClick={() => void run('alarm_control_panel', 'alarm_arm_away')}>Arm away</button> : null}
        {armed ? <button className={quietClass} type="button" disabled={busy || unavailable} onClick={() => void run('alarm_control_panel', 'alarm_disarm')}>Disarm</button> : null}
      </div>
    )
  } else if (domain === 'update' && entity.state === 'on') {
    actions = <button className={buttonClass} type="button" disabled={busy} onClick={() => void run('update', 'install')}>Install update</button>
  } else if (domain === 'remote') {
    const activities = stringList(entity.attributes.activity_list)
    actions = activities.length ? (
      <div className="flex flex-wrap gap-2">
        {activities.map((activity) => <button key={activity} className={quietClass} type="button" disabled={busy || unavailable} onClick={() => void run('remote', 'turn_on', { activity })}>{activity}</button>)}
      </div>
    ) : null
  }

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-md border border-line bg-white p-4">
      <div className="min-w-0">
        <strong className="block truncate text-lg font-semibold text-ink">{name}</strong>
        <span className="mt-1 block truncate text-base text-muted">{labelState(entity.state)}</span>
      </div>
      {actions}
      {error ? <p className="text-sm text-clay" role="status">{error}</p> : null}
    </article>
  )
}
