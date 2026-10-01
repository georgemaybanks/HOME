import Hls from 'hls.js'
import { useEffect, useRef, useState } from 'react'
import { useHomeAssistant } from './useHomeAssistant'

interface StreamResponse {
  url: string
}

export function useLiveStream(entityId: string) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { command } = useHomeAssistant()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined
    let cancelled = false
    let hls: Hls | undefined

    const start = async () => {
      setError(null)
      const stream = await command<StreamResponse>('camera/stream', { entity_id: entityId, format: 'hls' })
      if (cancelled) return
      const source = stream.url
      if (Hls.isSupported()) {
        hls = new Hls({ lowLatencyMode: true })
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal || !hls) return
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()
          else setError('The live camera stream failed.')
        })
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          void video.play().catch(() => setError('The live camera stream failed.'))
        })
        hls.loadSource(source)
        hls.attachMedia(video)
        return
      }
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = source
        await video.play()
        return
      }
      setError('The live camera stream failed.')
    }

    void start().catch(() => {
      if (!cancelled) setError('The live camera stream failed.')
    })

    return () => {
      cancelled = true
      hls?.destroy()
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [command, entityId])

  return { videoRef, error }
}
