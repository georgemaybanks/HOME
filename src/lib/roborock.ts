import { labelState } from './homeEntities'
import type { CallService } from '../types/dashboard'
import type { EntityState } from '../types/homeAssistant'

export const VACUUM_ID = 'vacuum.roborock_qv_35s'
export const CLEANING_MODE_ID = 'select.roborock_qv_35s_cleaning_mode'

const find = (entities: EntityState[], id: string) => entities.find((entity) => entity.entity_id === id)

const readable = (state: string | undefined) => {
  if (!state || state === 'unknown' || state === 'unavailable') return null
  return labelState(state)
}

const hoursLeft = (entity: EntityState | undefined) => {
  const hours = Number(entity?.state)
  if (!entity || !Number.isFinite(hours)) return '—'
  if (hours <= 0) return '0 min'
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`
  if (hours < 48) return `${Math.round(hours)} h`
  return `${Math.round(hours / 24)} days`
}

const problem = (entity: EntityState | undefined, whenOn: string) => {
  if (!entity) return '—'
  return entity.state === 'on' ? whenOn : 'OK'
}

export interface RoborockFact {
  label: string
  value: string
  warning: boolean
}

export interface RoborockSummary {
  vacuum: EntityState | undefined
  status: string
  running: boolean
  paused: boolean
  facts: RoborockFact[]
  water: RoborockFact[]
  clean: RoborockFact[]
  lifetime: RoborockFact[]
  maintenance: RoborockFact[]
  controls: EntityState[]
  routines: EntityState[]
}

export const roborockSummary = (entities: EntityState[]): RoborockSummary => {
  const statusEntity = find(entities, 'sensor.roborock_qv_35s_status')
  const status = readable(statusEntity?.state) ?? readable(find(entities, VACUUM_ID)?.state) ?? 'Unknown'
  const rawStatus = statusEntity?.state ?? ''
  const running = /clean|mop|return|emptying|washing|docking|going_to/.test(rawStatus)
  const paused = rawStatus === 'paused'
  const maintenance = [
    ['Main brush', 'sensor.roborock_qv_35s_main_brush_time_left'],
    ['Side brush', 'sensor.roborock_qv_35s_side_brush_time_left'],
    ['Filter', 'sensor.roborock_qv_35s_filter_time_left'],
    ['Sensors', 'sensor.roborock_qv_35s_sensor_time_left'],
    ['Strainer', 'sensor.roborock_qv_35s_dock_strainer_time_left'],
  ].map(([label, id]) => {
    const entity = find(entities, id)
    const hours = Number(entity?.state)
    return { label, value: hoursLeft(entity), warning: Number.isFinite(hours) && hours < 24 }
  })
  const waterShortage = find(entities, 'binary_sensor.roborock_qv_35s_water_shortage')
  const cleanTank = find(entities, 'binary_sensor.roborock_qv_35s_dock_clean_water_box')
  const dirtyTank = find(entities, 'binary_sensor.roborock_qv_35s_dock_dirty_water_box')
  const vacuumError = find(entities, 'sensor.roborock_qv_35s_vacuum_error')
  const dockError = find(entities, 'sensor.roborock_qv_35s_dock_dock_error')
  const drying = find(entities, 'sensor.roborock_qv_35s_dock_mop_drying_remaining_time')
  const dryingHours = Number(drying?.state)
  const battery = find(entities, 'sensor.roborock_qv_35s_battery')

  return {
    vacuum: find(entities, VACUUM_ID),
    status,
    running,
    paused,
    facts: [
      { label: 'Battery', value: reading(battery), warning: Number(battery?.state) < 20 },
      { label: 'Water', value: problem(waterShortage, 'Low'), warning: waterShortage?.state === 'on' },
      { label: 'Clean tank', value: problem(cleanTank, 'Check'), warning: cleanTank?.state === 'on' },
      { label: 'Dirty tank', value: problem(dirtyTank, 'Full'), warning: dirtyTank?.state === 'on' },
      ...fault('Error', vacuumError),
      ...fault('Dock', dockError),
    ],
    water: [
      { label: 'Battery', value: reading(battery), warning: Number(battery?.state) < 20 },
      { label: 'Water', value: problem(waterShortage, 'Low'), warning: waterShortage?.state === 'on' },
      { label: 'Clean tank', value: problem(cleanTank, 'Check'), warning: cleanTank?.state === 'on' },
      { label: 'Dirty tank', value: problem(dirtyTank, 'Full'), warning: dirtyTank?.state === 'on' },
      { label: 'Water box', value: attached(find(entities, 'binary_sensor.roborock_qv_35s_water_box_attached')), warning: find(entities, 'binary_sensor.roborock_qv_35s_water_box_attached')?.state === 'off' },
      { label: 'Mop', value: attached(find(entities, 'binary_sensor.roborock_qv_35s_mop_attached')), warning: find(entities, 'binary_sensor.roborock_qv_35s_mop_attached')?.state === 'off' },
      { label: 'Mop intensity', value: readable(find(entities, 'select.roborock_qv_35s_mop_intensity')?.state) ?? '—', warning: false },
      { label: 'Drying', value: dryingHours > 0 ? hoursLeft(drying) : 'Off', warning: false },
    ],
    clean: [
      { label: 'Area', value: reading(find(entities, 'sensor.roborock_qv_35s_cleaning_area')), warning: false },
      { label: 'Time', value: reading(find(entities, 'sensor.roborock_qv_35s_cleaning_time')), warning: false },
      { label: 'Progress', value: reading(find(entities, 'sensor.roborock_qv_35s_cleaning_progress')), warning: false },
      { label: 'Room', value: readable(find(entities, 'sensor.roborock_qv_35s_current_room')?.state) ?? '—', warning: false },
      { label: 'Started', value: when(find(entities, 'sensor.roborock_qv_35s_last_clean_begin')), warning: false },
      { label: 'Finished', value: when(find(entities, 'sensor.roborock_qv_35s_last_clean_end')), warning: false },
      { label: 'Quiet hours', value: `${clock(find(entities, 'time.roborock_qv_35s_do_not_disturb_begin'))}–${clock(find(entities, 'time.roborock_qv_35s_do_not_disturb_end'))}`, warning: false },
      ...fault('Error', vacuumError),
      ...fault('Dock', dockError),
    ],
    lifetime: [
      { label: 'Cleans', value: reading(find(entities, 'sensor.roborock_qv_35s_total_cleaning_count')), warning: false },
      { label: 'Area', value: reading(find(entities, 'sensor.roborock_qv_35s_total_cleaning_area')), warning: false },
      { label: 'Time', value: reading(find(entities, 'sensor.roborock_qv_35s_total_cleaning_time')), warning: false },
    ],
    maintenance,
    controls: entities.filter((entity) => /^(select|switch)\./.test(entity.entity_id) && entity.entity_id.includes('roborock')),
    routines: entities.filter((entity) => entity.entity_id.startsWith('button.roborock')),
  }
}

export const startVacAndMop = async (callService: CallService) => {
  await callService('select', 'select_option', { entity_id: CLEANING_MODE_ID, option: 'vac_and_mop' })
  await callService('vacuum', 'start', { entity_id: VACUUM_ID })
}

const quietStates = new Set(['none', 'ok', 'unknown', 'unavailable'])

const fault = (label: string, entity: EntityState | undefined): RoborockFact[] => {
  if (!entity || quietStates.has(entity.state)) return []
  return [{ label, value: readable(entity.state) ?? entity.state, warning: true }]
}

const clock = (entity: EntityState | undefined) => (entity && entity.state !== 'unknown' && entity.state !== 'unavailable' ? entity.state.slice(0, 5) : '—')

const attached = (entity: EntityState | undefined) => (entity?.state === 'on' ? 'Attached' : entity?.state === 'off' ? 'Off' : '—')

const reading = (entity: EntityState | undefined) => {
  if (!entity || entity.state === 'unknown' || entity.state === 'unavailable') return '—'
  const unit = typeof entity.attributes.unit_of_measurement === 'string' ? entity.attributes.unit_of_measurement : ''
  if (unit === 'h') return hoursLeft(entity)
  const value = Number(entity.state)
  if (!Number.isFinite(value)) return readable(entity.state) ?? '—'
  if (unit === '%') return `${Math.round(value)}%`
  if (unit === 'm²') return `${Math.round(value * 10) / 10} m²`
  return unit ? `${Math.round(value * 10) / 10} ${unit}` : String(Math.round(value * 10) / 10)
}

const when = (entity: EntityState | undefined) => {
  if (!entity || entity.state === 'unknown' || entity.state === 'unavailable') return '—'
  const date = new Date(entity.state)
  if (Number.isNaN(date.getTime())) return entity.state
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
}
