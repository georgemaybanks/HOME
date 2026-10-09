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

const nurseryId = 'camera.noah_noahs_camera_camera'

export const CameraBoard = ({ cameras, controls, callService }: CameraBoardProps) => {
  const shown = cameras.filter((camera) => camera.entity_id === nurseryId)
  const nurseryControls = controls.filter((control) => /noahs camera/i.test(`${control.entity_id} ${String(control.attributes.friendly_name ?? '')}`))

  if (!shown.length) {
    return (
      <section className="flex min-h-0 flex-1 flex-col" aria-label="Cameras">
        <h1 className="sr-only">Cameras</h1>
        <ServicePanel icon={<Camera size={22} />} title="Noah's camera is not connected" detail="The Nanit camera will appear here when Home Assistant reports it." />
      </section>
    )
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto" aria-label="Cameras">
      <h1 className="sr-only">Cameras</h1>
      <div className="grid auto-rows-[minmax(13rem,1fr)] grid-cols-1 gap-4">
        {shown.map((camera) => (
          <CameraTile key={camera.entity_id} entity={camera} nameOnly webrtc />
        ))}
      </div>
      {nurseryControls.length ? (
        <div className="grid shrink-0 grid-cols-2 gap-3 max-md:grid-cols-1">
          {nurseryControls.map((control) => <EntityControl key={control.entity_id} entity={control} callService={callService} />)}
        </div>
      ) : null}
    </section>
  )
}
