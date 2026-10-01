import { useEffect, useState } from 'react';

export interface RailDeparture {
  id: string;
  scheduled: string;
  expected: string;
  destination: string;
  platform: string | null;
  status: 'on time' | 'delayed' | 'cancelled';
}

interface RailResponse {
  status: 'connecting' | 'connected' | 'error';
  error: string | null;
  notice: string | null;
  departures: RailDeparture[];
}

export const useRailBoard = () => {
  const [departures, setDepartures] = useState<RailDeparture[]>([]);
  const [status, setStatus] = useState<RailResponse['status']>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const response = await fetch('/api/rail');
        if (!response.ok) throw new Error(`Rail service returned ${response.status}.`);
        const result = await response.json() as RailResponse;
        if (!active) return;
        setDepartures(result.departures);
        setStatus(result.status);
        setError(result.error);
        setNotice(result.notice);
      } catch (requestError) {
        if (!active) return;
        setStatus('error');
        setError(requestError instanceof Error ? requestError.message : 'Could not load rail departures.');
      }
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), 10_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return { departures, status, error, notice };
};
