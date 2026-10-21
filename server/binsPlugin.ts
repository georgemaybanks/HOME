import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { loadMedwayRound, type MedwayRound } from './medwayBins'

const FRESH_MS = 6 * 60 * 60 * 1000

const send = (response: ServerResponse, status: number, payload: unknown) => {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(payload))
}

export function binsPlugin(env: Record<string, string>): Plugin {
  const postcode = (env.BIN_POSTCODE || 'ME8 7NU').trim()
  const uprn = (env.BIN_UPRN || '').trim()
  let cached: { at: number; round: MedwayRound } | null = null

  const round = async () => {
    if (cached && Date.now() - cached.at < FRESH_MS) return cached.round
    const next = await loadMedwayRound(postcode, uprn)
    cached = { at: Date.now(), round: next }
    return next
  }

  const handler = async (_request: IncomingMessage, response: ServerResponse) => {
    try {
      const next = await round()
      send(response, 200, {
        postcode: next.postcode,
        day: next.day,
        nextCollection: next.nextCollection,
        bins: { waste: next.nextCollection, recycling: next.nextCollection, green: next.nextCollection },
      })
    } catch (error) {
      if (cached) {
        send(response, 200, {
          postcode: cached.round.postcode,
          day: cached.round.day,
          nextCollection: cached.round.nextCollection,
          bins: { waste: cached.round.nextCollection, recycling: cached.round.nextCollection, green: cached.round.nextCollection },
          notice: 'Showing the last Medway collection date.',
        })
        return
      }
      send(response, 502, { error: error instanceof Error ? error.message : 'Medway collection lookup failed.' })
    }
  }

  return {
    name: 'medway-bins',
    configureServer(server) {
      server.middlewares.use('/api/bins', handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/bins', handler)
    },
  }
}
