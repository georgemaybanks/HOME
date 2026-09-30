import { BatteryCharging, Camera, House, Lightbulb, Music2, Plane, TrainFront, Wifi } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { CameraTile } from './components/CameraTile';
import { ChargerPanel } from './components/ChargerPanel';
import { LightCard } from './components/LightCard';
import { MediaPlayerCard } from './components/MediaPlayerCard';
import { useHomeAssistant } from './hooks/useHomeAssistant';
import { useNearbyAircraft } from './hooks/useNearbyAircraft';
import type { EntityState } from './types/homeAssistant';

type DashboardTab = 'overview' | 'cameras' | 'lights' | 'charger' | 'speakers';

const chargerWords = ['charger', 'wallbox', 'zappi', 'easee', 'ohme', 'podpoint', 'pod point', 'evse', 'hypervolt', 'myenergi', 'ev charge', 'car charge', 'wall connector', 'andersen', 'indra'];

function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return now;
}

function ServicePanel({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return <div className="service-panel"><span>{icon}</span><div><strong>{title}</strong><p>{detail}</p></div></div>;
}

function matchesWords(entity: EntityState, words: string[]) {
  const haystack = `${entity.entity_id} ${entity.attributes.friendly_name ?? ''}`.toLowerCase();
  return words.some((word) => haystack.includes(word));
}

function labelState(state: string) {
  return state.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function temperatureUnit(entity: EntityState) {
  if (typeof entity.attributes.unit_of_measurement === 'string' && entity.attributes.unit_of_measurement) {
    return entity.attributes.unit_of_measurement;
  }
  if (typeof entity.attributes.temperature_unit === 'string' && entity.attributes.temperature_unit) {
    return entity.attributes.temperature_unit;
  }
  return '°';
}

function temperatureReading(entity: EntityState) {
  const unit = temperatureUnit(entity);
  const current = entity.attributes.current_temperature;
  const name = entity.attributes.friendly_name ?? 'Indoor';
  if (typeof current === 'number') return { name, text: `${current}${unit}` };
  if (entity.state !== 'unavailable' && entity.state !== 'unknown' && entity.state.trim() !== '' && !Number.isNaN(Number(entity.state))) {
    return { name, text: `${entity.state}${unit}` };
  }
  return null;
}

function TravelRows({ children }: { children: ReactNode }) {
  return <div className="travel-panel__entities">{children}</div>;
}

function cleanReading(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || ['unavailable', 'unknown', 'none', 'null', 'connected', 'on'].includes(trimmed.toLowerCase())) return null;
  return trimmed;
}

function entityLabel(entity: EntityState) {
  return `${entity.entity_id} ${entity.attributes.friendly_name ?? ''}`.toLowerCase();
}

function ssidFrom(entity: EntityState) {
  const attribute = entity.attributes.ssid;
  if (typeof attribute === 'string') {
    const named = cleanReading(attribute);
    if (named) return named;
  }
  return cleanReading(entity.state);
}

function isSsidEntity(entity: EntityState) {
  const name = entityLabel(entity);
  if (/bssid|signal|rssi|strength|channel|frequency/.test(name)) return false;
  return /\bssid\b|wi[-_ ]?fi connection|wifi connection|wireless network|wi[-_ ]?fi ssid/.test(name);
}

function isSpeedEntity(entity: EntityState) {
  if (!entity.entity_id.startsWith('sensor.')) return false;
  const unit = typeof entity.attributes.unit_of_measurement === 'string' ? entity.attributes.unit_of_measurement : '';
  const name = entityLabel(entity);
  if (/ping|latency|jitter/.test(name)) return false;
  return /mbit\/s|mbps|mb\/s/i.test(unit) || /speedtest|download speed|upload speed|link speed|wi[-_ ]?fi speed|internet speed/.test(name);
}

function formatMegabits(value: number) {
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} Mb/s`;
}

function formatSpeed(entity: EntityState) {
  const value = Number(entity.state);
  if (Number.isNaN(value)) return cleanReading(entity.state);
  return formatMegabits(value);
}

export default function App() {
  const { entities, status, error, callService } = useHomeAssistant();
  const { aircraft, status: aircraftStatus, error: aircraftError } = useNearbyAircraft();
  const [tab, setTab] = useState<DashboardTab>('overview');
  const now = useClock();
  const entityList = Object.values(entities).sort((a, b) =>
    (a.attributes.friendly_name ?? a.entity_id).localeCompare(b.attributes.friendly_name ?? b.entity_id),
  );
  const cameraEntities = entityList.filter(({ entity_id }) => entity_id.startsWith('camera.'));
  const playerEntities = entityList.filter(({ entity_id }) => entity_id.startsWith('media_player.'));
  const lightEntities = entityList.filter(({ entity_id }) => entity_id.startsWith('light.')).sort((a, b) => {
    const aOn = a.state === 'on' ? 0 : 1;
    const bOn = b.state === 'on' ? 0 : 1;
    if (aOn !== bOn) return aOn - bOn;
    return (a.attributes.friendly_name ?? a.entity_id).localeCompare(b.attributes.friendly_name ?? b.entity_id);
  });
  const chargerEntities = entityList.filter((entity) => matchesWords(entity, chargerWords));
  const alarmEntities = entityList.filter(({ entity_id }) => entity_id.startsWith('alarm_control_panel.'));
  const temperatureEntities = entityList.filter((entity) => {
    const unit = entity.attributes.unit_of_measurement;
    return entity.entity_id.startsWith('climate.') || unit === '°C' || unit === '°F' || matchesWords(entity, ['temperature', 'indoor temp']);
  });
  const trainEntities = entityList.filter((entity) => matchesWords(entity, ['rainham', 'train', 'station', 'departure', 'railway']));
  const frontDoor = cameraEntities.find((entity) => matchesWords(entity, ['front door', 'front_door', 'doorbell'])) ?? cameraEntities[0];
  const babyCamera = cameraEntities.find((entity) => entity !== frontDoor && matchesWords(entity, ['baby', 'nursery', 'crib'])) ?? cameraEntities.find((entity) => entity !== frontDoor);
  const glanceCameras = [frontDoor, babyCamera].filter((camera): camera is EntityState => Boolean(camera));
  const climateFirst = [
    ...temperatureEntities.filter((entity) => entity.entity_id.startsWith('climate.')),
    ...temperatureEntities.filter((entity) => !entity.entity_id.startsWith('climate.')),
  ];
  const temperatureReadings = climateFirst.flatMap((entity) => {
    const reading = temperatureReading(entity);
    return reading ? [{ entity, reading }] : [];
  });
  const primaryTemperature = temperatureReadings[0];
  const extraTemperatures = temperatureReadings.slice(1, 4);
  const primaryAlarm = alarmEntities[0];
  const alarmHot = primaryAlarm ? /^(armed|triggered|pending|arming)/.test(primaryAlarm.state) : false;
  const ssidEntity = entityList.find(isSsidEntity);
  const networkName = ssidEntity ? ssidFrom(ssidEntity) : null;
  const speedEntities = entityList.filter(isSpeedEntity);
  const downloadSpeed = speedEntities.find((entity) => /download|downlink|rx/.test(entityLabel(entity)))
    ?? speedEntities.find((entity) => !/upload|uplink|tx/.test(entityLabel(entity)));
  const uploadSpeed = speedEntities.find((entity) => entity !== downloadSpeed && /upload|uplink|tx/.test(entityLabel(entity)));
  const downloadLabel = downloadSpeed ? formatSpeed(downloadSpeed) : null;
  const uploadLabel = uploadSpeed ? formatSpeed(uploadSpeed) : null;
  const speedLabel = downloadLabel && uploadLabel ? `${downloadLabel} down · ${uploadLabel} up` : downloadLabel ?? 'Speed unavailable';
  const connectionLabel = status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting' : status === 'error' ? 'Connection issue' : 'Disconnected';
  const clockLabel = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(now);
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(now);

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setTab('overview')}>
          <span className="brand__mark"><House size={19} strokeWidth={1.8} /></span>
          <span className="brand__name">Casa <span>Maybanks</span></span>
        </button>
        <time className="topbar__clock" dateTime={now.toISOString()}>{clockLabel}</time>
        <div className="topbar__meta">
          <div className="wifi">
            <Wifi size={18} aria-hidden="true" />
            <div>
              <strong>{networkName ?? 'Wi-Fi'}</strong>
              <span>{speedLabel}</span>
            </div>
          </div>
          <span className={`connection-dot connection-dot--${status}`} />
          <span className="visually-hidden">{connectionLabel}. {networkName ? `Network ${networkName}. ` : ''}{speedLabel}</span>
          <time dateTime={now.toISOString()}>{dateLabel}</time>
        </div>
      </header>

      <div className="board">
        {error ? <div className="connection-message" role="status">{error}</div> : null}

        {tab === 'overview' ? (
          <section className="glance" aria-label="Home">
            <div className="glance__cameras">
              {glanceCameras.length ? glanceCameras.map((camera) => (
                <CameraTile key={camera.entity_id} entity={camera} nameOnly />
              )) : (
                <ServicePanel icon={<Camera size={22} />} title="No cameras found" detail="Front door and nursery cameras will fill this side once they are in Home Assistant." />
              )}
            </div>
            <div className="glance__side">
              <div className="glance__stats">
                <article className="stat">
                  <span className="stat__label">ALARM</span>
                  <p className={`stat__value${alarmHot ? ' stat__value--hot' : ''}${primaryAlarm?.state === 'disarmed' ? ' stat__value--calm' : ''}`}>
                    {primaryAlarm ? labelState(primaryAlarm.state) : '—'}
                  </p>
                  <p className="stat__note">
                    {primaryAlarm
                      ? alarmEntities.slice(1).map((alarm) => labelState(alarm.state)).join(' · ') || (primaryAlarm.attributes.friendly_name ?? 'Home alarm')
                      : 'No alarm connected'}
                  </p>
                </article>
                <article className="stat">
                  <span className="stat__label">INDOOR</span>
                  <p className="stat__value stat__value--figure">{primaryTemperature ? primaryTemperature.reading.text : '—'}</p>
                  <p className="stat__note">
                    {primaryTemperature
                      ? [primaryTemperature.reading.name, ...extraTemperatures.map((item) => `${item.reading.name} ${item.reading.text}`)].join(' · ')
                      : 'No indoor temperature yet'}
                  </p>
                </article>
              </div>

              <article className="travel-panel">
                <div className="travel-panel__heading"><TrainFront size={22} /><strong>Rainham</strong><span>RNM</span></div>
                {trainEntities.length ? (
                  <TravelRows>
                    {trainEntities.map((entity) => (
                      <div className="travel-entity" key={entity.entity_id}>
                        <span>{entity.attributes.friendly_name ?? 'Departure'}</span>
                        <strong>{entity.state}{typeof entity.attributes.unit_of_measurement === 'string' ? ` ${entity.attributes.unit_of_measurement}` : ''}</strong>
                      </div>
                    ))}
                  </TravelRows>
                ) : <p>Departures show up here when a Rainham rail sensor is available.</p>}
              </article>

              <article className="travel-panel">
                <div className="travel-panel__heading"><Plane size={22} /><strong>Aircraft within 2 miles</strong></div>
                {aircraftStatus === 'error' ? <p role="status">{aircraftError}</p> : aircraft.length ? (
                  <TravelRows>
                    {aircraft.map((plane) => (
                      <div className="travel-entity" key={plane.id}>
                        <span>{plane.callsign}{plane.altitudeFeet !== null ? ` · ${plane.altitudeFeet.toLocaleString()} ft` : ''}</span>
                        <strong>{plane.distanceMiles.toFixed(1)} mi</strong>
                      </div>
                    ))}
                  </TravelRows>
                ) : <p>{aircraftStatus === 'ready' ? 'No aircraft within 2 miles right now.' : 'Checking nearby aircraft…'}</p>}
              </article>
            </div>
          </section>
        ) : null}

        {tab === 'cameras' ? (
          <section className="view-section" aria-label="Cameras">
            <h1 className="visually-hidden">Cameras</h1>
            {cameraEntities.length ? (
              <div className="camera-grid camera-grid--board">
                {cameraEntities.map((camera) => <CameraTile key={camera.entity_id} entity={camera} nameOnly />)}
              </div>
            ) : <ServicePanel icon={<Camera size={22} />} title="No camera entities found" detail="Add your front door and nursery cameras to Home Assistant to see them here." />}
          </section>
        ) : null}

        {tab === 'lights' ? (
          <section className="view-section" aria-label="Lights">
            <h1 className="visually-hidden">Lights</h1>
            {lightEntities.length ? (
              <div className="light-grid">
                {lightEntities.map((light) => <LightCard key={light.entity_id} entity={light} callService={callService} />)}
              </div>
            ) : <ServicePanel icon={<Lightbulb size={22} />} title="No lights found" detail="Light entities from Home Assistant will show here with on, off, and brightness controls." />}
          </section>
        ) : null}

        {tab === 'charger' ? (
          <section className="view-section" aria-label="Car charger">
            <h1 className="visually-hidden">Car charger</h1>
            {chargerEntities.length ? (
              <ChargerPanel entities={chargerEntities} callService={callService} />
            ) : <ServicePanel icon={<BatteryCharging size={22} />} title="No car charger found" detail="A charger switch or sensor whose name includes the charger, such as Ohme, Zappi, or Easee, will show here." />}
          </section>
        ) : null}

        {tab === 'speakers' ? (
          <section className="view-section" aria-label="Audio">
            <h1 className="visually-hidden">Audio</h1>
            {playerEntities.length ? (
              <div className="player-grid">
                {playerEntities.map((player) => <MediaPlayerCard key={player.entity_id} entity={player} callService={callService} />)}
              </div>
            ) : <ServicePanel icon={<Music2 size={22} />} title="No media players found" detail="Add speaker integrations in Home Assistant to control playback from this view." />}
          </section>
        ) : null}
      </div>

      <nav className="dock" aria-label="Main navigation">
        <button className={`dock__item${tab === 'overview' ? ' dock__item--selected' : ''}`} type="button" aria-pressed={tab === 'overview'} onClick={() => setTab('overview')}>
          <House size={22} /> Home
        </button>
        <button className={`dock__item${tab === 'cameras' ? ' dock__item--selected' : ''}`} type="button" aria-pressed={tab === 'cameras'} onClick={() => setTab('cameras')}>
          <Camera size={22} /> Cameras
        </button>
        <button className={`dock__item${tab === 'lights' ? ' dock__item--selected' : ''}`} type="button" aria-pressed={tab === 'lights'} onClick={() => setTab('lights')}>
          <Lightbulb size={22} /> Lights
        </button>
        <button className={`dock__item${tab === 'charger' ? ' dock__item--selected' : ''}`} type="button" aria-pressed={tab === 'charger'} onClick={() => setTab('charger')}>
          <BatteryCharging size={22} /> Charger
        </button>
        <button className={`dock__item${tab === 'speakers' ? ' dock__item--selected' : ''}`} type="button" aria-pressed={tab === 'speakers'} onClick={() => setTab('speakers')}>
          <Music2 size={22} /> Audio
        </button>
      </nav>
    </main>
  );
}
