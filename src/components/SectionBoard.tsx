import { useMemo, useState } from 'react'
import { displayName } from '../lib/entityGroups'
import { labelState } from '../lib/homeEntities'
import type { CallService } from '../types/dashboard'
import type { EntityState } from '../types/homeAssistant'
import { EntityControl } from './EntityControl'

export interface BoardSection {
  title: string
  entities: EntityState[]
  kind: 'action' | 'readout'
}

interface SectionBoardProps {
  label: string
  sections: BoardSection[]
  callService: CallService
}

const readoutValue = (entity: EntityState) => {
  const unit = typeof entity.attributes.unit_of_measurement === 'string' ? entity.attributes.unit_of_measurement : ''
  if (unit && entity.state !== 'unknown' && entity.state !== 'unavailable') return `${entity.state} ${unit}`
  return labelState(entity.state)
}

export const SectionBoard = ({ label, sections, callService }: SectionBoardProps) => {
  const [query, setQuery] = useState('')
  const total = sections.reduce((count, section) => count + section.entities.length, 0)
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return sections.flatMap((section) => {
      const entities = needle
        ? section.entities.filter((entity) => `${displayName(entity)} ${entity.entity_id} ${entity.state}`.toLowerCase().includes(needle))
        : section.entities
      return entities.length ? [{ ...section, entities }] : []
    })
  }, [query, sections])

  if (!total) {
    return (
      <section className="flex min-h-0 flex-1 flex-col" aria-label={label}>
        <h1 className="sr-only">{label}</h1>
        <p className="text-base text-muted">No {label.toLowerCase()} entities are available.</p>
      </section>
    )
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto" aria-label={label}>
      <h1 className="sr-only">{label}</h1>
      <input className="min-h-12 rounded-md border border-line bg-white px-4 text-base text-ink" value={query} placeholder={`Search ${label.toLowerCase()}`} aria-label={`Search ${label}`} onChange={(event) => setQuery(event.target.value)} />
      {visible.length ? visible.map((section) => (
        <div key={section.title} className="grid content-start gap-3">
          <h2 className="font-mono text-xs font-medium tracking-wide text-muted">{section.title}</h2>
          {section.kind === 'action' ? (
            <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
              {section.entities.map((entity) => <EntityControl key={entity.entity_id} entity={entity} callService={callService} />)}
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-line bg-white">
              {section.entities.map((entity) => (
                <div key={entity.entity_id} className="flex min-h-12 items-center justify-between gap-3 border-t border-line/70 px-4 first:border-t-0">
                  <span className="truncate text-base text-ink">{displayName(entity)}</span>
                  <strong className="shrink-0 font-mono text-base font-medium text-ink">{readoutValue(entity)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )) : <p className="text-base text-muted">Nothing in {label.toLowerCase()} matches that search.</p>}
    </section>
  )
}
