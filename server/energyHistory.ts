import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export interface StoredEnergyDay {
  electricCost: number | null
  gasCost: number | null
  electricKwh: number | null
  gasKwh: number | null
}

const historyFile = path.join(process.cwd(), 'data', 'energy-history.json')
const dayPattern = /^\d{4}-\d{2}-\d{2}$/

const finite = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

const emptyDay = (): StoredEnergyDay => ({ electricCost: null, gasCost: null, electricKwh: null, gasKwh: null })

const normalize = (days: unknown): Record<string, StoredEnergyDay> => {
  if (!days || typeof days !== 'object') return {}
  return Object.entries(days as Record<string, unknown>).reduce<Record<string, StoredEnergyDay>>((history, [day, value]) => {
    if (!dayPattern.test(day) || !value || typeof value !== 'object') return history
    const record = value as Record<string, unknown>
    history[day] = {
      electricCost: finite(record.electricCost),
      gasCost: finite(record.gasCost),
      electricKwh: finite(record.electricKwh),
      gasKwh: finite(record.gasKwh),
    }
    return history
  }, {})
}

export const readEnergyHistory = async () => {
  try {
    const raw = JSON.parse(await readFile(historyFile, 'utf8')) as { days?: unknown }
    return normalize(raw.days)
  } catch {
    return {}
  }
}

export const saveEnergyDays = async (incoming: unknown) => {
  const current = await readEnergyHistory()
  Object.entries(normalize(incoming)).forEach(([day, next]) => {
    const previous = current[day] ?? emptyDay()
    current[day] = {
      electricCost: next.electricCost ?? previous.electricCost,
      gasCost: next.gasCost ?? previous.gasCost,
      electricKwh: next.electricKwh ?? previous.electricKwh,
      gasKwh: next.gasKwh ?? previous.gasKwh,
    }
  })
  await mkdir(path.dirname(historyFile), { recursive: true })
  await writeFile(historyFile, `${JSON.stringify({ days: current }, null, 2)}\n`)
  return current
}
