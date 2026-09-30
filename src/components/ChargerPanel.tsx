import { BatteryCharging } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { EntityState } from '../types/homeAssistant';

interface ChargerPanelProps {
  entities: EntityState[];
  callService: (domain: string, service: string, serviceData?: Record<string, unknown>) => Promise<void>;
}

function entityName(entity: EntityState) {
  return entity.attributes.friendly_name ?? 'Charger';
}

function unitOf(entity: EntityState) {
  return typeof entity.attributes.unit_of_measurement === 'string' ? entity.attributes.unit_of_measurement : '';
}

function formatPower(entity: EntityState) {
  const unit = unitOf(entity);
  const value = Number(entity.state);
  if (Number.isNaN(value)) return entity.state;
  if (unit === 'W') return `${(value / 1000).toFixed(1)} kW`;
  if (unit === 'kW') return `${value.toFixed(1)} kW`;
  return `${entity.state}${unit ? ` ${unit}` : ''}`;
}

function isPower(entity: EntityState) {
  const unit = unitOf(entity);
  return entity.entity_id.startsWith('sensor.') && (unit === 'W' || unit === 'kW');
}

function isCurrentLimit(entity: EntityState) {
  return entity.entity_id.startsWith('number.') && (unitOf(entity) === 'A' || /current|amp|limit/i.test(`${entity.entity_id} ${entityName(entity)}`));
}

function isControl(entity: EntityState) {
  return entity.entity_id.startsWith('switch.') || entity.entity_id.startsWith('input_boolean.') || entity.entity_id.startsWith('button.');
}

function numericAttribute(entity: EntityState | undefined, key: string, fallback: number) {
  const value = entity?.attributes[key];
  return typeof value === 'number' ? value : fallback;
}

export function ChargerPanel({ entities, callService }: ChargerPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const power = entities.find(isPower);
  const limit = entities.find(isCurrentLimit);
  const controls = entities.filter(isControl);
  const mode = entities.find((entity) => entity.entity_id.startsWith('select.') && Array.isArray(entity.attributes.options));
  const modeOptions = Array.isArray(mode?.attributes.options) ? mode.attributes.options.filter((option): option is string => typeof option === 'string') : [];
  const chargingSensor = entities.find((entity) => entity.entity_id.startsWith('binary_sensor.') && /charg/i.test(`${entity.entity_id} ${entityName(entity)}`));
  const mainSwitch = controls.find((entity) => {
    const name = `${entity.entity_id} ${entityName(entity)}`.toLowerCase();
    return (entity.entity_id.startsWith('switch.') || entity.entity_id.startsWith('input_boolean.')) && /charg|boost|enabled|start/.test(name) && !/pause|lock/.test(name);
  }) ?? controls.find((entity) => entity.entity_id.startsWith('switch.') || entity.entity_id.startsWith('input_boolean.'));
  const charging = chargingSensor ? chargingSensor.state === 'on' : mainSwitch ? mainSwitch.state === 'on' : false;
  const statusLabel = chargingSensor || mainSwitch ? (charging ? 'Charging' : 'Idle') : 'Ready';
  const details = entities.filter((entity) => entity !== power && entity !== limit && entity !== mode && !isControl(entity) && (entity.entity_id.startsWith('sensor.') || entity.entity_id.startsWith('binary_sensor.')));
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

  return (
    <div className="charger-board">
      <article className={`charger-hero${charging ? ' charger-hero--active' : ''}`}>
        <span className="charger-hero__icon" aria-hidden="true"><BatteryCharging size={28} /></span>
        <p className="stat__label">CAR CHARGER</p>
        <p className={`stat__value${charging ? ' stat__value--calm' : ''}`}>{statusLabel}</p>
        <p className="stat__value stat__value--figure">{power ? formatPower(power) : '—'}</p>
        <p className="stat__note">{power ? entityName(power) : 'Power shows here when a charger sensor is available.'}</p>
      </article>

      <div className="charger-controls">
        {controls.map((entity) => {
          const domain = entity.entity_id.split('.')[0];
          const on = entity.state === 'on';
          const busy = busyId === entity.entity_id;
          if (domain === 'button') {
            return (
              <button key={entity.entity_id} className="charger-action" type="button" disabled={busy} onClick={() => void run(entity, 'button', 'press')}>
                {entityName(entity)}
              </button>
            );
          }
          return (
            <button key={entity.entity_id} className={`charger-action${on ? ' charger-action--on' : ''}`} type="button" aria-pressed={on} disabled={busy || entity.state === 'unavailable'} onClick={() => void run(entity, domain, on ? 'turn_off' : 'turn_on')}>
              {on ? `Stop ${entityName(entity)}` : `Start ${entityName(entity)}`}
            </button>
          );
        })}

        {mode && modeOptions.length ? (
          <div className="charger-modes" role="group" aria-label={entityName(mode)}>
            {modeOptions.slice(0, 6).map((option) => (
              <button key={option} className={`charger-action${mode.state === option ? ' charger-action--on' : ''}`} type="button" aria-pressed={mode.state === option} disabled={busyId === mode.entity_id} onClick={() => void run(mode, 'select', 'select_option', { option })}>
                {option}
              </button>
            ))}
          </div>
        ) : null}

        {limit ? (
          <label className="charger-limit">
            Charge current
            <input
              aria-label={`${entityName(limit)} current`}
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
            <span>{amps} A</span>
          </label>
        ) : null}

        {details.length ? (
          <div className="travel-panel__entities">
            {details.map((entity) => (
              <div className="travel-entity" key={entity.entity_id}>
                <span>{entityName(entity)}</span>
                <strong>{entity.state}{unitOf(entity) ? ` ${unitOf(entity)}` : ''}</strong>
              </div>
            ))}
          </div>
        ) : null}

        {!controls.length && !mode ? <p>No start or stop control was found. A charger switch in Home Assistant will appear here as a button.</p> : null}
        {error ? <p className="player-card__error" role="status">{error}</p> : null}
      </div>
    </div>
  );
}
