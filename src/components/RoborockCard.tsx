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

const actionClass = 'min-h-11 rounded-md px-3 text-sm font-bold disabled:cursor-wait disabled:opacity-50'

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
    <article className="flex h-full min-h-0 flex-col justify-between rounded-md border border-line bg-white px-3 py-3 max-md:h-auto">
      <div className="flex items-center gap-2">
        <Sparkles className="shrink-0 text-sage" size={16} />
        <strong className="truncate text-sm font-bold text-ink">Roborock</strong>
        <span className="ml-auto shrink-0 font-mono text-xs text-muted">{summary.status}</span>
      </div>
      <div className="mt-2 flex gap-2">
        {summary.running ? (
          <button className={cn(actionClass, 'flex-1 bg-sage-soft text-sage-deep')} type="button" disabled={busy} onClick={() => void run(() => callService('vacuum', 'pause', { entity_id: VACUUM_ID }))}>Pause</button>
        ) : (
          <button className={cn(actionClass, 'flex-1 bg-sage text-paper')} type="button" disabled={busy || !summary.vacuum} onClick={() => void run(() => startVacAndMop(callService))}>Vac and mop</button>
        )}
        {summary.running || summary.paused ? (
          <button className={cn(actionClass, 'bg-sage-soft text-sage-deep')} type="button" disabled={busy} onClick={() => void run(() => callService('vacuum', 'return_to_base', { entity_id: VACUUM_ID }))}>Dock</button>
        ) : null}
      </div>
      {warnings.length ? (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {warnings.map((item) => <span key={item.label} className="text-sm font-semibold text-clay">{item.label} {item.value}</span>)}
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm text-clay" role="status">{error}</p> : null}
    </article>
  )
}
