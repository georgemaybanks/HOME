import { useMemo, useState } from 'react'
import { displayName } from '../lib/entityGroups'
import { labelState } from '../lib/homeEntities'
import { cn } from '../lib/cn'
import { roborockSummary, startVacAndMop, VACUUM_ID, type RoborockFact } from '../lib/roborock'
import type { CallService } from '../types/dashboard'
import type { EntityState } from '../types/homeAssistant'
import { EntityControl } from './EntityControl'

interface CleaningBoardProps {
  entities: EntityState[]
  callService: CallService
}

const actionClass = 'min-h-12 rounded-md px-4 text-base font-bold disabled:cursor-wait disabled:opacity-50'

export const CleaningBoard = ({ entities, callService }: CleaningBoardProps) => {
  const summary = useMemo(() => roborockSummary(entities), [entities])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fanSpeeds = Array.isArray(summary.vacuum?.attributes.fan_speed_list) ? summary.vacuum.attributes.fan_speed_list.filter((item): item is string => typeof item === 'string') : []
  const fanSpeed = typeof summary.vacuum?.attributes.fan_speed === 'string' ? summary.vacuum.attributes.fan_speed : ''

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Roborock rejected that action.')
    } finally {
      setBusy(false)
    }
  }

  const startMode = async (option: string) => {
    await callService('select', 'select_option', { entity_id: 'select.roborock_qv_35s_cleaning_mode', option })
    await callService('vacuum', 'start', { entity_id: VACUUM_ID })
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto" aria-label="Cleaning">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Cleaning</h1>
        <span className="font-mono text-sm text-muted">{summary.status}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className={cn(actionClass, 'bg-sage text-paper')} type="button" disabled={busy} onClick={() => void run(() => startVacAndMop(callService))}>Vac and mop</button>
          <button className={cn(actionClass, 'bg-sage-soft text-sage-deep')} type="button" disabled={busy} onClick={() => void run(() => startMode('vacuum'))}>Vacuum</button>
          <button className={cn(actionClass, 'bg-sage-soft text-sage-deep')} type="button" disabled={busy} onClick={() => void run(() => startMode('mop'))}>Mop</button>
          <button className={cn(actionClass, 'bg-sage-soft text-sage-deep')} type="button" disabled={busy} onClick={() => void run(() => callService('vacuum', 'pause', { entity_id: VACUUM_ID }))}>Pause</button>
          <button className={cn(actionClass, 'bg-sage-soft text-sage-deep')} type="button" disabled={busy} onClick={() => void run(() => callService('vacuum', 'return_to_base', { entity_id: VACUUM_ID }))}>Dock</button>
        </div>
      </div>
      {error ? <p className="text-base text-clay" role="status">{error}</p> : null}
      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <FactCard title="Water and mop" facts={summary.water} />
        <FactCard title="Cleaning" facts={summary.clean} />
        <FactCard title="Parts" facts={summary.maintenance} />
        <FactCard title="Lifetime" facts={summary.lifetime} />
        <article className="rounded-md border border-line bg-white px-4 py-4">
          <h2 className="font-mono text-xs font-medium tracking-wide text-muted">POWER</h2>
          <label className="mt-3 block text-base text-ink" htmlFor="roborock-fan">Suction</label>
          <select id="roborock-fan" className="mt-2 min-h-12 w-full rounded-md border border-line bg-white px-3 text-base" value={fanSpeeds.includes(fanSpeed) ? fanSpeed : ''} disabled={busy || !fanSpeeds.length} onChange={(event) => void run(() => callService('vacuum', 'set_fan_speed', { entity_id: VACUUM_ID, fan_speed: event.target.value }))}>
            {fanSpeeds.map((speed) => <option key={speed} value={speed}>{labelState(speed)}</option>)}
          </select>
        </article>
      </div>
      <h2 className="font-mono text-xs font-medium tracking-wide text-muted">SETTINGS</h2>
      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
        {summary.controls.map((entity) => <EntityControl key={entity.entity_id} entity={shortName(entity)} callService={callService} />)}
      </div>
      <h2 className="font-mono text-xs font-medium tracking-wide text-muted">ROUTINES</h2>
      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
        {summary.routines.map((entity) => <EntityControl key={entity.entity_id} entity={shortName(entity)} callService={callService} />)}
      </div>
    </section>
  )
}

const shortName = (entity: EntityState): EntityState => ({
  ...entity,
  attributes: { ...entity.attributes, friendly_name: displayName(entity).replace(/^Roborock QV 35S\s+/i, '') },
})

const FactCard = ({ title, facts }: { title: string; facts: RoborockFact[] }) => (
  <article className="rounded-md border border-line bg-white px-4 py-4">
    <h2 className="font-mono text-xs font-medium tracking-wide text-muted">{title.toUpperCase()}</h2>
    <div className="mt-2">
      {facts.map((fact) => (
        <div key={fact.label} className="flex min-h-11 items-center justify-between gap-3 border-t border-line/70 py-2">
          <span className="text-base text-ink">{fact.label}</span>
          <strong className={cn('font-mono text-base font-medium', fact.warning ? 'text-clay' : 'text-ink')}>{fact.value}</strong>
        </div>
      ))}
    </div>
  </article>
)
