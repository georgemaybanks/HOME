import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

interface AircraftRecord {
  hex?: string;
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | 'ground';
  gs?: number;
  track?: number;
}

function aircraftProxy(latitudeValue: string, longitudeValue: string): Plugin {
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  const handler = async (_request: IncomingMessage, response: ServerResponse, next: (error?: Error) => void) => {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      response.statusCode = 503;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ error: 'Set valid HOME_LATITUDE and HOME_LONGITUDE values in your local .env file.' }));
      return;
    }

    try {
      // ADS-B.lol accepts nautical-mile radii; query 2 NM, then filter to the requested 2 statute miles.
        const url = `https://opendata.adsb.fi/api/v2/lat/${latitude}/lon/${longitude}/dist/2`;
      const upstream = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!upstream.ok) throw new Error(`Aircraft provider returned ${upstream.status}.`);
        const payload = await upstream.json() as { aircraft?: AircraftRecord[]; now?: number };
      const aircraft = (payload.ac ?? []).flatMap((plane) => {
        if (typeof plane.lat !== 'number' || typeof plane.lon !== 'number') return [];
        const distanceMiles = distanceBetween(latitude, longitude, plane.lat, plane.lon) * 0.621371;
        if (distanceMiles > 2) return [];
        return [{
          id: plane.hex ?? `${plane.lat},${plane.lon}`,
          callsign: plane.flight?.trim() || plane.hex || 'Unknown aircraft',
          distanceMiles: Math.round(distanceMiles * 100) / 100,
          altitudeFeet: typeof plane.alt_baro === 'number' ? plane.alt_baro : null,
          speedKnots: typeof plane.gs === 'number' ? plane.gs : null,
          headingDegrees: typeof plane.track === 'number' ? plane.track : null,
        }];
      }).sort((first, second) => first.distanceMiles - second.distanceMiles);

      response.setHeader('Content-Type', 'application/json');
      response.setHeader('Cache-Control', 'no-store');
        response.end(JSON.stringify({ aircraft, updatedAt: typeof payload.now === 'number' ? payload.now * 1000 : null }));
    } catch (error) {
      response.statusCode = 502;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Aircraft provider request failed.' }));
    }
  };

  return {
    name: 'home-aircraft-proxy',
    configureServer(server) {
      server.middlewares.use('/api/aircraft', handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/aircraft', handler);
    },
  };
}

function distanceBetween(latitudeOne: number, longitudeOne: number, latitudeTwo: number, longitudeTwo: number) {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(latitudeTwo - latitudeOne);
  const longitudeDelta = toRadians(longitudeTwo - longitudeOne);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(latitudeOne)) * Math.cos(toRadians(latitudeTwo)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), aircraftProxy(env.HOME_LATITUDE, env.HOME_LONGITUDE)],
  };
});
