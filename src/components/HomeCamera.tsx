import { Camera } from 'lucide-react'
import { CameraTile } from './CameraTile'
import { ServicePanel } from './ServicePanel'
import type { EntityState } from '../types/homeAssistant'

interface HomeCameraProps {
  camera: EntityState | undefined
}

export const HomeCamera = ({ camera }: HomeCameraProps) => {
  if (!camera) {
    return <ServicePanel icon={<Camera size={22} />} title="Noah's camera is not connected" detail="The Noahs Camera Camera entity will fill this side when Home Assistant reports it." />
  }

  return (
    <div className="min-h-0 flex-1">
      <CameraTile entity={camera} nameOnly playOnPress webrtc />
    </div>
  )
}
