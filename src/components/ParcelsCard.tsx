import { Package } from 'lucide-react';
import { cn } from '../lib/cn';
import type { ParcelSummary } from '../hooks/useParcels';

interface ParcelsCardProps {
  summary: ParcelSummary | null;
  status: 'connecting' | 'connected' | 'error';
  error: string | null;
  onOpen: () => void;
  featured?: boolean;
}

export const ParcelsCard = ({ summary, status, error, onOpen, featured = false }: ParcelsCardProps) => (
  <button className={cn('h-full w-full rounded-md border border-line bg-white px-4 py-3 text-left', featured && 'px-5 py-4')} type="button" onClick={onOpen}>
    <div className="flex items-center gap-2.5 text-sage">
      <Package size={22} />
      <strong className="text-lg font-bold text-ink">Parcels</strong>
    </div>
    {status === 'error' ? <p className="mt-2 text-base leading-snug text-clay">{error}</p> : null}
    {status === 'connecting' && !summary ? <p className="mt-2 text-base text-muted">Loading parcels…</p> : null}
    {summary ? (
      <>
        {featured ? (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Reading label="On order" value={summary.onOrder} featured />
            <Reading label="Out for delivery" value={summary.outForDelivery} featured />
            <Reading label="Ready to collect" value={summary.toCollect} featured />
          </div>
        ) : (
          <div className="mt-2">
            <Reading label="On order" value={summary.onOrder} />
            <Reading label="Out for delivery" value={summary.outForDelivery} />
            <Reading label="Ready to collect" value={summary.toCollect} />
          </div>
        )}
        {summary.needsReview ? <p className="mt-1 text-sm text-clay">{summary.needsReview} to review</p> : null}
        {summary.collections.slice(0, 3).map((place) => (
          <p key={place.id} className="mt-1 truncate text-sm text-muted">
            {place.name || place.title}
            {place.address ? ` — ${place.address}` : ''}
          </p>
        ))}
      </>
    ) : null}
  </button>
);

const Reading = ({ label, value, featured = false }: { label: string; value: number; featured?: boolean }) => (
  <div className={cn('flex min-h-8 items-baseline justify-between gap-3', featured && 'flex-col items-start gap-1')}>
    <span className="font-mono text-xs font-medium tracking-wide text-muted">{label.toUpperCase()}</span>
    <strong className={cn('font-display font-bold tracking-tight text-ink', featured ? 'text-4xl' : 'text-2xl')}>{value}</strong>
  </div>
);
