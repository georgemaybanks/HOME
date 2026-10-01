import { useEffect, useState } from 'react';

export interface NearbyAircraft {
  id: string;
  callsign: string;
  distanceMeters: number;
  bearingDegrees: number;
  altitudeFeet: number | null;
  speedKnots: number | null;
  headingDegrees: number | null;
}

export type AircraftStatus = 'loading' | 'refreshing' | 'ready' | 'error';

interface AircraftResponse {
  aircraft: NearbyAircraft[];
  updatedAt: number | null;
}

export function useNearbyAircraft() {
  const [aircraft, setAircraft] = useState<NearbyAircraft[]>([]);
  const [status, setStatus] = useState<AircraftStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;

    const refresh = async () => {
      controller?.abort();
      const nextController = new AbortController();
      controller = nextController;
      setStatus((current) => current === 'ready' ? 'refreshing' : 'loading');

      try {
        const response = await fetch('/api/aircraft', { signal: nextController.signal });
        if (!response.ok) throw new Error(`Aircraft service returned ${response.status}.`);
        const result = await response.json() as AircraftResponse;
        if (!active) return;
        setAircraft(result.aircraft);
        setUpdatedAt(result.updatedAt);
        setError(null);
        setStatus('ready');
      } catch (requestError) {
        if (!active || (requestError instanceof DOMException && requestError.name === 'AbortError')) return;
        setError(requestError instanceof Error ? requestError.message : 'Could not load nearby aircraft.');
        setStatus('error');
      }
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
      controller?.abort();
    };
  }, []);

  return { aircraft, status, error, updatedAt };
}
