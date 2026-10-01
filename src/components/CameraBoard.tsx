import { Camera } from 'lucide-react'
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
  if (!cameras.length) {
    return (
      <section className="flex min-h-0 flex-1 flex-col" aria-label="Cameras">
        <h1 className="sr-only">Cameras</h1>
        <ServicePanel icon={<Camera size={22} />} title="No camera entities found" detail="Add your front door and nursery cameras to Home Assistant to see them here." />
      </section>
    )
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto" aria-label="Cameras">
      <h1 className="sr-only">Cameras</h1>
      <div className="grid auto-rows-[minmax(13rem,1fr)] grid-cols-3 gap-4 max-md:grid-cols-1">
        {cameras.map((camera) => (
          <CameraTile key={camera.entity_id} entity={camera} nameOnly webrtc={camera.entity_id === 'camera.noah_noahs_camera_camera'} playOnPress={camera.entity_id !== 'camera.noah_noahs_camera_camera'} />
        ))}
      </div>
      {controls.length ? (
        <div className="grid shrink-0 grid-cols-2 gap-3 max-md:grid-cols-1">
          {controls.map((control) => <EntityControl key={control.entity_id} entity={control} callService={callService} />)}
        </div>
      ) : null}
    </section>
  )
}
