export const MEDICATION_CLEARS = 3
export const MEDICATION_HOUR = 8
export const MEDICATION_STORAGE_KEY = 'casa-medication-clears'

export interface MedicationDay {
  date: string
  due: boolean
}

const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) =>
  parts.find((item) => item.type === type)?.value ?? ''

export const londonMedicationDay = (now: Date): MedicationDay => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const hour = Number(part(parts, 'hour')) % 24

  return {
    date: `${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}`,
    due: hour >= MEDICATION_HOUR,
  }
}

export const readClears = (stored: string | null, date: string) => {
  if (!stored) return 0
  try {
    const parsed = JSON.parse(stored) as { date?: unknown; clears?: unknown }
    if (parsed.date !== date || !Number.isInteger(parsed.clears)) return 0
    return Math.min(Math.max(parsed.clears as number, 0), MEDICATION_CLEARS)
  } catch {
    return 0
  }
}

export const medicationRecord = (date: string, clears: number) =>
  JSON.stringify({ date, clears: Math.min(Math.max(clears, 0), MEDICATION_CLEARS) })

export const medicationTakenToday = (now: Date, stored: string | null) =>
  readClears(stored, londonMedicationDay(now).date) >= MEDICATION_CLEARS
