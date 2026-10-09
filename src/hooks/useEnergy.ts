import { useMemo } from 'react'

export interface EnergyUsage {
  electricKwh: number | null
  gasKwh: number | null
}

export interface EnergyDay extends EnergyUsage {
  label: string
}

const emptyUsage = (): EnergyUsage => ({ electricKwh: null, gasKwh: null })

export const formatKwh = (value: number | null) => (value == null ? '—' : `${value.toFixed(1)} kWh`)

const recentDays = () => Array.from({ length: 7 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() - (6 - index))
  return {
    label: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
    ...emptyUsage(),
  }
})

export function useEnergy() {
  const week = useMemo(recentDays, [])

  return {
    today: emptyUsage(),
    week,
    notice: 'Daily gas and electric will appear here once the energy feed is connected.',
  }
}
