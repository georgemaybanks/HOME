import { useCallback, useState } from 'react'
import type { CallService } from '../types/dashboard'
import type { EntityState } from '../types/homeAssistant'

export const isBlinkCamera = (entity: EntityState) => entity.attributes.brand === 'Blink'

export function useBlinkSnapshot(entity: EntityState, callService?: CallService) {
  const [waking, setWaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const blink = isBlinkCamera(entity)

  const wake = useCallback(async () => {
    if (!blink || !callService) return false
    setWaking(true)
    setError(null)
    try {
      await callService('blink', 'trigger_camera', {}, { entity_id: entity.entity_id })
      return true
    } catch (wakeError) {
      setError(wakeError instanceof Error ? wakeError.message : 'The camera did not wake.')
      return false
    } finally {
      setWaking(false)
    }
  }, [blink, callService, entity.entity_id])

  return { blink, waking, error, wake }
}
