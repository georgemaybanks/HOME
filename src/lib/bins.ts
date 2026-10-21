export type BinId = 'waste' | 'recycling' | 'green'

export interface BinDay {
  id: BinId
  label: string
  weekday: number
}

export interface CollectionDate {
  year: number
  month: number
  day: number
}

const DAY_LABELS = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat']
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

export const BIN_DAYS: BinDay[] = [
  { id: 'waste', label: 'Waste', weekday: 2 },
  { id: 'recycling', label: 'Recycling', weekday: 2 },
  { id: 'green', label: 'Green', weekday: 2 },
]

const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) =>
  parts.find((item) => item.type === type)?.value ?? ''

export const londonCalendar = (now: Date): CollectionDate & { weekday: number } => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(now)
  return {
    year: Number(part(parts, 'year')),
    month: Number(part(parts, 'month')),
    day: Number(part(parts, 'day')),
    weekday: WEEKDAY_INDEX[part(parts, 'weekday')] ?? 0,
  }
}

const addDays = (date: CollectionDate, days: number): CollectionDate => {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days))
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() }
}

export const nextCollection = (now: Date, weekday: number) => {
  const today = londonCalendar(now)
  const daysUntil = (weekday - today.weekday + 7) % 7
  return {
    date: addDays(today, daysUntil),
    due: daysUntil === 0,
    dayLabel: DAY_LABELS[weekday] ?? 'Tues',
  }
}

const dateValue = (date: CollectionDate) => date.year * 10000 + date.month * 100 + date.day

export const parseIsoDate = (value: string): CollectionDate | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

const weekdayOf = (date: CollectionDate) => new Date(Date.UTC(date.year, date.month - 1, date.day, 12)).getUTCDay()

export const upcoming = (now: Date, date: CollectionDate) => {
  const today = londonCalendar(now)
  let cursor = date
  while (dateValue(cursor) < dateValue(today)) cursor = addDays(cursor, 7)
  return {
    date: cursor,
    due: dateValue(cursor) === dateValue(today),
    dayLabel: DAY_LABELS[weekdayOf(cursor)] ?? 'Tues',
  }
}

export interface BinRound {
  waste: string
  recycling: string
  green: string
}

export const binLines = (now: Date, round: Partial<BinRound> | null) =>
  BIN_DAYS.map((bin) => {
    const parsed = round?.[bin.id] ? parseIsoDate(round[bin.id] ?? '') : null
    const collection = parsed ? upcoming(now, parsed) : nextCollection(now, bin.weekday)
    return { ...bin, ...collection, dateLabel: formatCollectionDate(collection.date) }
  })

const daySpan = (from: CollectionDate, to: CollectionDate) =>
  Math.round((Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / 86_400_000)

export const binCountdown = (now: Date, round: Partial<BinRound> | null) => {
  const lines = binLines(now, round)
  const soonest = lines.reduce((best, line) => (dateValue(line.date) < dateValue(best.date) ? line : best))
  return {
    days: daySpan(londonCalendar(now), soonest.date),
    bins: lines.map((line) => ({ ...line, collected: dateValue(line.date) === dateValue(soonest.date) })),
  }
}

export const formatCollectionDate = (date: CollectionDate) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(
    new Date(Date.UTC(date.year, date.month - 1, date.day, 12)),
  )
