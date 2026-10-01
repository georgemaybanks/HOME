import { BatteryCharging } from 'lucide-react';
import { useEffect, useState } from 'react';
import { chargerEntityName, chargerUnit, formatChargerPower, isChargerControl, isChargerCurrentLimit, isChargerPower, numericAttribute } from '../lib/charger';
import { cn } from '../lib/cn';
import type { CallService } from '../types/dashboard';
import type { EntityState } from '../types/homeAssistant';

interface ChargerPanelProps {
  entities: EntityState[];
  callService: CallService;
}

export const ChargerPanel = ({ entities, callService }: ChargerPanelProps) => {
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const power = entities.find(isChargerPower);
  const limit = entities.find(isChargerCurrentLimit);
  const controls = entities.filter(isChargerControl);
  const mode = entities.find((entity) => entity.entity_id.startsWith('select.') && Array.isArray(entity.attributes.options));
  const modeOptions = Array.isArray(mode?.attributes.options) ? mode.attributes.options.filter((option): option is string => typeof option === 'string') : [];
  const chargingSensor = entities.find((entity) => entity.entity_id.startsWith('binary_sensor.') && /charg/i.test(`${entity.entity_id} ${chargerEntityName(entity)}`));
  const mainSwitch = controls.find((entity) => {
    const name = `${entity.entity_id} ${chargerEntityName(entity)}`.toLowerCase();
    return (entity.entity_id.startsWith('switch.') || entity.entity_id.startsWith('input_boolean.')) && /charg|boost|enabled|start/.test(name) && !/pause|lock/.test(name);
  }) ?? controls.find((entity) => entity.entity_id.startsWith('switch.') || entity.entity_id.startsWith('input_boolean.'));
  const charging = chargingSensor ? chargingSensor.state === 'on' : mainSwitch ? mainSwitch.state === 'on' : false;
  const statusLabel = chargingSensor || mainSwitch ? (charging ? 'Charging' : 'Idle') : 'Ready';
  const details = entities.filter((entity) => entity !== power && entity !== limit && entity !== mode && !isChargerControl(entity) && (entity.entity_id.startsWith('sensor.') || entity.entity_id.startsWith('binary_sensor.')));
  const limitValue = limit ? Number(limit.state) : null;
  const [amps, setAmps] = useState(() => {
    const initial = limit ? Number(limit.state) : Number.NaN;
    return Number.isNaN(initial) ? numericAttribute(limit, 'min', 6) : initial;
  });

  useEffect(() => {
    if (limitValue !== null && !Number.isNaN(limitValue)) setAmps(limitValue);
  }, [limitValue]);

  const run = async (entity: EntityState, domain: string, service: string, serviceData: Record<string, unknown> = {}) => {
    setBusyId(entity.entity_id);
    setError(null);
    try {
      await callService(domain, service, { entity_id: entity.entity_id, ...serviceData });
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Could not control the charger.');
    } finally {
      setBusyId(null);
    }
  };

  const isCharging = charging

  return (
    <div className="grid min-h-0 flex-1 grid-cols-2 gap-4 max-md:grid-cols-1">
      <article className={cn('min-h-0 min-w-0 overflow-auto rounded-md border border-line bg-white p-5', isCharging && 'border-sage/40 bg-sage-soft/60')}>
        <span className={cn('mb-4 grid h-14 w-14 place-items-center rounded-md bg-sage-soft text-sage', isCharging && 'bg-sage text-paper')} aria-hidden="true"><BatteryCharging size={28} /></span>
        <p className="font-mono text-xs font-medium tracking-wide text-muted">CAR CHARGER</p>
        <p className={cn('mt-2 font-display text-3xl font-bold leading-tight', isCharging && 'text-signal')}>{statusLabel}</p>
        <p className="mt-2 font-display text-clock font-bold">{power ? formatChargerPower(power) : '—'}</p>
        <p className="mt-2.5 line-clamp-2 text-base text-muted">{power ? chargerEntityName(power) : 'Power shows here when a charger sensor is available.'}</p>
      </article>

      <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-auto rounded-md border border-line bg-white p-5">
        {controls.map((entity) => {
          const domain = entity.entity_id.split('.')[0];
          const on = entity.state === 'on';
          const busy = busyId === entity.entity_id;
          if (domain === 'button') {
            return (
              <button key={entity.entity_id} className="min-h-16 rounded-md bg-sage-soft text-lg font-bold text-sage-deep disabled:cursor-wait disabled:opacity-50" type="button" disabled={busy} onClick={() => void run(entity, 'button', 'press')}>
                {chargerEntityName(entity)}
              </button>
            );
          }
          return (
            <button key={entity.entity_id} className={cn('min-h-16 rounded-md bg-sage-soft text-lg font-bold text-sage-deep disabled:cursor-wait disabled:opacity-50', on && 'bg-sage text-paper')} type="button" aria-pressed={on} disabled={busy || entity.state === 'unavailable'} onClick={() => void run(entity, domain, on ? 'turn_off' : 'turn_on')}>
              {on ? `Stop ${chargerEntityName(entity)}` : `Start ${chargerEntityName(entity)}`}
            </button>
          );
        })}

        {mode && modeOptions.length ? (
          <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1" role="group" aria-label={chargerEntityName(mode)}>
            {modeOptions.slice(0, 6).map((option) => (
              <button key={option} className={cn('min-h-16 rounded-md bg-sage-soft text-lg font-bold text-sage-deep disabled:cursor-wait disabled:opacity-50', mode.state === option && 'bg-sage text-paper')} type="button" aria-pressed={mode.state === option} disabled={busyId === mode.entity_id} onClick={() => void run(mode, 'select', 'select_option', { option })}>
                {option}
              </button>
            ))}
          </div>
        ) : null}

        {limit ? (
          <label className="grid min-h-16 grid-cols-[auto_1fr_auto] items-center gap-3 text-base text-sage-deep">
            Charge current
            <input
              aria-label={`${chargerEntityName(limit)} current`}
              className="h-12 min-w-0 accent-signal"
              type="range"
              min={numericAttribute(limit, 'min', 6)}
              max={numericAttribute(limit, 'max', 32)}
              step={numericAttribute(limit, 'step', 1)}
              value={amps}
              disabled={busyId === limit.entity_id}
              onChange={(event) => setAmps(Number(event.target.value))}
              onPointerUp={() => void run(limit, 'number', 'set_value', { value: amps })}
              onKeyUp={() => void run(limit, 'number', 'set_value', { value: amps })}
            />
            <span className="min-w-12 text-right font-mono">{amps} A</span>
          </label>
        ) : null}

        {details.length ? (
          <div>
            {details.map((entity) => (
              <div className="flex min-h-11 items-center justify-between gap-3 border-t border-line/70 py-2" key={entity.entity_id}>
                <span className="truncate text-base text-ink">{chargerEntityName(entity)}</span>
                <strong className="shrink-0 font-mono text-base">{entity.state}{chargerUnit(entity) ? ` ${chargerUnit(entity)}` : ''}</strong>
              </div>
            ))}
          </div>
        ) : null}

        {!controls.length && !mode ? <p className="text-base leading-snug text-muted">No start or stop control was found. A charger switch in Home Assistant will appear here as a button.</p> : null}
        {error ? <p className="text-sm text-clay" role="status">{error}</p> : null}
      </div>
    </div>
  );
}
