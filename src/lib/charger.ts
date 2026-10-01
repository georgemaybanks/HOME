import type { EntityState } from '../types/homeAssistant'

export const chargerEntityName = (entity: EntityState) => entity.attributes.friendly_name ?? 'Charger'

export const chargerUnit = (entity: EntityState) => (
  typeof entity.attributes.unit_of_measurement === 'string' ? entity.attributes.unit_of_measurement : ''
)

export const formatChargerPower = (entity: EntityState) => {
  const unit = chargerUnit(entity)
  const value = Number(entity.state)
  if (Number.isNaN(value)) return entity.state
  if (unit === 'W') return `${(value / 1000).toFixed(1)} kW`
  if (unit === 'kW') return `${value.toFixed(1)} kW`
  return `${entity.state}${unit ? ` ${unit}` : ''}`
}

export const isChargerPower = (entity: EntityState) => {
  const unit = chargerUnit(entity)
  return entity.entity_id.startsWith('sensor.') && (unit === 'W' || unit === 'kW')
}

export const isChargerCurrentLimit = (entity: EntityState) => (
  entity.entity_id.startsWith('number.') && (chargerUnit(entity) === 'A' || /current|amp|limit/i.test(`${entity.entity_id} ${chargerEntityName(entity)}`))
)

export const isChargerControl = (entity: EntityState) => (
  entity.entity_id.startsWith('switch.') || entity.entity_id.startsWith('input_boolean.') || entity.entity_id.startsWith('button.')
)

export const numericAttribute = (entity: EntityState | undefined, key: string, fallback: number) => {
  const value = entity?.attributes[key]
  return typeof value === 'number' ? value : fallback
}
