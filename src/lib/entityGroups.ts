import type { EntityState } from '../types/homeAssistant'
import { chargerWords, matchesWords } from './homeEntities'

export interface EntityGroups {
  cameras: EntityState[]
  cameraControls: EntityState[]
  lights: EntityState[]
  securityActions: EntityState[]
  securityReadings: EntityState[]
  climate: EntityState[]
  players: EntityState[]
  remotes: EntityState[]
  buttons: EntityState[]
  controls: EntityState[]
  houseSensors: EntityState[]
  houseUpdates: EntityState[]
  houseLists: EntityState[]
  houseOther: EntityState[]
}

const emptyGroups = (): EntityGroups => ({
  cameras: [],
  cameraControls: [],
  lights: [],
  securityActions: [],
  securityReadings: [],
  climate: [],
  players: [],
  remotes: [],
  buttons: [],
  controls: [],
  houseSensors: [],
  houseUpdates: [],
  houseLists: [],
  houseOther: [],
})

const domainOf = (entity: EntityState) => entity.entity_id.split('.')[0]

const labelOf = (entity: EntityState) => `${entity.entity_id} ${entity.attributes.friendly_name ?? ''}`.toLowerCase()

const isClimate = (entity: EntityState) => {
  const unit = typeof entity.attributes.unit_of_measurement === 'string' ? entity.attributes.unit_of_measurement : ''
  if (unit === '°C' || unit === '°F' || unit === '%' || /lx/i.test(unit)) return true
  const label = labelOf(entity)
  return /temperature|humidity|illuminance|sensor\.sun_|sun next/.test(label)
}

export const displayName = (entity: EntityState) => {
  const name = entity.attributes.friendly_name ?? entity.entity_id
  return name.replace(/^\S+@\S+\s+/, '')
}

export const groupEntities = (entityList: EntityState[]) => {
  const groups = emptyGroups()
  entityList.forEach((entity) => {
    const domain = domainOf(entity)
    const label = labelOf(entity)
    if (domain === 'camera') groups.cameras.push(entity)
    else if (domain === 'light') groups.lights.push(entity)
    else if (domain === 'alarm_control_panel') groups.securityActions.push(entity)
    else if (domain === 'media_player') groups.players.push(entity)
    else if (domain === 'remote') groups.remotes.push(entity)
    else if (domain === 'button') groups.buttons.push(entity)
    else if (domain === 'switch' && /motion detection|camera power/.test(label)) groups.cameraControls.push(entity)
    else if (domain === 'binary_sensor' && /motion|sound|battery/.test(label)) groups.securityReadings.push(entity)
    else if (domain === 'weather' || domain === 'sun' || isClimate(entity)) groups.climate.push(entity)
    else if (domain === 'switch' || domain === 'select' || matchesWords(entity, chargerWords)) groups.controls.push(entity)
    else if (domain === 'sensor' || domain === 'binary_sensor') groups.houseSensors.push(entity)
    else if (domain === 'update') groups.houseUpdates.push(entity)
    else if (domain === 'todo') groups.houseLists.push(entity)
    else groups.houseOther.push(entity)
  })
  return groups
}
