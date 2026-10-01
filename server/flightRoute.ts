interface FlightRoute {
  origin: string | null
  destination: string | null
}

interface CachedRoute extends FlightRoute {
  fetchedAt: number
}

const cache = new Map<string, CachedRoute>()
const ROUTE_TTL_MS = 6 * 60 * 60 * 1000
const MISSING_TTL_MS = 30 * 60 * 1000

const isCallsign = (value: string) => /^[A-Z0-9]{3,8}$/.test(value)

export async function lookupFlightRoute(callsign: string): Promise<FlightRoute> {
  const key = callsign.trim().toUpperCase()
  if (!isCallsign(key)) return { origin: null, destination: null }

  const cached = cache.get(key)
  const ttl = cached?.origin ? ROUTE_TTL_MS : MISSING_TTL_MS
  if (cached && Date.now() - cached.fetchedAt < ttl) {
    return { origin: cached.origin, destination: cached.destination }
  }

  const response = await fetch(`https://api.adsbdb.com/v0/callsign/${key}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'CasaMaybanksDashboard/0.1' },
    signal: AbortSignal.timeout(8_000),
  })
  if (response.status === 404) {
    const missing = { origin: null, destination: null }
    cache.set(key, { ...missing, fetchedAt: Date.now() })
    return missing
  }
  if (!response.ok) throw new Error(`Route provider returned ${response.status}.`)

  const body = await response.json() as {
    response?: {
      flightroute?: {
        origin?: { name?: string }
        destination?: { name?: string }
      }
    }
  }
  const flight = body.response?.flightroute
  const route = {
    origin: flight?.origin?.name ?? null,
    destination: flight?.destination?.name ?? null,
  }
  cache.set(key, { ...route, fetchedAt: Date.now() })
  return route
}
