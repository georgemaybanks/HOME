import Hls from 'hls.js'
import { useEffect, useRef, useState } from 'react'
import { dashboardStreamUrl } from '../lib/cameraStream'
import { useHomeAssistant } from './useHomeAssistant'

interface StreamResponse {
  url: string
}

const hlsSource = (url: string) => {
  const source = dashboardStreamUrl(url)
  return source.includes('/api/hls/') || source.includes('.m3u8') ? source : ''
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
    let restartTimer = 0
    let attempts = 0
    let networkRecoveries = 0
    let mediaRecoveries = 0

    const stopPlayer = () => {
      hls?.destroy()
      hls = undefined
      video.pause()
      video.removeAttribute('src')
      video.load()
    }

    const giveUp = () => {
      if (!cancelled) setError('The live camera stream failed.')
    }

    const schedule = () => {
      if (cancelled) return
      attempts += 1
      if (attempts > 4) {
        giveUp()
        return
      }
      window.clearTimeout(restartTimer)
      restartTimer = window.setTimeout(() => void start(), attempts * 1500)
    }

    const start = async () => {
      if (cancelled || document.visibilityState === 'hidden') return
      setError(null)
      stopPlayer()
      try {
        const stream = await command<StreamResponse>('camera/stream', { entity_id: entityId, format: 'hls' })
        if (cancelled) return
        const source = hlsSource(stream.url)
        if (!source) {
          giveUp()
          return
        }
        if (Hls.isSupported()) {
          const player = new Hls({
            lowLatencyMode: false,
            manifestLoadingMaxRetry: 4,
            levelLoadingMaxRetry: 4,
            fragLoadingMaxRetry: 6,
          })
          hls = player
          player.on(Hls.Events.ERROR, (_event, data) => {
            if (!data.fatal) return
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRecoveries < 2) {
              networkRecoveries += 1
              player.startLoad()
              return
            }
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries < 1) {
              mediaRecoveries += 1
              player.recoverMediaError()
              return
            }
            schedule()
          })
          player.on(Hls.Events.MANIFEST_PARSED, () => {
            attempts = 0
            networkRecoveries = 0
            mediaRecoveries = 0
            void video.play().catch(() => schedule())
          })
          player.loadSource(source)
          player.attachMedia(video)
          return
        }
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = source
          await video.play()
          attempts = 0
          return
        }
        giveUp()
      } catch {
        schedule()
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'hidden') {
        window.clearTimeout(restartTimer)
        stopPlayer()
        return
      }
      attempts = 0
      void start()
    }

    void start()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      window.clearTimeout(restartTimer)
      stopPlayer()
    }
  }, [command, entityId])

  return { videoRef, error }
}
