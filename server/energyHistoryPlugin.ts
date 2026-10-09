import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { readEnergyHistory, saveEnergyDays } from './energyHistory'

const readBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

const send = (response: ServerResponse, status: number, payload: unknown) => {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(payload))
}

export function energyHistoryPlugin(): Plugin {
  const handler = async (request: IncomingMessage, response: ServerResponse) => {
    try {
      if (request.method === 'GET') {
        send(response, 200, { days: await readEnergyHistory() })
        return
      }
      if (request.method === 'POST') {
        const raw = await readBody(request)
        const body = raw ? JSON.parse(raw) as { days?: unknown } : {}
        send(response, 200, { days: await saveEnergyDays(body.days ?? {}) })
        return
      }
      send(response, 405, { error: 'Use GET or POST.' })
    } catch (error) {
      send(response, 500, { error: error instanceof Error ? error.message : 'Energy history failed.' })
    }
  }

  return {
    name: 'energy-history',
    configureServer(server) {
      server.middlewares.use('/api/energy-history', handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/energy-history', handler)
    },
  }
}
