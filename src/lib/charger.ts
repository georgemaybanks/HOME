import type { EntityState } from '../types/homeAssistant'

const POD_CONNECTED = new Set([
  'charging',
  'connected-waiting-for-schedule',
  'suspended-ev',
  'suspended-evse',
  'charge-override',
])

const podLabel = (entity: EntityState) =>
  `${entity.entity_id} ${typeof entity.attributes.friendly_name === 'string' ? entity.attributes.friendly_name : ''}`.toLowerCase()

const isPodPoint = (entity: EntityState) => {
  const label = podLabel(entity)
  return entity.attributes.integration === 'pod_point' || label.includes('pod_point') || label.includes('podpoint') || label.includes('pod point') || label.includes('psl_')
}

export const podPointCarConnected = (entities: EntityState[]) => {
  const cables = entities.filter((entity) => isPodPoint(entity) && entity.entity_id.startsWith('binary_sensor.') && (entity.entity_id.endsWith('_cable_status') || podLabel(entity).includes('cable status')))
  if (cables.length) return cables.some((entity) => entity.state === 'on')
  return entities.some((entity) => isPodPoint(entity) && entity.entity_id.startsWith('sensor.') && entity.entity_id.endsWith('_status') && POD_CONNECTED.has(entity.state))
}

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
