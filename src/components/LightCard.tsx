import { Lightbulb } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { EntityState } from '../types/homeAssistant';

interface LightCardProps {
  entity: EntityState;
  callService: (domain: string, service: string, serviceData?: Record<string, unknown>) => Promise<void>;
}

function brightnessPercent(entity: EntityState) {
  const brightness = entity.attributes.brightness;
  if (typeof brightness !== 'number') return null;
  return Math.round((brightness / 255) * 100);
}

function canDim(entity: EntityState) {
  if (typeof entity.attributes.brightness === 'number') return true;
  const modes = entity.attributes.supported_color_modes;
  return Array.isArray(modes) && modes.some((mode) => typeof mode === 'string' && mode !== 'onoff');
}

export function LightCard({ entity, callService }: LightCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = entity.attributes.friendly_name ?? 'Light';
  const on = entity.state === 'on';
  const unavailable = entity.state === 'unavailable' || entity.state === 'unknown';
  const dimmable = canDim(entity);
  const reportedBrightness = brightnessPercent(entity);
  const [brightness, setBrightness] = useState(reportedBrightness ?? 100);

  useEffect(() => {
    if (reportedBrightness !== null) setBrightness(reportedBrightness);
  }, [reportedBrightness]);

  const run = async (service: string, serviceData: Record<string, unknown> = {}) => {
    setBusy(true);
    setError(null);
    try {
      await callService('light', service, { entity_id: entity.entity_id, ...serviceData });
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Could not control this light.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`light-card${on ? ' light-card--on' : ''}`}>
      <div className="light-card__top">
        <span className="light-card__icon" aria-hidden="true"><Lightbulb size={22} /></span>
        <div>
          <strong>{name}</strong>
          <span>{unavailable ? 'Unavailable' : on ? 'On' : 'Off'}</span>
        </div>
      </div>
      <button className="light-card__toggle" type="button" aria-pressed={on} disabled={busy || unavailable} onClick={() => void run(on ? 'turn_off' : 'turn_on')}>
        {on ? 'Turn off' : 'Turn on'}
      </button>
      {dimmable ? (
        <label className="light-card__dim">
          Brightness
          <input
            aria-label={`${name} brightness`}
            type="range"
            min={1}
            max={100}
            step={1}
            value={brightness}
            disabled={busy || unavailable}
            onChange={(event) => setBrightness(Number(event.target.value))}
            onPointerUp={() => void run('turn_on', { brightness_pct: brightness })}
            onKeyUp={() => void run('turn_on', { brightness_pct: brightness })}
          />
          <span>{brightness}%</span>
        </label>
      ) : null}
      {error ? <p className="light-card__error" role="status">{error}</p> : null}
    </article>
  );
}
