import type { ReactNode } from 'react';
import './EntityCard.css';

interface EntityCardProps {
  entityId: string;
  state: string;
  friendlyName: string;
  icon: ReactNode;
  unit?: string;
}

export function EntityCard({ entityId, state, friendlyName, icon, unit }: EntityCardProps) {
  const isActive = !['off', 'unavailable', 'unknown', 'closed', 'idle'].includes(state.toLowerCase());

  return (
    <article className={`entity-card${isActive ? ' entity-card--active' : ''}`}>
      <div className="entity-card__topline">
        <span className="entity-card__icon" aria-hidden="true">{icon}</span>
        <span className={`entity-card__indicator${isActive ? ' entity-card__indicator--active' : ''}`} aria-label={isActive ? 'Active' : 'Inactive'} />
      </div>
      <div className="entity-card__details">
        <h2 className="entity-card__name">{friendlyName}</h2>
        <p className="entity-card__state">{state}{unit ? <span> {unit}</span> : null}</p>
        <p className="entity-card__id">{entityId}</p>
      </div>
    </article>
  );
}
