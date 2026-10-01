import type { EntityState } from '../types/homeAssistant'

export const chargerWords = ['charger', 'wallbox', 'zappi', 'easee', 'ohme', 'podpoint', 'pod point', 'evse', 'hypervolt', 'myenergi', 'ev charge', 'car charge', 'wall connector', 'andersen', 'indra']

export const matchesWords = (entity: EntityState, words: string[]) => {
  const haystack = `${entity.entity_id} ${entity.attributes.friendly_name ?? ''}`.toLowerCase()
  return words.some((word) => haystack.includes(word))
}

export const labelState = (state: string) => state.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export const formatDegrees = (value: number, unit = '°C') => {
  const rounded = Math.round(value * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${text}${unit}`
}

export const sensorTemperature = (entity: EntityState | undefined) => {
  if (!entity || entity.state === 'unavailable' || entity.state === 'unknown') return null
  const value = Number(entity.state)
  if (!Number.isFinite(value)) return null
  const unit = typeof entity.attributes.unit_of_measurement === 'string' ? entity.attributes.unit_of_measurement : '°C'
  return formatDegrees(value, unit)
}

export const weatherTemperature = (entity: EntityState | undefined) => {
  if (!entity || typeof entity.attributes.temperature !== 'number') return null
  const unit = typeof entity.attributes.temperature_unit === 'string' ? entity.attributes.temperature_unit : '°C'
  return formatDegrees(entity.attributes.temperature, unit)
}

const cleanReading = (value: string | null | undefined) => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed || ['unavailable', 'unknown', 'none', 'null', 'connected', 'on'].includes(trimmed.toLowerCase())) return null
  return trimmed
}

const entityLabel = (entity: EntityState) => `${entity.entity_id} ${entity.attributes.friendly_name ?? ''}`.toLowerCase()

const ssidFrom = (entity: EntityState) => {
  const attribute = entity.attributes.ssid
  if (typeof attribute === 'string') {
    const named = cleanReading(attribute)
    if (named) return named
  }
  return cleanReading(entity.state)
}

const isSsidEntity = (entity: EntityState) => {
  const name = entityLabel(entity)
  if (/bssid|signal|rssi|strength|channel|frequency/.test(name)) return false
  return /\bssid\b|wi[-_ ]?fi connection|wifi connection|wireless network|wi[-_ ]?fi ssid/.test(name)
}

const isSpeedEntity = (entity: EntityState) => {
  if (!entity.entity_id.startsWith('sensor.')) return false
  const unit = typeof entity.attributes.unit_of_measurement === 'string' ? entity.attributes.unit_of_measurement : ''
  const name = entityLabel(entity)
  if (/ping|latency|jitter/.test(name)) return false
  return /mbit\/s|mbps|mb\/s/i.test(unit) || /speedtest|download speed|upload speed|link speed|wi[-_ ]?fi speed|internet speed/.test(name)
}

const formatMegabits = (value: number) => {
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} Mb/s`
}

const formatSpeed = (entity: EntityState) => {
  const value = Number(entity.state)
  if (Number.isNaN(value)) return cleanReading(entity.state)
  return formatMegabits(value)
}

export const networkSummary = (entityList: EntityState[]) => {
  const ssidEntity = entityList.find(isSsidEntity)
  const networkName = ssidEntity ? ssidFrom(ssidEntity) : null
  const speedEntities = entityList.filter(isSpeedEntity)
  const downloadSpeed = speedEntities.find((entity) => /download|downlink|rx/.test(entityLabel(entity)))
    ?? speedEntities.find((entity) => !/upload|uplink|tx/.test(entityLabel(entity)))
  const uploadSpeed = speedEntities.find((entity) => entity !== downloadSpeed && /upload|uplink|tx/.test(entityLabel(entity)))
  const downloadLabel = downloadSpeed ? formatSpeed(downloadSpeed) : null
  const uploadLabel = uploadSpeed ? formatSpeed(uploadSpeed) : null
  const speedLabel = downloadLabel && uploadLabel ? `${downloadLabel} down · ${uploadLabel} up` : downloadLabel ?? 'Speed unavailable'
  return { networkName, speedLabel }
}
