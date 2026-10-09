import { useEffect, useMemo, useRef, useState } from 'react'
import type { EntityState } from '../types/homeAssistant'
import { useHomeAssistant } from './useHomeAssistant'

export interface FuelReading {
  kwh: number | null
  cost: number | null
  rate: number | null
  standing: number | null
  period: 'today' | 'yesterday' | null
}

export interface EnergyUsage {
  electric: FuelReading
  gas: FuelReading
  points: number | null
  averageSpend: number | null
  averageDays: number
  carConnected: boolean
  predictedMonthly: number | null
  predictionDays: number
}

interface StoredEnergyDay {
  electricCost: number | null
  gasCost: number | null
  electricKwh: number | null
  gasKwh: number | null
}

export interface EnergyDay {
  label: string
  electricKwh: number | null
  gasKwh: number | null
  electricCost: number | null
  gasCost: number | null
}

export interface EnergyMonth {
  label: string
  electricKwh: number | null
  gasKwh: number | null
  electricCost: number | null
  gasCost: number | null
  days: number
  total: number | null
  complete: boolean
}

interface DailyCost {
  electric: number | null
  gas: number | null
}

const londonDay = (value: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)

const recentDays = () => Array.from({ length: 7 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() - (7 - index))
  return londonDay(date)
})

export const formatKwh = (value: number | null) => {
  if (value == null) return '—'
  const digits = value !== 0 && Math.abs(value) < 1 ? 2 : 1
  return `${value.toFixed(digits)} kWh`
}

export const formatPounds = (value: number | null) => (value == null ? '—' : `£${value.toFixed(2)}`)

export const formatPence = (value: number | null) => (value == null ? '—' : `${(value * 100).toFixed(1)}p`)

const numberState = (entity: EntityState | undefined) => {
  if (!entity) return null
  const value = Number(entity.state)
  return Number.isFinite(value) ? value : null
}

const usageDate = (entity: EntityState | undefined) => {
  const charges = entity?.attributes.charges
  const first = Array.isArray(charges) ? charges[0] : null
  const start = first && typeof first === 'object' && 'start' in first ? String(first.start) : null
  const raw = start || (typeof entity?.attributes.last_reset === 'string' ? entity.attributes.last_reset : null)
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

const pick = (sensors: EntityState[], fuel: 'electricity' | 'gas', suffix: string) =>
  sensors.find((entity) => entity.entity_id.includes(`_${fuel}_`) && entity.entity_id.endsWith(suffix))

const fuelReading = (sensors: EntityState[], fuel: 'electricity' | 'gas', currentSuffix: string, previousSuffix: string): FuelReading & { date: Date | null } => {
  const current = pick(sensors, fuel, currentSuffix)
  const previous = pick(sensors, fuel, previousSuffix)
  const chosen = numberState(current) != null ? current : previous
  const period = chosen && chosen === current ? 'today' : chosen ? 'yesterday' : null
  return {
    kwh: numberState(chosen),
    cost: numberState(pick(sensors, fuel, period === 'today' ? 'current_accumulative_cost' : 'previous_accumulative_cost')),
    rate: numberState(pick(sensors, fuel, 'current_rate')),
    standing: numberState(pick(sensors, fuel, 'current_standing_charge')),
    period,
    date: usageDate(chosen),
  }
}

const buildWeek = (stored: Record<string, StoredEnergyDay>, electric: FuelReading & { date: Date | null }, gas: FuelReading & { date: Date | null }): EnergyDay[] => (
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const key = londonDay(date)
    const saved = stored[key]
    const electricMatch = electric.date && londonDay(electric.date) === key
    const gasMatch = gas.date && londonDay(gas.date) === key
    return {
      label: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
      electricKwh: saved?.electricKwh ?? (electricMatch ? electric.kwh : null),
      gasKwh: saved?.gasKwh ?? (gasMatch ? gas.kwh : null),
      electricCost: saved?.electricCost ?? (electricMatch ? electric.cost : null),
      gasCost: saved?.gasCost ?? (gasMatch ? gas.cost : null),
    }
  })
)

const costDay = (point: Record<string, unknown>) => {
  const reset = typeof point.last_reset === 'number' ? point.last_reset : typeof point.last_reset === 'string' ? Date.parse(point.last_reset) : Number.NaN
  const start = typeof point.start === 'number' ? point.start - 24 * 60 * 60 * 1000 : Number.NaN
  const when = Number.isFinite(reset) ? reset : start
  return Number.isFinite(when) ? londonDay(new Date(when)) : null
}

const costsFromStatistics = (result: unknown): Record<string, DailyCost> => {
  const root = result && typeof result === 'object' ? result as Record<string, unknown> : {}
  const days: Record<string, DailyCost> = {}
  Object.entries(root).forEach(([id, points]) => {
    const fuel = id.includes('_electricity_') ? 'electric' : id.includes('_gas_') ? 'gas' : null
    if (!fuel || !Array.isArray(points)) return
    points.forEach((point) => {
      if (!point || typeof point !== 'object') return
      const record = point as Record<string, unknown>
      const state = typeof record.state === 'number' ? record.state : null
      const day = costDay(record)
      if (state == null || !day) return
      const current = days[day] ?? { electric: null, gas: null }
      current[fuel] = state
      days[day] = current
    })
  })
  return days
}

const averageOf = (days: Record<string, DailyCost>) => {
  const samples = recentDays().flatMap((day) => (days[day] ? [days[day]] : []))
  if (!samples.length) return { averageSpend: null, averageDays: 0 }
  const total = samples.reduce((sum, day) => sum + (day.electric ?? 0) + (day.gas ?? 0), 0)
  return { averageSpend: total / samples.length, averageDays: samples.length }
}

const emptyStoredDay = (): StoredEnergyDay => ({ electricCost: null, gasCost: null, electricKwh: null, gasKwh: null })

const withStoredDay = (days: Record<string, StoredEnergyDay>, day: string) => {
  const copy = { ...(days[day] ?? emptyStoredDay()) }
  days[day] = copy
  return copy
}

const liveRecords = (electric: FuelReading & { date: Date | null }, gas: FuelReading & { date: Date | null }) => {
  const days: Record<string, StoredEnergyDay> = {}
  if (electric.period !== 'today' && electric.date && (electric.cost != null || electric.kwh != null)) {
    const row = withStoredDay(days, londonDay(electric.date))
    row.electricCost = electric.cost
    row.electricKwh = electric.kwh
  }
  if (gas.period !== 'today' && gas.date && (gas.cost != null || gas.kwh != null)) {
    const row = withStoredDay(days, londonDay(gas.date))
    row.gasCost = gas.cost
    row.gasKwh = gas.kwh
  }
  return days
}

const mergeStored = (stored: Record<string, StoredEnergyDay>, statistics: Record<string, DailyCost>, live: Record<string, StoredEnergyDay>) => {
  const days: Record<string, StoredEnergyDay> = { ...stored }
  Object.entries(statistics).forEach(([day, cost]) => {
    const row = withStoredDay(days, day)
    if (cost.electric != null) row.electricCost = cost.electric
    if (cost.gas != null) row.gasCost = cost.gas
  })
  Object.entries(live).forEach(([day, reading]) => {
    const row = withStoredDay(days, day)
    if (reading.electricCost != null) row.electricCost = reading.electricCost
    if (reading.gasCost != null) row.gasCost = reading.gasCost
    if (reading.electricKwh != null) row.electricKwh = reading.electricKwh
    if (reading.gasKwh != null) row.gasKwh = reading.gasKwh
  })
  return days
}

const monthPrediction = (days: Record<string, StoredEnergyDay>) => {
  const samples = Object.entries(days)
    .filter(([, day]) => day.electricCost != null || day.gasCost != null)
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-30)
  if (!samples.length) return { predictedMonthly: null, predictionDays: 0 }
  const average = samples.reduce((sum, [, day]) => sum + (day.electricCost ?? 0) + (day.gasCost ?? 0), 0) / samples.length
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return { predictedMonthly: average * daysInMonth, predictionDays: samples.length }
}

const sumField = (records: StoredEnergyDay[], field: keyof StoredEnergyDay) => records.reduce<number | null>((sum, day) => {
  const value = day[field]
  return value == null ? sum : (sum ?? 0) + value
}, null)

const buildMonths = (stored: Record<string, StoredEnergyDay>) => {
  const groups = new Map<string, StoredEnergyDay[]>()
  Object.entries(stored).forEach(([day, record]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return
    const key = day.slice(0, 7)
    groups.set(key, [...(groups.get(key) ?? []), record])
  })
  let projectedSum = 0
  let projectedCount = 0
  const months = [...groups.entries()].sort(([left], [right]) => right.localeCompare(left)).map(([key, records]): EnergyMonth => {
    const [year, month] = key.split('-').map(Number)
    const electricCost = sumField(records, 'electricCost')
    const gasCost = sumField(records, 'gasCost')
    const days = records.filter((day) => day.electricCost != null || day.gasCost != null || day.electricKwh != null || day.gasKwh != null).length
    const length = new Date(year, month, 0).getDate()
    const total = electricCost == null && gasCost == null ? null : (electricCost ?? 0) + (gasCost ?? 0)
    if (total != null && days > 0) {
      projectedSum += (total / days) * length
      projectedCount += 1
    }
    return {
      label: new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      electricKwh: sumField(records, 'electricKwh'),
      gasKwh: sumField(records, 'gasKwh'),
      electricCost,
      gasCost,
      days,
      total,
      complete: days >= length,
    }
  })
  return { months, averageMonthly: projectedCount ? projectedSum / projectedCount : null }
}

export function useEnergy() {
  const { entities, status, command } = useHomeAssistant()
  const [history, setHistory] = useState<Record<string, DailyCost>>({})
  const [stored, setStored] = useState<Record<string, StoredEnergyDay>>({})
  const posted = useRef('')
  const costIds = useMemo(
    () => Object.values(entities)
      .filter((entity) => entity.entity_id.startsWith('sensor.octopus_energy_') && entity.entity_id.endsWith('_accumulative_cost') && !entity.entity_id.includes('export'))
      .map((entity) => entity.entity_id)
      .sort(),
    [entities],
  )
  const costKey = costIds.join('|')

  useEffect(() => {
    if (status !== 'connected' || !costKey) return undefined
    let active = true
    const load = async () => {
      const start = new Date()
      start.setDate(start.getDate() - 370)
      try {
        const result = await command('recorder/statistics_during_period', {
          start_time: start.toISOString(),
          statistic_ids: costKey.split('|'),
          period: 'day',
          types: ['state', 'last_reset'],
        })
        if (active) setHistory(costsFromStatistics(result))
      } catch {
        if (active) setHistory({})
      }
    }
    void load()
    const timer = window.setInterval(() => void load(), 30 * 60 * 1000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [status, command, costKey])

  const reading = useMemo(() => {
    const sensors = Object.values(entities).filter((entity) => entity.entity_id.startsWith('sensor.octopus_energy_') && !entity.entity_id.includes('export'))
    const electric = fuelReading(sensors, 'electricity', 'current_accumulative_consumption', 'previous_accumulative_consumption')
    const gas = fuelReading(sensors, 'gas', 'current_accumulative_consumption_kwh', 'previous_accumulative_consumption_kwh')
    const persisted = mergeStored(stored, history, liveRecords(electric, gas))
    const costs = Object.entries(persisted).reduce<Record<string, DailyCost>>((days, [day, record]) => {
      days[day] = { electric: record.electricCost, gas: record.gasCost }
      return days
    }, {})
    return { electric, gas, persisted, costs, points: numberState(sensors.find((entity) => entity.entity_id.endsWith('_octoplus_points'))) }
  }, [entities, history, stored])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetch('/api/energy-history')
        if (!response.ok) return
        const body = await response.json() as { days?: Record<string, StoredEnergyDay> }
        if (active && body.days) setStored(body.days)
      } catch {
        // The latest Octopus day still shows until the history file is available.
      }
    }
    void load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    const days = mergeStored({}, history, liveRecords(reading.electric, reading.gas))
    const payload = JSON.stringify(days)
    if (payload === '{}' || payload === posted.current) return undefined
    posted.current = payload
    let active = true
    const save = async () => {
      try {
        const response = await fetch('/api/energy-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ days }),
        })
        if (!response.ok) throw new Error('Energy history was not saved.')
        const body = await response.json() as { days?: Record<string, StoredEnergyDay> }
        if (active && body.days) setStored(body.days)
      } catch {
        posted.current = ''
      }
    }
    void save()
    return () => { active = false }
  }, [history, reading.electric, reading.gas])

  return useMemo(() => {
    const { electric, gas, persisted, costs, points } = reading
    const connected = electric.cost != null || gas.cost != null || electric.kwh != null || gas.kwh != null
    const waitingForToday = connected && electric.period !== 'today' && gas.period !== 'today'
    return {
      today: { electric, gas, points, carConnected: false, ...averageOf(costs), ...monthPrediction(persisted) },
      week: buildWeek(persisted, electric, gas),
      ...buildMonths(persisted),
      notice: !connected
        ? 'Octopus Energy is not reporting yet.'
        : waitingForToday
          ? 'Today\'s reading has not arrived. Showing the latest complete day.'
          : '',
    }
  }, [reading])
}
