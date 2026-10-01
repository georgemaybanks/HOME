import { useEffect, useState } from 'react'

export interface FlightRoute {
  origin: string | null
  destination: string | null
  status: 'idle' | 'loading' | 'ready'
}

const emptyRoute: FlightRoute = { origin: null, destination: null, status: 'idle' }

export function useFlightRoute(callsign: string | null): FlightRoute {
  const [route, setRoute] = useState<FlightRoute>(emptyRoute)

  useEffect(() => {
    if (!callsign) {
      setRoute(emptyRoute)
      return undefined
    }

    let active = true
    const controller = new AbortController()
    setRoute({ origin: null, destination: null, status: 'loading' })

    const load = async () => {
      try {
        const response = await fetch(`/api/aircraft-route?callsign=${encodeURIComponent(callsign)}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Route lookup failed.')
        const result = await response.json() as { origin: string | null; destination: string | null }
        if (active) setRoute({ origin: result.origin, destination: result.destination, status: 'ready' })
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return
        if (active) setRoute({ origin: null, destination: null, status: 'ready' })
      }
    }

    void load()
    return () => {
      active = false
      controller.abort()
    }
  }, [callsign])

  return route
}
