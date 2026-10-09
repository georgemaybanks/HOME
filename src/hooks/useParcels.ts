import { useEffect, useState } from 'react';

export interface ParcelPlace {
  id: number;
  title: string;
  carrier: string | null;
  name: string | null;
  address: string | null;
}

export interface ParcelSummary {
  onOrder: number;
  outForDelivery: number;
  toCollect: number;
  needsReview: number;
  collections: ParcelPlace[];
  boardUrl: string;
}

interface ParcelResponse extends Partial<ParcelSummary> {
  error?: string;
}

export const useParcels = () => {
  const [summary, setSummary] = useState<ParcelSummary | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const response = await fetch('/api/parcels');
        const result = await response.json() as ParcelResponse;
        if (!active) return;
        if (!response.ok || result.onOrder == null || result.outForDelivery == null || result.toCollect == null || !result.boardUrl) {
          throw new Error(result.error || 'Parcel dashboard is not reachable.');
        }
        setSummary({
          onOrder: result.onOrder,
          outForDelivery: result.outForDelivery,
          toCollect: result.toCollect,
          needsReview: result.needsReview ?? 0,
          collections: result.collections ?? [],
          boardUrl: result.boardUrl,
        });
        setError(null);
        setStatus('connected');
      } catch (requestError) {
        if (!active) return;
        setStatus('error');
        setError(requestError instanceof Error ? requestError.message : 'Parcel dashboard is not reachable.');
      }
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return { summary, status, error };
};
