import { Lightbulb } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../lib/cn';
import type { CallService } from '../types/dashboard';
import type { EntityState } from '../types/homeAssistant';

interface LightCardProps {
  entity: EntityState;
  callService: CallService;
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
  const isOn = entity.state === 'on';
  const isUnavailable = entity.state === 'unavailable';
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
    <article className={cn('flex min-w-0 flex-col gap-3.5 rounded-md border border-line bg-white p-4', isOn && 'border-sage/40 bg-sage-soft/60')}>
      <div className="flex min-w-0 items-center gap-3.5">
        <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded bg-sage-soft text-sage', isOn && 'bg-sage text-paper')} aria-hidden="true"><Lightbulb size={22} /></span>
        <div className="min-w-0">
          <strong className="block truncate text-lg font-semibold text-ink">{name}</strong>
          <span className="mt-1 block truncate text-base text-muted">{isUnavailable ? 'Unavailable' : isOn ? 'On' : 'Off'}</span>
        </div>
      </div>
      <button className={cn('min-h-16 rounded-md bg-sage-soft text-lg font-bold text-sage-deep disabled:cursor-wait disabled:opacity-50', isOn && 'bg-sage text-paper')} type="button" aria-pressed={isOn} disabled={busy || isUnavailable} onClick={() => void run(isOn ? 'turn_off' : 'turn_on')}>
        {isOn ? 'Turn off' : 'Turn on'}
      </button>
      {Array.isArray(entity.attributes.supported_color_modes) && entity.attributes.supported_color_modes.includes('rgb') ? (
        <label className="flex items-center justify-between gap-3 text-base text-sage-deep">
          Colour
          <input
            className="h-12 w-16 cursor-pointer bg-transparent"
            aria-label={`${name} colour`}
            type="color"
            disabled={busy || isUnavailable}
            onChange={(event) => {
              const hex = event.target.value;
              const red = Number.parseInt(hex.slice(1, 3), 16);
              const green = Number.parseInt(hex.slice(3, 5), 16);
              const blue = Number.parseInt(hex.slice(5, 7), 16);
              void run('turn_on', { rgb_color: [red, green, blue] });
            }}
          />
        </label>
      ) : null}
      {dimmable ? (
        <label className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-base text-sage-deep">
          Brightness
          <input
            className="h-12 min-w-0 accent-signal"
            aria-label={`${name} brightness`}
            type="range"
            min={1}
            max={100}
            step={1}
            value={brightness}
            disabled={busy || isUnavailable}
            onChange={(event) => setBrightness(Number(event.target.value))}
            onPointerUp={() => void run('turn_on', { brightness_pct: brightness })}
            onKeyUp={() => void run('turn_on', { brightness_pct: brightness })}
          />
          <span className="min-w-12 text-right font-mono">{brightness}%</span>
        </label>
      ) : null}
      {error ? <p className="text-sm text-clay" role="status">{error}</p> : null}
    </article>
  );
}
