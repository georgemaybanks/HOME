import { Activity, AirVent, Camera, DoorOpen, Droplets, House, Lightbulb, LockKeyhole, Music2, Plane, PlugZap, Thermometer, TrainFront, Wifi } from 'lucide-react';
import { useState } from 'react';
import { CameraTile } from './components/CameraTile';
import { EntityCard } from './components/EntityCard';
import { MediaPlayerCard } from './components/MediaPlayerCard';
import { useHomeAssistant } from './hooks/useHomeAssistant';
import { useNearbyAircraft } from './hooks/useNearbyAircraft';
import type { EntityState } from './types/homeAssistant';

type DashboardTab = 'overview' | 'cameras' | 'speakers';

const domainIcons = {
  alarm_control_panel: LockKeyhole,
  binary_sensor: Activity,
  camera: Camera,
  climate: Thermometer,
  cover: DoorOpen,
  fan: AirVent,
  light: Lightbulb,
  lock: LockKeyhole,
  sensor: Activity,
  switch: PlugZap,
  water_heater: Droplets,
} as const;

function getIcon(entityId: string) {
  const domain = entityId.split('.')[0] as keyof typeof domainIcons;
  const Icon = domainIcons[domain] ?? House;
  return <Icon />;
}

function EntityGrid({ entities }: { entities: EntityState[] }) {
  return (
    <div className="entity-grid">
      {entities.map((entity) => (
        <EntityCard
          key={entity.entity_id}
          entityId={entity.entity_id}
          state={entity.state}
          friendlyName={entity.attributes.friendly_name ?? entity.entity_id}
          icon={getIcon(entity.entity_id)}
          unit={typeof entity.attributes.unit_of_measurement === 'string' ? entity.attributes.unit_of_measurement : undefined}
        />
      ))}
    </div>
  );
}

function ServicePanel({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <div className="service-panel"><span>{icon}</span><div><strong>{title}</strong><p>{detail}</p></div></div>;
}

function matchesWords(entity: EntityState, words: string[]) {
  const haystack = `${entity.entity_id} ${entity.attributes.friendly_name ?? ''}`.toLowerCase();
  return words.some((word) => haystack.includes(word));
}

function TravelEntityList({ entities }: { entities: EntityState[] }) {
  return (
    <div className="travel-panel__entities">
      {entities.map((entity) => (
        <div className="travel-entity" key={entity.entity_id}>
          <span>{entity.attributes.friendly_name ?? entity.entity_id}</span>
          <strong>{entity.state}{typeof entity.attributes.unit_of_measurement === 'string' ? ` ${entity.attributes.unit_of_measurement}` : ''}</strong>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const { entities, status, error, callService } = useHomeAssistant();
  const { aircraft, status: aircraftStatus, error: aircraftError, updatedAt: aircraftUpdatedAt } = useNearbyAircraft();
  const [tab, setTab] = useState<DashboardTab>('overview');
  const entityList = Object.values(entities).sort((a, b) =>
    (a.attributes.friendly_name ?? a.entity_id).localeCompare(b.attributes.friendly_name ?? b.entity_id),
  );
  const cameraEntities = entityList.filter(({ entity_id }) => entity_id.startsWith('camera.'));
  const playerEntities = entityList.filter(({ entity_id }) => entity_id.startsWith('media_player.'));
  const alarmEntities = entityList.filter(({ entity_id }) => entity_id.startsWith('alarm_control_panel.'));
  const sensorEntities = entityList.filter(({ entity_id }) => entity_id.startsWith('sensor.') || entity_id.startsWith('binary_sensor.'));
  const temperatureEntities = entityList.filter((entity) => {
    const unit = entity.attributes.unit_of_measurement;
    return entity.entity_id.startsWith('climate.') || unit === '°C' || unit === '°F' || matchesWords(entity, ['temperature', 'indoor temp']);
  });
  const trainEntities = entityList.filter((entity) => matchesWords(entity, ['rainham', 'train', 'station', 'departure', 'railway']));
  const frontDoor = cameraEntities.find((entity) => matchesWords(entity, ['front door', 'front_door', 'doorbell'])) ?? cameraEntities[0];
  const babyCamera = cameraEntities.find((entity) => entity !== frontDoor && matchesWords(entity, ['baby', 'nursery', 'crib'])) ?? cameraEntities.find((entity) => entity !== frontDoor);
  const activeCount = entityList.filter(({ state }) => !['off', 'closed', 'unavailable', 'unknown', 'idle'].includes(state)).length;

  const viewNames: Record<DashboardTab, string> = { overview: 'OVERVIEW', cameras: 'CAMERAS', speakers: 'AUDIO' };

  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Home dashboard">
          <span className="brand__mark"><House size={19} strokeWidth={1.8} /></span>
          <span className="brand__name">habitat<span>.</span></span>
        </a>
        <div className="sidebar__section-label">YOUR HOME</div>
        <nav className="sidebar__nav" aria-label="Main navigation">
          <button className={`sidebar__link${tab === 'overview' ? ' sidebar__link--selected' : ''}`} type="button" aria-pressed={tab === 'overview'} onClick={() => setTab('overview')}><Activity size={17} /> Overview</button>
          <button className={`sidebar__link${tab === 'cameras' ? ' sidebar__link--selected' : ''}`} type="button" aria-pressed={tab === 'cameras'} onClick={() => setTab('cameras')}><Camera size={17} /> Cameras <span>{cameraEntities.length}</span></button>
          <button className={`sidebar__link${tab === 'speakers' ? ' sidebar__link--selected' : ''}`} type="button" aria-pressed={tab === 'speakers'} onClick={() => setTab('speakers')}><Music2 size={17} /> Speakers <span>{playerEntities.length}</span></button>
        </nav>
        <div className="sidebar__footer">
          <span className={`connection-dot connection-dot--${status}`} />
          <div><strong>{status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting' : status === 'error' ? 'Connection issue' : 'Disconnected'}</strong><small>Home Assistant</small></div>
          <Wifi className="sidebar__wifi" size={15} />
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <span className="topbar__location"><span className="topbar__pin" /> HOME / {viewNames[tab]}</span>
          <time>{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</time>
        </header>

        <div className="content">
          {error ? <div className="connection-message" role="status">{error}</div> : null}

          {tab === 'overview' ? (
            <>
              <section className="welcome-row">
                <div><p className="eyebrow">YOUR SPACE, AT A GLANCE</p><h1>Home overview</h1><p className="welcome-row__caption">A live view of what’s happening at home.</p></div>
                <div className="status-summary" aria-live="polite"><span className={`status-summary__dot status-summary__dot--${status}`} /><span>{status === 'connected' ? 'Live updates on' : status === 'connecting' ? 'Connecting to your home' : 'Home connection unavailable'}</span></div>
              </section>

              <section className="metrics" aria-label="Home summary">
                <div className="metric"><span className="metric__label">ENTITIES</span><strong>{entityList.length.toString().padStart(2, '0')}</strong><span className="metric__note">Available in Home Assistant</span></div>
                <div className="metric"><span className="metric__label">ACTIVE NOW</span><strong>{activeCount.toString().padStart(2, '0')}</strong><span className="metric__note">Not idle or switched off</span></div>
                <div className="metric metric--signal"><span className="metric__label">CONNECTION</span><strong>{status === 'connected' ? 'Live' : status === 'connecting' ? '…' : '—'}</strong><span className="metric__note">WebSocket state stream</span></div>
              </section>

              <section className="overview-section">
                <div className="section-heading"><div><p className="eyebrow">SECURITY & COMFORT</p><h2>Alarms <span>{alarmEntities.length}</span></h2></div></div>
                {alarmEntities.length ? <EntityGrid entities={alarmEntities} /> : <ServicePanel icon={<LockKeyhole size={19} />} title="No alarm entities found" detail="Add an alarm_control_panel integration in Home Assistant to see its status here." />}
              </section>

              <section className="overview-section">
                <div className="section-heading"><div><p className="eyebrow">INDOOR CLIMATE</p><h2>Temperatures <span>{temperatureEntities.length}</span></h2></div></div>
                {temperatureEntities.length ? <EntityGrid entities={temperatureEntities} /> : <ServicePanel icon={<Thermometer size={19} />} title="No temperature entities found" detail="Temperature sensors and climate entities will appear here when available." />}
              </section>

              <section className="overview-section">
                <div className="section-heading"><div><p className="eyebrow">KEEP AN EYE ON HOME</p><h2>At home <span>{sensorEntities.length}</span></h2></div></div>
                {sensorEntities.length ? <EntityGrid entities={sensorEntities} /> : <ServicePanel icon={<Activity size={19} />} title="No sensors found" detail="Sensors and binary sensors from Home Assistant will appear here." />}
              </section>

              <section className="overview-section">
                <div className="section-heading"><div><p className="eyebrow">QUICK LOOK</p><h2>Front door & nursery <span>{cameraEntities.length}</span></h2></div><button className="text-action" type="button" onClick={() => setTab('cameras')}>All cameras <span aria-hidden="true">→</span></button></div>
                {cameraEntities.length ? <div className="camera-grid">{[frontDoor, babyCamera].filter((camera): camera is EntityState => Boolean(camera)).map((camera) => <CameraTile key={camera.entity_id} entity={camera} compact />)}</div> : <ServicePanel icon={<Camera size={19} />} title="No cameras found" detail="Camera entities will show up here once added to Home Assistant." />}
              </section>

              <section className="overview-section overview-section--travel">
                <div className="section-heading"><div><p className="eyebrow">OUT AND ABOUT</p><h2>Nearby <span>{trainEntities.length + aircraft.length}</span></h2></div></div>
                <div className="travel-grid">
                  <div className="travel-panel"><div className="travel-panel__heading"><TrainFront size={18} /><strong>Rainham, Kent</strong><span>RNM</span></div>{trainEntities.length ? <TravelEntityList entities={trainEntities} /> : <p>Train departures will appear here when a Rainham rail sensor is available in Home Assistant.</p>}</div>
                  <div className="travel-panel"><div className="travel-panel__heading"><Plane size={18} /><strong>Aircraft within 2 miles</strong>{aircraftUpdatedAt ? <span>UPDATED {new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(aircraftUpdatedAt))}</span> : null}</div>
                    {aircraftStatus === 'error' ? <p role="status">{aircraftError}</p> : aircraft.length ? <div className="travel-panel__entities">{aircraft.map((plane) => <div className="travel-entity" key={plane.id}><span>{plane.callsign}{plane.altitudeFeet !== null ? ` · ${plane.altitudeFeet.toLocaleString()} ft` : ''}</span><strong>{plane.distanceMiles.toFixed(1)} mi</strong></div>)}</div> : <p>{aircraftStatus === 'ready' ? 'No aircraft detected within 2 miles right now.' : 'Checking nearby aircraft…'}</p>}
                  </div>
                </div>
              </section>
            </>
          ) : null}

          {tab === 'cameras' ? (
            <section className="view-section">
              <div className="welcome-row"><div><p className="eyebrow">LIVE FROM HOME ASSISTANT</p><h1>Camera feeds</h1><p className="welcome-row__caption">Your connected cameras in one place.</p></div><div className="status-summary"><Camera size={15} /><span>{cameraEntities.length} cameras</span></div></div>
              {cameraEntities.length ? <div className="camera-grid camera-grid--all">{cameraEntities.map((camera) => <CameraTile key={camera.entity_id} entity={camera} />)}</div> : <ServicePanel icon={<Camera size={19} />} title="No camera entities found" detail="Add your front door and nursery cameras to Home Assistant to see them here." />}
            </section>
          ) : null}

          {tab === 'speakers' ? (
            <section className="view-section">
              <div className="welcome-row"><div><p className="eyebrow">LISTENING AROUND HOME</p><h1>Music & speakers</h1><p className="welcome-row__caption">Playback and volume controls for your media players.</p></div><div className="status-summary"><Music2 size={15} /><span>{playerEntities.length} players</span></div></div>
              {playerEntities.length ? <div className="player-grid">{playerEntities.map((player) => <MediaPlayerCard key={player.entity_id} entity={player} callService={callService} />)}</div> : <ServicePanel icon={<Music2 size={19} />} title="No media players found" detail="Add speaker integrations in Home Assistant to control playback from this view." />}
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
