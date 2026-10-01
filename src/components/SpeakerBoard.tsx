import { Music2 } from 'lucide-react'
import type { CallService } from '../types/dashboard'
import type { EntityState } from '../types/homeAssistant'
import { EntityControl } from './EntityControl'
import { MediaPlayerCard } from './MediaPlayerCard'
import { ServicePanel } from './ServicePanel'

interface SpeakerBoardProps {
  players: EntityState[]
  remotes: EntityState[]
  callService: CallService
}

export const SpeakerBoard = ({ players, remotes, callService }: SpeakerBoardProps) => {
  if (!players.length && !remotes.length) {
    return (
      <section className="flex min-h-0 flex-1 flex-col" aria-label="Audio">
        <h1 className="sr-only">Audio</h1>
        <ServicePanel icon={<Music2 size={22} />} title="No media players found" detail="Add speaker integrations in Home Assistant to control playback from this view." />
      </section>
    )
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label="Audio">
      <h1 className="sr-only">Audio</h1>
      <div className="grid min-h-0 flex-1 content-start grid-cols-2 gap-4 overflow-auto max-md:grid-cols-1 max-md:overflow-visible">
        {players.map((player) => <MediaPlayerCard key={player.entity_id} entity={player} callService={callService} />)}
        {remotes.map((remote) => <EntityControl key={remote.entity_id} entity={remote} callService={callService} />)}
      </div>
    </section>
  )
}
