import { Minus, Pause, Play, Plus, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../lib/cn';
import type { CallService } from '../types/dashboard';
import type { EntityState } from '../types/homeAssistant';

interface MediaPlayerCardProps {
  entity: EntityState;
  callService: CallService;
}

function attributeText(entity: EntityState, key: string) {
  const value = entity.attributes[key];
  return typeof value === 'string' ? value : null;
}

function mediaFeatures(entity: EntityState) {
  const features = typeof entity.attributes.supported_features === 'number' ? entity.attributes.supported_features : 0;
  const has = (bit: number) => (features & bit) !== 0;
  return {
    canPause: has(1),
    canVolume: has(4),
    canPrevious: has(16),
    canNext: has(32),
    canTurnOn: has(128),
    canTurnOff: has(256),
    canPlayMedia: has(512),
    canSource: has(2048),
    canStop: has(4096),
    canPlay: has(16384),
  };
}

export function MediaPlayerCard({ entity, callService }: MediaPlayerCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phrase, setPhrase] = useState('');
  const volume = typeof entity.attributes.volume_level === 'number' ? entity.attributes.volume_level : null;
  const [volumeValue, setVolumeValue] = useState(volume ?? 0);
  const playerName = entity.attributes.friendly_name ?? entity.entity_id;
  const title = attributeText(entity, 'media_title');
  const artist = attributeText(entity, 'media_artist');
  const isPlaying = entity.state === 'playing';
  const isPaused = entity.state === 'paused';
  const unavailable = entity.state === 'unavailable';
  const features = mediaFeatures(entity);
  const canSpeak = features.canPlayMedia && !features.canPlay;
  const speakEntity = `${entity.entity_id.replace(/^media_player\./, 'notify.')}_speak`;
  const sources = Array.isArray(entity.attributes.source_list) ? entity.attributes.source_list.filter((source): source is string => typeof source === 'string') : [];
  const currentSource = attributeText(entity, 'source');

  useEffect(() => {
    if (volume !== null) setVolumeValue(volume);
  }, [volume]);

  const runService = async (domain: string, service: string, serviceData: Record<string, unknown> = {}, target?: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await callService(domain, service, serviceData, target);
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Could not control this speaker.');
    } finally {
      setBusy(false);
    }
  };

  const playOrPause = () => {
    if (isPlaying && features.canPause) return runService('media_player', 'media_pause', {}, { entity_id: entity.entity_id });
    if (features.canPlay) return runService('media_player', 'media_play', {}, { entity_id: entity.entity_id });
    return runService('media_player', 'media_stop', {}, { entity_id: entity.entity_id });
  };

  const speak = () => {
    const message = phrase.trim();
    if (!message) return;
    return runService('notify', 'send_message', { message }, { entity_id: speakEntity });
  };

  return (
    <article className="min-w-0 rounded-md border border-line bg-white p-4">
      <div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded bg-sage-soft text-sage"><Volume2 size={18} /></span><span className={cn('rounded bg-stone-100 px-2 py-1.5 font-mono text-xs uppercase text-muted', isPlaying && 'bg-sage-soft text-sage')}>{entity.state.replaceAll('_', ' ')}</span></div>
      <div className="mt-4 min-w-0"><strong className="block truncate text-lg font-semibold text-ink">{title ?? playerName}</strong><span className="mt-1 block truncate text-base text-muted">{artist ?? (isPlaying ? 'Playing' : 'Not playing')}</span></div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {features.canTurnOn && entity.state === 'off' ? <button className="min-h-12 rounded-md bg-sage-soft px-3 text-base font-semibold text-sage-deep disabled:opacity-50" type="button" disabled={busy || unavailable} onClick={() => void runService('media_player', 'turn_on', {}, { entity_id: entity.entity_id })}>Turn on</button> : null}
        {features.canTurnOff && entity.state !== 'off' && entity.state !== 'unavailable' ? <button className="min-h-12 rounded-md bg-sage-soft px-3 text-base font-semibold text-sage-deep disabled:opacity-50" type="button" disabled={busy} onClick={() => void runService('media_player', 'turn_off', {}, { entity_id: entity.entity_id })}>Turn off</button> : null}
        {features.canPrevious ? <button className="grid h-12 w-12 place-items-center rounded-lg bg-sage-mist text-ink disabled:opacity-50" type="button" aria-label={`Previous on ${playerName}`} disabled={busy || unavailable} onClick={() => void runService('media_player', 'media_previous_track', {}, { entity_id: entity.entity_id })}><SkipBack size={18} /></button> : null}
        {features.canPlay || features.canPause ? (
          <button className="grid h-12 w-12 place-items-center rounded-full bg-sage text-white hover:bg-sage-deep disabled:cursor-wait disabled:opacity-50" type="button" disabled={busy || unavailable} aria-label={isPlaying ? `Pause ${playerName}` : `Play ${playerName}`} onClick={() => void playOrPause()}>
            {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
          </button>
        ) : null}
        {(isPlaying || isPaused) && features.canStop ? <button className="min-h-12 rounded-md bg-sage-soft px-3 text-base font-semibold text-sage-deep disabled:opacity-50" type="button" disabled={busy} onClick={() => void runService('media_player', 'media_stop', {}, { entity_id: entity.entity_id })}>Stop</button> : null}
        {features.canNext ? <button className="grid h-12 w-12 place-items-center rounded-lg bg-sage-mist text-ink disabled:opacity-50" type="button" aria-label={`Next on ${playerName}`} disabled={busy || unavailable} onClick={() => void runService('media_player', 'media_next_track', {}, { entity_id: entity.entity_id })}><SkipForward size={18} /></button> : null}
      </div>
      {features.canSource && sources.length ? (
        <select className="mt-3 min-h-12 w-full rounded-md border border-line bg-white px-3 text-base" aria-label={`${playerName} source`} value={currentSource && sources.includes(currentSource) ? currentSource : ''} disabled={busy || unavailable} onChange={(event) => void runService('media_player', 'select_source', { source: event.target.value }, { entity_id: entity.entity_id })}>
          {currentSource && sources.includes(currentSource) ? null : <option value="">Choose source</option>}
          {sources.map((source) => <option key={source} value={source}>{source}</option>)}
        </select>
      ) : null}
      {volume !== null ? (
        <div className="mt-3.5 flex items-center gap-2">
          <button className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-sage-mist text-ink disabled:cursor-wait disabled:opacity-50" type="button" title="Decrease volume" aria-label="Decrease volume" disabled={busy || unavailable} onClick={() => { const nextVolume = Math.max(0, volumeValue - 0.05); setVolumeValue(nextVolume); void runService('media_player', 'volume_set', { volume_level: nextVolume }, { entity_id: entity.entity_id }); }}><Minus size={18} /></button>
          <input className="h-12 min-w-0 flex-1 accent-signal" aria-label={`${playerName} volume`} type="range" min="0" max="1" step="0.01" value={volumeValue} disabled={unavailable} onChange={(event) => setVolumeValue(Number(event.target.value))} onPointerUp={() => void runService('media_player', 'volume_set', { volume_level: volumeValue }, { entity_id: entity.entity_id })} onKeyUp={() => void runService('media_player', 'volume_set', { volume_level: volumeValue }, { entity_id: entity.entity_id })} />
          <button className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-sage-mist text-ink disabled:cursor-wait disabled:opacity-50" type="button" title="Increase volume" aria-label="Increase volume" disabled={busy || unavailable} onClick={() => { const nextVolume = Math.min(1, volumeValue + 0.05); setVolumeValue(nextVolume); void runService('media_player', 'volume_set', { volume_level: nextVolume }, { entity_id: entity.entity_id }); }}><Plus size={18} /></button>
          <span className="min-w-11 text-right font-mono text-base text-sage-deep">{Math.round(volumeValue * 100)}%</span>
        </div>
      ) : null}
      {canSpeak ? (
        <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); void speak(); }}>
          <input className="min-h-12 min-w-0 flex-1 rounded-md border border-line bg-white px-3 text-base text-ink" aria-label={`Say this on ${playerName}`} placeholder="Say this" value={phrase} disabled={busy || unavailable} onChange={(event) => setPhrase(event.target.value)} />
          <button className="min-h-12 rounded-md bg-sage px-3 text-base font-bold text-paper disabled:opacity-50" type="submit" disabled={busy || unavailable || !phrase.trim()}>Speak</button>
        </form>
      ) : null}
      {error ? <p className="mt-2.5 text-sm text-clay" role="status">{error}</p> : null}
    </article>
  );
}
