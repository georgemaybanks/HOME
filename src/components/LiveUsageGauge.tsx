import { useEffect, useState } from 'react'

const GREEN = 18
const RED = 86
const CX = 60
const CY = 66
const RADIUS = 46

const point = (degrees: number) => {
  const radians = (degrees * Math.PI) / 180
  return [CX + RADIUS * Math.cos(radians), CY - RADIUS * Math.sin(radians)]
}

const arc = (start: number, end: number) => {
  const [x1, y1] = point(start)
  const [x2, y2] = point(end)
  return `M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 0 1 ${x2} ${y2}`
}

const zones = [
  { start: 176, end: 122, color: 'stroke-gauge-green' },
  { start: 118, end: 62, color: 'stroke-gauge-amber' },
  { start: 58, end: 4, color: 'stroke-gauge-red' },
] as const

const useLiveUsage = (value: number | null) => {
  const [placeholder, setPlaceholder] = useState(GREEN)
  useEffect(() => {
    if (value != null) return undefined
    const timer = window.setInterval(() => setPlaceholder((current) => (current === GREEN ? RED : GREEN)), 30_000)
    return () => window.clearInterval(timer)
  }, [value])
  return value ?? placeholder
}

export const LiveUsageGauge = ({ value = null }: { value?: number | null }) => {
  const reading = useLiveUsage(value)
  const needle = point(180 - (reading / 100) * 180)
  return (
    <div className="flex w-[7.25rem] shrink-0 flex-col items-center justify-center gap-1 rounded-md bg-sage-mist px-1 py-3 text-center" aria-label={`Live usage ${reading}%`}>
      <span className="font-mono text-xs font-medium tracking-wide text-muted">LIVE USAGE</span>
      <svg viewBox="0 0 120 74" className="w-full" role="img">
        {zones.map((zone) => (
          <path key={zone.color} d={arc(zone.start, zone.end)} fill="none" strokeWidth="9" strokeLinecap="butt" className={zone.color} />
        ))}
        <line x1={CX} y1={CY} x2={needle[0]} y2={needle[1]} className="stroke-ink" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={CX} cy={CY} r="4" className="fill-ink" />
      </svg>
      <strong className="font-display text-xl font-bold tracking-tight text-ink">{reading}%</strong>
    </div>
  )
}
