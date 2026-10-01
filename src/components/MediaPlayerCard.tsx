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
    canVolume: has(4),
    canPrevious: has(16),
    canNext: has(32),
    canTurnOn: has(128),
    canTurnOff: has(256),
    canSource: has(2048),
    canStop: has(4096),
  };
}

export function MediaPlayerCard({ entity, callService }: MediaPlayerCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const volume = typeof entity.attributes.volume_level === 'number' ? entity.attributes.volume_level : null;
  const [volumeValue, setVolumeValue] = useState(volume ?? 0);
  const playerName = entity.attributes.friendly_name ?? entity.entity_id;
  const title = attributeText(entity, 'media_title');
  const artist = attributeText(entity, 'media_artist');
  const isPlaying = entity.state === 'playing';
  const features = mediaFeatures(entity);
  const sources = Array.isArray(entity.attributes.source_list) ? entity.attributes.source_list.filter((source): source is string => typeof source === 'string') : [];
  const currentSource = attributeText(entity, 'source');

  useEffect(() => {
    if (volume !== null) setVolumeValue(volume);
  }, [volume]);

  const runService = async (service: string, serviceData: Record<string, unknown> = {}) => {
    setBusy(true);
    setError(null);
    try {
      await callService('media_player', service, { entity_id: entity.entity_id, ...serviceData });
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Could not control this speaker.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="min-w-0 rounded-md border border-line bg-white p-4">
      <div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded bg-sage-soft text-sage"><Volume2 size={18} /></span><span className={cn('rounded bg-stone-100 px-2 py-1.5 font-mono text-xs uppercase text-muted', isPlaying && 'bg-sage-soft text-sage')}>{entity.state.replaceAll('_', ' ')}</span></div>
      <div className="mt-4 min-w-0"><strong className="block truncate text-lg font-semibold text-ink">{title ?? playerName}</strong><span className="mt-1 block truncate text-base text-muted">{artist ?? (isPlaying ? 'Playing' : 'Not playing')}</span></div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {features.canTurnOn && entity.state === 'off' ? <button className="min-h-12 rounded-md bg-sage-soft px-3 text-base font-semibold text-sage-deep disabled:opacity-50" type="button" disabled={busy} onClick={() => void runService('turn_on')}>Turn on</button> : null}
        {features.canTurnOff && entity.state !== 'off' ? <button className="min-h-12 rounded-md bg-sage-soft px-3 text-base font-semibold text-sage-deep disabled:opacity-50" type="button" disabled={busy} onClick={() => void runService('turn_off')}>Turn off</button> : null}
        {features.canPrevious ? <button className="grid h-12 w-12 place-items-center rounded-lg bg-sage-mist text-ink disabled:opacity-50" type="button" aria-label={`Previous on ${playerName}`} disabled={busy} onClick={() => void runService('media_previous_track')}><SkipBack size={18} /></button> : null}
        <button className="grid h-12 w-12 place-items-center rounded-full bg-sage text-white hover:bg-sage-deep disabled:cursor-wait disabled:opacity-50" type="button" disabled={busy} aria-label={isPlaying ? `Pause ${playerName}` : `Play ${playerName}`} onClick={() => void runService('media_play_pause')}>
          {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
        </button>
        {isPlaying && features.canStop ? <button className="min-h-12 rounded-md bg-sage-soft px-3 text-base font-semibold text-sage-deep disabled:opacity-50" type="button" disabled={busy} onClick={() => void runService('media_stop')}>Stop</button> : null}
        {features.canNext ? <button className="grid h-12 w-12 place-items-center rounded-lg bg-sage-mist text-ink disabled:opacity-50" type="button" aria-label={`Next on ${playerName}`} disabled={busy} onClick={() => void runService('media_next_track')}><SkipForward size={18} /></button> : null}
      </div>
      {features.canSource && sources.length ? (
        <select className="mt-3 min-h-12 w-full rounded-md border border-line bg-white px-3 text-base" aria-label={`${playerName} source`} value={currentSource && sources.includes(currentSource) ? currentSource : ''} disabled={busy} onChange={(event) => void runService('select_source', { source: event.target.value })}>
          {currentSource && sources.includes(currentSource) ? null : <option value="">Choose source</option>}
          {sources.map((source) => <option key={source} value={source}>{source}</option>)}
        </select>
      ) : null}
      {volume !== null ? (
        <div className="mt-3.5 flex items-center gap-2">
          <button className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-sage-mist text-ink disabled:cursor-wait disabled:opacity-50" type="button" title="Decrease volume" aria-label="Decrease volume" disabled={busy} onClick={() => { const nextVolume = Math.max(0, volumeValue - 0.05); setVolumeValue(nextVolume); void runService('volume_set', { volume_level: nextVolume }); }}><Minus size={18} /></button>
          <input className="h-12 min-w-0 flex-1 accent-signal" aria-label={`${playerName} volume`} type="range" min="0" max="1" step="0.01" value={volumeValue} onChange={(event) => setVolumeValue(Number(event.target.value))} onPointerUp={() => void runService('volume_set', { volume_level: volumeValue })} onKeyUp={() => void runService('volume_set', { volume_level: volumeValue })} />
          <button className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-sage-mist text-ink disabled:cursor-wait disabled:opacity-50" type="button" title="Increase volume" aria-label="Increase volume" disabled={busy} onClick={() => { const nextVolume = Math.min(1, volumeValue + 0.05); setVolumeValue(nextVolume); void runService('volume_set', { volume_level: nextVolume }); }}><Plus size={18} /></button>
          <span className="min-w-11 text-right font-mono text-base text-sage-deep">{Math.round(volumeValue * 100)}%</span>
        </div>
      ) : null}
      {error ? <p className="mt-2.5 text-sm text-clay" role="status">{error}</p> : null}
    </article>
  );
}
