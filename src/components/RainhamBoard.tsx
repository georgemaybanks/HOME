import { TrainFront } from 'lucide-react';
import { cn } from '../lib/cn';
import type { RailDeparture } from '../hooks/useRailBoard';

interface RainhamBoardProps {
  departures: RailDeparture[];
  status: 'connecting' | 'connected' | 'error';
  error: string | null;
  notice: string | null;
}

export const RainhamBoard = ({ departures, status, error, notice }: RainhamBoardProps) => {
  const empty = status === 'error'
    ? error ?? 'National Rail is not connected.'
    : status === 'connecting'
      ? 'Connecting to National Rail…'
      : 'Waiting for the next Rainham update.';

  return (
    <article className="flex h-full min-h-0 min-w-0 flex-col rounded-md border border-line bg-white px-4 pb-2 pt-3.5">
      <div className="flex items-center gap-2.5 text-sage">
        <TrainFront size={22} />
        <strong className="text-lg font-bold text-ink">Rainham</strong>
        <span className="ml-auto font-mono text-xs text-muted">RAI</span>
      </div>
      {notice ? <p className="mt-2 line-clamp-2 text-base leading-snug text-clay">{notice}</p> : null}
      {departures.length ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {departures.map((departure) => <DepartureRow key={departure.id} departure={departure} />)}
        </div>
      ) : <p className="my-3 text-base leading-snug text-muted">{empty}</p>}
    </article>
  );
};

const DepartureRow = ({ departure }: { departure: RailDeparture }) => (
  <div className="flex min-h-11 items-center gap-3 border-t border-line/70 py-2">
    <span className="w-12 shrink-0 font-mono text-base text-ink">{departure.scheduled}</span>
    <span className="min-w-0 flex-1 truncate text-base text-ink">{departure.destination}</span>
    <strong className={cn('shrink-0 font-mono text-base font-medium', departure.status === 'on time' && 'text-signal', departure.status === 'delayed' && 'text-clay', departure.status === 'cancelled' && 'text-muted line-through')}>
      {departure.expected}
    </strong>
    <span className="w-6 shrink-0 text-right font-mono text-base text-muted">{departure.platform ?? '–'}</span>
  </div>
);
