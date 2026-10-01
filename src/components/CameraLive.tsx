import { useEffect } from 'react'
import { useLiveStream } from '../hooks/useLiveStream'

interface CameraLiveProps {
  entityId: string
  onError: () => void
}

export function CameraLive({ entityId, onError }: CameraLiveProps) {
  const { videoRef, error } = useLiveStream(entityId)

  useEffect(() => {
    if (error) onError()
  }, [error, onError])

  return <video ref={videoRef} className="pointer-events-none block h-full w-full object-cover" autoPlay muted playsInline />
}
