import { useMemo } from 'react'
import { groupEntities } from '../lib/entityGroups'
import { matchesWords, networkSummary, sensorTemperature, weatherTemperature } from '../lib/homeEntities'
import type { EntityState } from '../types/homeAssistant'
import { useClock } from './useClock'
import { useHomeAssistant } from './useHomeAssistant'
import { useNearbyAircraft } from './useNearbyAircraft'
import { useOvernightLow } from './useOvernightLow'
import { useRailBoard } from './useRailBoard'

const byName = (entity: EntityState) => entity.attributes.friendly_name ?? entity.entity_id

export const useDashboardData = () => {
  const { entities, status, error, callService } = useHomeAssistant()
  const aircraftState = useNearbyAircraft()
  const rail = useRailBoard()
  const overnightLow = useOvernightLow(status)
  const now = useClock()

  const dashboard = useMemo(() => {
    const entityList = Object.values(entities).sort((left, right) => byName(left).localeCompare(byName(right)))
    const roborockEntities = entityList.filter((entity) => entity.entity_id.includes('roborock'))
    const grouped = groupEntities(entityList.filter((entity) => !entity.entity_id.includes('roborock')))
    const lightEntities = [...grouped.lights].sort((left, right) => {
      const leftRank = left.state === 'on' ? 0 : 1
      const rightRank = right.state === 'on' ? 0 : 1
      if (leftRank !== rightRank) return leftRank - rightRank
      return byName(left).localeCompare(byName(right))
    })
    const cameraEntities = grouped.cameras
    const noahCamera = cameraEntities.find((entity) => entity.entity_id === 'camera.noah_noahs_camera_camera')
      ?? cameraEntities.find((entity) => matchesWords(entity, ['noahs camera camera']))
    const alarmEntities = entityList.filter(({ entity_id }) => entity_id.startsWith('alarm_control_panel.'))
    const primaryAlarm = alarmEntities[0]

    return {
      cameraEntities,
      cameraControls: grouped.cameraControls,
      playerEntities: grouped.players,
      remoteEntities: grouped.remotes,
      lightEntities,
      securityActions: grouped.securityActions,
      securityReadings: grouped.securityReadings,
      climateEntities: grouped.climate,
      buttonEntities: grouped.buttons,
      controlEntities: grouped.controls,
      houseSensors: grouped.houseSensors,
      houseUpdates: grouped.houseUpdates,
      houseLists: grouped.houseLists,
      houseOther: grouped.houseOther,
      noahCamera,
      primaryAlarm,
      roborockEntities,
      outsideTemperature: weatherTemperature(entities['weather.forecast_home']),
      insideTemperature: sensorTemperature(entities['sensor.noah_noahs_camera_temperature']),
      ...networkSummary(entityList),
    }
  }, [entities])

  const connectionLabel = status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting' : status === 'error' ? 'Connection issue' : 'Disconnected'

  return {
    status,
    error,
    callService,
    now,
    connectionLabel,
    aircraft: aircraftState.aircraft,
    aircraftStatus: aircraftState.status,
    aircraftError: aircraftState.error,
    departures: rail.departures,
    railStatus: rail.status,
    railError: rail.error,
    railNotice: rail.notice,
    overnightLow,
    ...dashboard,
  }
}
