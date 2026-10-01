import { Lightbulb } from 'lucide-react'
import type { CallService } from '../types/dashboard'
import type { EntityState } from '../types/homeAssistant'
import { LightCard } from './LightCard'
import { ServicePanel } from './ServicePanel'

interface LightBoardProps {
  lights: EntityState[]
  callService: CallService
}

export const LightBoard = ({ lights, callService }: LightBoardProps) => {
  if (!lights.length) {
    return (
      <section className="flex min-h-0 flex-1 flex-col" aria-label="Lights">
        <h1 className="sr-only">Lights</h1>
        <ServicePanel icon={<Lightbulb size={22} />} title="No lights found" detail="Light entities from Home Assistant will show here with on, off, and brightness controls." />
      </section>
    )
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label="Lights">
      <h1 className="sr-only">Lights</h1>
      <div className="grid min-h-0 flex-1 content-start grid-cols-2 gap-4 overflow-auto max-md:grid-cols-1 max-md:overflow-visible">
        {lights.map((light) => <LightCard key={light.entity_id} entity={light} callService={callService} />)}
      </div>
    </section>
  )
}
