import { Camera } from 'lucide-react'
import { useRef } from 'react'
import type { CallService } from '../types/dashboard'
import type { EntityState } from '../types/homeAssistant'
import { CameraTile } from './CameraTile'
import { EntityControl } from './EntityControl'
import { ServicePanel } from './ServicePanel'

interface CameraBoardProps {
  cameras: EntityState[]
  controls: EntityState[]
  callService: CallService
}

export const CameraBoard = ({ cameras, controls, callService }: CameraBoardProps) => {
  const liveLinks = useRef(new Map<string, string>())
  cameras.forEach((camera) => {
    const source = camera.attributes.blink_source
    if (typeof source === 'string') liveLinks.current.set(source, camera.entity_id)
  })

  if (!cameras.length) {
    return (
      <section className="flex min-h-0 flex-1 flex-col" aria-label="Cameras">
        <h1 className="sr-only">Cameras</h1>
        <ServicePanel icon={<Camera size={22} />} title="No camera entities found" detail="Add your front door and nursery cameras to Home Assistant to see them here." />
      </section>
    )
  }

  const liveIds = new Set(liveLinks.current.values())
  const shown = cameras.filter((camera) => typeof camera.attributes.blink_source !== 'string' && !liveIds.has(camera.entity_id))

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto" aria-label="Cameras">
      <h1 className="sr-only">Cameras</h1>
      <div className="grid auto-rows-[minmax(13rem,1fr)] grid-cols-3 gap-4 max-md:grid-cols-1">
        {shown.map((camera) => {
          const streamEntityId = liveLinks.current.get(camera.entity_id)
          const nursery = camera.entity_id === 'camera.noah_noahs_camera_camera'
          return (
            <CameraTile
              key={camera.entity_id}
              entity={camera}
              nameOnly
              callService={callService}
              streamEntityId={streamEntityId}
              webrtc={nursery || Boolean(streamEntityId)}
              playOnPress={!nursery}
            />
          )
        })}
      </div>
      {controls.length ? (
        <div className="grid shrink-0 grid-cols-2 gap-3 max-md:grid-cols-1">
          {controls.map((control) => <EntityControl key={control.entity_id} entity={control} callService={callService} />)}
        </div>
      ) : null}
    </section>
  )
}
