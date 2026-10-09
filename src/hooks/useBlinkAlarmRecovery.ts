import { useEffect, useRef } from 'react'
import type { EntityState } from '../types/homeAssistant'
import { useHomeAssistant } from './useHomeAssistant'

interface ConfigEntry {
  domain: string
  entry_id: string
}

const blinkEntryId = (result: ConfigEntry[] | { entries: ConfigEntry[] }) => {
  const entries = Array.isArray(result) ? result : result.entries
  return entries.find((entry) => entry.domain === 'blink')?.entry_id
}

export function useBlinkAlarmRecovery(alarm: EntityState | undefined) {
  const { command, callService } = useHomeAssistant()
  const tried = useRef(false)

  useEffect(() => {
    if (!alarm) return undefined
    if (alarm.state !== 'unavailable') {
      tried.current = false
      return undefined
    }
    if (tried.current) return undefined
    tried.current = true
    let cancelled = false

    const recover = async () => {
      const result = await command<ConfigEntry[] | { entries: ConfigEntry[] }>('config_entries/get')
      const entryId = blinkEntryId(result)
      if (!entryId || cancelled) return
      await callService('homeassistant', 'reload_config_entry', { entry_id: entryId })
    }

    void recover().catch(() => {
      tried.current = false
    })

    return () => {
      cancelled = true
    }
  }, [alarm, callService, command])
}
