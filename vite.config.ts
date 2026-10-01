import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { startDarwinFeed } from './server/darwinFeed';
import { loadRainhamBoard, type LdbBoard } from './server/ldbDepartures';

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
      // ADS-B Exchange-style APIs take a nautical-mile radius. 2000 m is about 1.08 NM, so query 2 NM and keep planes inside 2000 m.
      const url = `https://opendata.adsb.fi/api/v2/lat/${latitude}/lon/${longitude}/dist/2`;
      const upstream = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'CasaMaybanksDashboard/0.1' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!upstream.ok) throw new Error(`Aircraft provider returned ${upstream.status}.`);
      const payload = await upstream.json() as { ac?: AircraftRecord[]; aircraft?: AircraftRecord[]; now?: number };
      const aircraft = (payload.ac ?? payload.aircraft ?? []).flatMap((plane) => {
        if (typeof plane.lat !== 'number' || typeof plane.lon !== 'number') return [];
        const distanceMeters = distanceBetween(latitude, longitude, plane.lat, plane.lon) * 1000;
        if (distanceMeters > 2000) return [];
        return [{
          id: plane.hex ?? `${plane.lat},${plane.lon}`,
          callsign: plane.flight?.trim() || plane.hex || 'Unknown aircraft',
          distanceMeters: Math.round(distanceMeters),
          bearingDegrees: Math.round(bearingBetween(latitude, longitude, plane.lat, plane.lon)),
          altitudeFeet: typeof plane.alt_baro === 'number' ? plane.alt_baro : null,
          speedKnots: typeof plane.gs === 'number' ? plane.gs : null,
          headingDegrees: typeof plane.track === 'number' ? plane.track : null,
        }];
      }).sort((first, second) => first.distanceMeters - second.distanceMeters);

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

function cameraProxy(baseUrl: string, accessToken: string): Plugin {
  const forward = async (request: IncomingMessage & { originalUrl?: string }, response: ServerResponse, next: (error?: Error) => void) => {
    const path = request.originalUrl ?? request.url ?? '';
    if (!path.startsWith('/api/camera_proxy') && !path.startsWith('/api/hls/')) {
      next();
      return;
    }
    if (!baseUrl || !accessToken) {
      response.statusCode = 503;
      response.end('Home Assistant URL is not configured.');
      return;
    }

    const controller = new AbortController();
    request.on('close', () => controller.abort());
    try {
      const upstream = await fetch(new URL(path, baseUrl), {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      response.statusCode = upstream.status;
      const contentType = upstream.headers.get('content-type');
      if (contentType) response.setHeader('Content-Type', contentType);
      response.setHeader('Cache-Control', 'no-store');
      if (!upstream.body) {
        response.end();
        return;
      }
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!response.write(Buffer.from(value))) {
          await new Promise((resolve) => response.once('drain', resolve));
        }
      }
      response.end();
    } catch (error) {
      if (controller.signal.aborted || response.writableEnded) return;
      if (!response.headersSent) response.statusCode = 502;
      response.end(error instanceof Error ? error.message : 'Camera proxy failed.');
    }
  };

  return {
    name: 'home-camera-proxy',
    configureServer(server) {
      server.middlewares.use(forward);
    },
    configurePreviewServer(server) {
      server.middlewares.use(forward);
    },
  };
}

function railProxy(env: Record<string, string>): Plugin {
  let feed: ReturnType<typeof startDarwinFeed> | null = null;
  let board: LdbBoard | null = null;
  let refresh: Promise<void> | null = null;
  const ensure = () => {
    feed ??= startDarwinFeed({
      host: env.DARWIN_HOST || 'darwin-dist-44ae45.nationalrail.co.uk',
      port: Number(env.DARWIN_PORT || 61613),
      username: env.DARWIN_USERNAME ?? '',
      password: env.DARWIN_PASSWORD ?? '',
      topic: env.DARWIN_TOPIC || 'darwin.pushport-v16',
      statusTopic: env.DARWIN_STATUS_TOPIC || 'darwin.status',
    });
    return feed;
  };
  const refreshBoard = () => {
    refresh ??= loadRainhamBoard()
      .then((next) => { board = next; })
      .finally(() => { refresh = null; });
    return refresh;
  };
  const handler = async (_request: IncomingMessage, response: ServerResponse) => {
    if (!board || Date.now() - board.fetchedAt > 20_000) {
      try {
        await refreshBoard();
      } catch {
        board = board ?? null;
      }
    }
    const darwin = ensure().snapshot();
    const live = board && board.departures.length ? board : null;
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    response.end(JSON.stringify({
      status: live ? 'connected' : darwin.status,
      error: live ? null : darwin.error,
      notice: live ? live.notice : darwin.notice,
      departures: live ? live.departures : darwin.departures,
    }));
  };

  return {
    name: 'darwin-rail-feed',
    configureServer(server) {
      const feed = ensure();
      void refreshBoard().catch(() => undefined);
      server.middlewares.use('/api/rail', handler);
      const closeFeed = () => feed.close();
      server.httpServer?.on('close', closeFeed);
    },
    configurePreviewServer(server) {
      ensure();
      void refreshBoard().catch(() => undefined);
      server.middlewares.use('/api/rail', handler);
    },
  };
}

function bearingBetween(latitudeOne: number, longitudeOne: number, latitudeTwo: number, longitudeTwo: number) {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeOneRadians = toRadians(latitudeOne);
  const latitudeTwoRadians = toRadians(latitudeTwo);
  const longitudeDelta = toRadians(longitudeTwo - longitudeOne);
  const y = Math.sin(longitudeDelta) * Math.cos(latitudeTwoRadians);
  const x = Math.cos(latitudeOneRadians) * Math.sin(latitudeTwoRadians)
    - Math.sin(latitudeOneRadians) * Math.cos(latitudeTwoRadians) * Math.cos(longitudeDelta);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
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
    plugins: [react(), cameraProxy(env.VITE_HA_URL, env.VITE_HA_TOKEN), aircraftProxy(env.HOME_LATITUDE, env.HOME_LONGITUDE), railProxy(env)],
  };
});
