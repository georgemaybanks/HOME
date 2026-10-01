# Home Assistant Dashboard

A React, Vite, and TypeScript starting point for a live Home Assistant dashboard.

## Setup

```sh
npm create vite@latest home-assistant-dashboard -- --template react-ts
cd home-assistant-dashboard
npm install
npm install lucide-react
cp .env.example .env
npm run dev
```

This workspace already contains the scaffold and dependency manifest; from here, run `npm install`, configure `.env`, then `npm run dev`.

Set `VITE_HA_URL` to the Home Assistant base URL reachable by the browser and `VITE_HA_TOKEN` to a Long-Lived Access Token created in your Home Assistant profile. Never commit `.env`. The Vite `VITE_` values are included in the browser bundle, so only use this dashboard in a trusted environment and treat the token like a password.

Set `HOME_LATITUDE` and `HOME_LONGITUDE` in `.env` for nearby-aircraft lookup. The local Vite server queries ADSB.fi every 30 seconds and filters aircraft to a 15 km radius; the coordinates remain server-side. Rainham, Kent is station code `RAI`. Live departures come from the National Rail Darwin Push Port: set `DARWIN_USERNAME`, `DARWIN_PASSWORD`, `DARWIN_HOST`, `DARWIN_PORT`, `DARWIN_TOPIC`, and `DARWIN_STATUS_TOPIC` in `.env`. The Vite server subscribes to that feed and the browser only receives the Rainham board.

## Structure

```text
src/
├── components/
│   ├── CameraTile.tsx
│   ├── EntityCard.tsx
│   ├── EntityCard.css
│   └── MediaPlayerCard.tsx
├── context/
│   └── HomeAssistantContext.tsx
├── hooks/
│   └── useHomeAssistant.ts
├── services/
│   └── homeAssistantSocket.ts
├── types/
│   └── homeAssistant.ts
├── App.tsx
├── main.tsx
├── styles.css
└── vite-env.d.ts
.env.example
index.html
vite.config.ts
package.json
```

`HomeAssistantProvider` fetches the initial entity snapshot and subscribes to `state_changed`. Components use `useHomeAssistant()` for the shared entity map, connection status, errors, and service calls. Speaker controls call Home Assistant's `media_player` services. Camera tiles attempt the Home Assistant MJPEG camera stream and fall back to the entity picture when available. The Rainham board is filled from the local Darwin subscription, and the aircraft panel uses the local server proxy.
