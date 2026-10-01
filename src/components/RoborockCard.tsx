import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/cn'
import { roborockSummary, startVacAndMop, VACUUM_ID } from '../lib/roborock'
import type { CallService } from '../types/dashboard'
import type { EntityState } from '../types/homeAssistant'

interface RoborockCardProps {
  entities: EntityState[]
  callService: CallService
}

const actionClass = 'min-h-12 rounded-md px-4 text-base font-bold disabled:cursor-wait disabled:opacity-50'

export const RoborockCard = ({ entities, callService }: RoborockCardProps) => {
  const summary = roborockSummary(entities)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const warnings = [...summary.facts, ...summary.water, ...summary.maintenance].filter((item, index, list) => item.warning && list.findIndex((other) => other.label === item.label) === index)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Roborock did not start.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="rounded-md border border-line bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Sparkles className="text-sage" size={22} />
        <strong className="text-lg font-bold text-ink">Roborock</strong>
        <span className="font-mono text-xs text-muted">{summary.status}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          {summary.running ? (
            <button className={cn(actionClass, 'bg-sage-soft text-sage-deep')} type="button" disabled={busy} onClick={() => void run(() => callService('vacuum', 'pause', { entity_id: VACUUM_ID }))}>Pause</button>
          ) : (
            <button className={cn(actionClass, 'bg-sage text-paper')} type="button" disabled={busy || !summary.vacuum} onClick={() => void run(() => startVacAndMop(callService))}>Vac and mop</button>
          )}
          {summary.running || summary.paused ? (
            <button className={cn(actionClass, 'bg-sage-soft text-sage-deep')} type="button" disabled={busy} onClick={() => void run(() => callService('vacuum', 'return_to_base', { entity_id: VACUUM_ID }))}>Dock</button>
          ) : null}
        </div>
      </div>
      {warnings.length ? (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {warnings.map((item) => <span key={item.label} className="text-base font-semibold text-clay">{item.label} {item.value}</span>)}
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm text-clay" role="status">{error}</p> : null}
    </article>
  )
}
