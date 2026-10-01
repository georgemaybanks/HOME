import { Camera, Maximize2, Minimize2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { cn } from '../lib/cn'
import type { EntityState } from '../types/homeAssistant'
import { CameraLive } from './CameraLive'

interface CameraTileProps {
  entity: EntityState
  nameOnly?: boolean
  playOnPress?: boolean
  webrtc?: boolean
}

type PictureMode = 'stream' | 'snapshot' | 'unavailable'

export function CameraTile({ entity, nameOnly = false, playOnPress = false, webrtc = false }: CameraTileProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [mode, setMode] = useState<PictureMode>(playOnPress ? 'snapshot' : 'stream')
  const [frame, setFrame] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const name = entity.attributes.friendly_name ?? entity.entity_id
  const encodedId = encodeURIComponent(entity.entity_id)

  useEffect(() => {
    setMode(playOnPress ? 'snapshot' : 'stream')
    setFrame(0)
    setExpanded(false)
  }, [entity.entity_id, playOnPress])

  useEffect(() => {
    if (!expanded) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  const handlePictureError = useCallback(() => {
    setMode((current) => (current === 'stream' ? 'snapshot' : 'unavailable'))
  }, [])

  useEffect(() => {
    if (mode !== 'stream' || webrtc) return undefined
    const timer = window.setTimeout(() => {
      if (!imageRef.current || imageRef.current.naturalWidth === 0) setMode('snapshot')
    }, 4000)
    return () => window.clearTimeout(timer)
  }, [mode, entity.entity_id, webrtc])

  useEffect(() => {
    if (mode !== 'snapshot') return undefined
    const timer = window.setInterval(() => setFrame((current) => current + 1), 2000)
    return () => window.clearInterval(timer)
  }, [mode])

  const source = mode === 'stream'
    ? `/api/camera_proxy_stream/${encodedId}`
    : mode === 'snapshot'
      ? `/api/camera_proxy/${encodedId}?frame=${frame}`
      : undefined

  const togglePlayback = () => {
    setFrame(0)
    setMode((current) => (current === 'stream' ? 'snapshot' : 'stream'))
  }

  return (
    <article className={cn('flex min-h-52 min-w-0 flex-col overflow-hidden rounded-md border border-line bg-white max-md:h-auto', expanded ? 'fixed inset-0 z-30 h-auto' : 'h-full')}>
      <div className="relative min-h-0 flex-1 overflow-hidden bg-camera max-md:aspect-video max-md:flex-none">
        {webrtc && mode === 'stream' ? <CameraLive entityId={entity.entity_id} onError={handlePictureError} /> : null}
        {playOnPress ? (
          <button className={cn('block h-full w-full', webrtc && mode === 'stream' && 'absolute inset-0')} type="button" aria-pressed={mode === 'stream'} aria-label={mode === 'stream' ? `Pause ${name}` : `Play ${name}`} onClick={togglePlayback}>
            {webrtc && mode === 'stream' ? null : webrtc ? (
              <span className="flex h-full min-h-52 w-full flex-col items-center justify-center gap-2 bg-camera text-stone-300">
                <Camera size={25} strokeWidth={1.5} />
                <span className="text-base">Tap to watch</span>
              </span>
            ) : <Picture imageRef={imageRef} source={source} mode={mode} name={name} entityId={entity.entity_id} onError={handlePictureError} />}
          </button>
        ) : webrtc && mode === 'stream' ? null : (
          <Picture imageRef={imageRef} source={source} mode={mode} name={name} entityId={entity.entity_id} onError={handlePictureError} />
        )}
        <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded bg-camera/80 px-2 py-1.5 font-mono text-xs text-white">
          <i className={mode === 'stream' ? 'h-2 w-2 rounded-full bg-signal' : 'h-2 w-2 rounded-full bg-orange-400'} />
          {mode === 'stream' ? 'LIVE' : webrtc && mode !== 'unavailable' ? 'PAUSED' : mode === 'snapshot' ? 'SNAPSHOT' : 'NO IMAGE'}
        </span>
        <button className="absolute right-3 top-3 z-10 flex h-12 w-12 items-center justify-center rounded bg-camera/80 text-white" type="button" aria-label={expanded ? `Exit full screen ${name}` : `Full screen ${name}`} onClick={() => setExpanded((current) => !current)}>
          {expanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
      </div>
      <div className="flex items-center justify-between gap-2.5 bg-white px-3.5 py-3">
        <strong className="truncate text-base font-semibold text-ink">{name}</strong>
        {nameOnly ? null : <span className="truncate font-mono text-xs text-muted">{entity.entity_id}</span>}
      </div>
    </article>
  )
}

const Picture = ({ imageRef, source, mode, name, entityId, onError }: {
  imageRef: RefObject<HTMLImageElement>
  source: string | undefined
  mode: PictureMode
  name: string
  entityId: string
  onError: () => void
}) => {
  if (!source) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-camera text-stone-300">
        <Camera size={25} strokeWidth={1.5} />
        <span className="text-base">Camera image unavailable</span>
      </div>
    )
  }

  return (
    <img
      ref={imageRef}
      key={mode === 'snapshot' ? source : entityId}
      className="block h-full w-full object-cover"
      src={source}
      alt={`${name} camera`}
      onError={onError}
    />
  )
}
