import { Maximize2, Minimize2, Plane } from 'lucide-react'
import { useState } from 'react'
import type { AircraftStatus, NearbyAircraft } from '../hooks/useNearbyAircraft'
import { useFlightRoute } from '../hooks/useFlightRoute'
import { cn } from '../lib/cn'

const RANGE_METERS = 15_000

interface RadarScopeProps {
  aircraft: NearbyAircraft[]
  status: AircraftStatus
  error: string | null
}

const plotPoint = (bearingDegrees: number, distanceMeters: number) => {
  const reach = Math.min(distanceMeters / RANGE_METERS, 1) * 40
  const radians = ((bearingDegrees - 90) * Math.PI) / 180
  return { x: 50 + Math.cos(radians) * reach, y: 50 + Math.sin(radians) * reach }
}

const nosePoint = (origin: { x: number; y: number }, headingDegrees: number) => {
  const radians = ((headingDegrees - 90) * Math.PI) / 180
  return { x: origin.x + Math.cos(radians) * 4, y: origin.y + Math.sin(radians) * 4 }
}

export const RadarScope = ({ aircraft, status, error }: RadarScopeProps) => {
  const [expanded, setExpanded] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = aircraft.find((plane) => plane.id === selectedId) ?? null
  const route = useFlightRoute(selected?.callsign ?? null)
  const routeText = route.status === 'loading'
    ? 'Looking up the route…'
    : route.origin && route.destination
      ? `${route.origin} to ${route.destination}`
      : 'Route not listed'
  const statusText = status === 'error'
    ? error ?? 'Aircraft lookup failed.'
    : aircraft.length
      ? null
      : status === 'ready'
        ? 'No aircraft within 15 km right now.'
        : 'Checking nearby aircraft…'

  const scope = (
    <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col', expanded && 'h-full')}>
      <div className="flex items-center gap-2.5 text-sage">
        <Plane size={22} />
        <strong className="text-lg font-bold text-ink">Aircraft within 15 km</strong>
        <button
          className="ml-auto grid h-12 w-12 place-items-center rounded-lg bg-sage-mist text-ink"
          type="button"
          aria-label={expanded ? 'Close full screen radar' : 'Expand radar'}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
      <div className="relative mt-3 min-h-0 flex-1">
        <svg viewBox="0 0 100 100" className="h-full w-full rounded-md bg-camera text-stone-300" role="img" aria-label="Radar of aircraft within 15 kilometres">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeOpacity="0.35" />
          <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeOpacity="0.35" />
          <path d="M50 10 V90 M10 50 H90" fill="none" stroke="currentColor" strokeOpacity="0.25" />
          <text x="50" y="8" textAnchor="middle" fill="currentColor" fontSize="4">N</text>
          <text x="96" y="52" textAnchor="end" fill="currentColor" fontSize="4">E</text>
          <text x="50" y="98" textAnchor="middle" fill="currentColor" fontSize="4">S</text>
          <text x="4" y="52" fill="currentColor" fontSize="4">W</text>
          <circle cx="50" cy="50" r="1.4" className="fill-paper" />
          {aircraft.map((plane) => {
            const point = plotPoint(plane.bearingDegrees, plane.distanceMeters)
            const nose = nosePoint(point, plane.headingDegrees ?? plane.bearingDegrees)
            const isSelected = plane.id === selectedId
            return (
              <g key={plane.id} className="cursor-pointer" onClick={() => setSelectedId(isSelected ? null : plane.id)}>
                <circle cx={point.x} cy={point.y} r="6" fill="transparent" />
                <path d={`M${point.x} ${point.y} L${nose.x} ${nose.y}`} stroke="white" strokeWidth="0.6" />
                <circle cx={point.x} cy={point.y} r={isSelected ? 2.2 : 1.5} className={isSelected ? 'fill-clay' : 'fill-signal'} />
              </g>
            )
          })}
        </svg>
      </div>
      {selected ? (
        <button className="mt-3 rounded-md bg-sage-soft px-3 py-3 text-left" type="button" onClick={() => setSelectedId(null)}>
          <strong className="block text-lg font-bold text-ink">{selected.callsign}</strong>
          <span className="mt-1 block text-base text-ink">{routeText}</span>
          <span className="mt-1 block text-base text-muted">
            {selected.distanceMeters.toLocaleString()} m
            {selected.altitudeFeet !== null ? ` · ${selected.altitudeFeet.toLocaleString()} ft` : ''}
            {selected.speedKnots !== null ? ` · ${Math.round(selected.speedKnots)} kt` : ''}
            {selected.headingDegrees !== null ? ` · heading ${Math.round(selected.headingDegrees)}°` : ''}
          </span>
        </button>
      ) : statusText ? <p className="mt-3 text-base leading-snug text-muted" role={status === 'error' ? 'status' : undefined}>{statusText}</p> : null}
    </div>
  )

  if (expanded) {
    return <div className="fixed inset-0 z-30 flex bg-paper p-5">{scope}</div>
  }

  return <article className="flex min-h-0 min-w-0 flex-1 flex-col rounded-md border border-line bg-white px-4 pb-3 pt-3.5">{scope}</article>
}
