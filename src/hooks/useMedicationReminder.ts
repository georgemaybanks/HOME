import { useCallback, useEffect, useState } from 'react'
import {
  MEDICATION_CHANGED_EVENT,
  MEDICATION_CLEARS,
  MEDICATION_STORAGE_KEY,
  londonMedicationDay,
  medicationRecord,
  readClears,
} from '../lib/medicationReminder'

const readStoredClears = (date: string) => {
  try {
    return readClears(window.localStorage.getItem(MEDICATION_STORAGE_KEY), date)
  } catch {
    return 0
  }
}

export const useMedicationReminder = () => {
  const [now, setNow] = useState(() => new Date())
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible')
  const [clears, setClears] = useState(0)
  const [ready, setReady] = useState(false)
  const day = londonMedicationDay(now)

  useEffect(() => {
    const sync = () => {
      const nextNow = new Date()
      setNow(nextNow)
      setVisible(document.visibilityState === 'visible')
      setClears(readStoredClears(londonMedicationDay(nextNow).date))
      setReady(true)
    }
    const tick = window.setInterval(sync, 1000)
    document.addEventListener('visibilitychange', sync)
    window.addEventListener(MEDICATION_CHANGED_EVENT, sync)
    return () => {
      window.clearInterval(tick)
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener(MEDICATION_CHANGED_EVENT, sync)
    }
  }, [])

  useEffect(() => {
    setClears(readStoredClears(day.date))
    setReady(true)
  }, [day.date])

  const acknowledge = useCallback(() => {
    setClears((current) => {
      const next = Math.min(current + 1, MEDICATION_CLEARS)
      try {
        window.localStorage.setItem(MEDICATION_STORAGE_KEY, medicationRecord(day.date, next))
      } catch {
        // The overlay still closes for this visit if storage is blocked.
      }
      return next
    })
  }, [day.date])

  return {
    showing: ready && visible && day.due && clears < MEDICATION_CLEARS,
    clears,
    acknowledge,
  }
}
