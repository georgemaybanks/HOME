import { useEffect, useState } from 'react'
import { formatDegrees } from '../lib/homeEntities'
import { useHomeAssistant } from './useHomeAssistant'
import type { ConnectionStatus } from '../types/homeAssistant'

const londonDay = (value: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)

const asRecord = (value: unknown) => (value && typeof value === 'object' ? value as Record<string, unknown> : null)

const overnightFromForecast = (result: unknown) => {
  const root = asRecord(result)
  const response = asRecord(root?.response) ?? root
  const entity = response ? Object.values(response).map(asRecord).find((item) => Array.isArray(item?.forecast)) : null
  const forecast = Array.isArray(entity?.forecast) ? entity.forecast : []
  const today = londonDay(new Date())
  const lows = forecast.flatMap((item) => {
    const record = asRecord(item)
    const templow = record?.templow
    const datetime = record?.datetime
    if (typeof templow !== 'number' || typeof datetime !== 'string') return []
    return [{ day: londonDay(new Date(datetime)), templow }]
  })
  const overnight = lows.find((item) => item.day > today) ?? lows[0]
  return overnight ? formatDegrees(overnight.templow) : null
}

export const useOvernightLow = (status: ConnectionStatus) => {
  const { callServiceResult } = useHomeAssistant()
  const [overnight, setOvernight] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'connected') return undefined
    let active = true

    const load = async () => {
      try {
        const result = await callServiceResult('weather', 'get_forecasts', { type: 'daily' }, { entity_id: 'weather.forecast_home' })
        if (active) setOvernight(overnightFromForecast(result))
      } catch {
        if (active) setOvernight(null)
      }
    }

    void load()
    const timer = window.setInterval(() => void load(), 30 * 60 * 1000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [status, callServiceResult])

  return overnight
}
