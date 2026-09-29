import { Minus, Pause, Play, Plus, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { EntityState } from '../types/homeAssistant';

interface MediaPlayerCardProps {
  entity: EntityState;
  callService: (domain: string, service: string, serviceData?: Record<string, unknown>) => Promise<void>;
}

function attributeText(entity: EntityState, key: string) {
  const value = entity.attributes[key];
  return typeof value === 'string' ? value : null;
}

export function MediaPlayerCard({ entity, callService }: MediaPlayerCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const volume = typeof entity.attributes.volume_level === 'number' ? entity.attributes.volume_level : null;
  const [volumeValue, setVolumeValue] = useState(volume ?? 0);
  const playerName = entity.attributes.friendly_name ?? entity.entity_id;
  const title = attributeText(entity, 'media_title');
  const artist = attributeText(entity, 'media_artist');
  const playing = entity.state === 'playing';

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
    <article className="player-card">
      <div className="player-card__header"><span className="player-card__icon"><Volume2 size={18} /></span><span className={`player-card__state player-card__state--${entity.state}`}>{entity.state.replaceAll('_', ' ')}</span></div>
      <div className="player-card__track"><strong>{title ?? playerName}</strong><span>{artist ?? entity.entity_id}</span></div>
      <button className="player-card__play" type="button" disabled={busy} aria-label={playing ? `Pause ${playerName}` : `Play ${playerName}`} onClick={() => void runService('media_play_pause')}>
        {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
      </button>
      {volume !== null ? (
        <div className="player-card__volume">
          <button type="button" title="Decrease volume" aria-label="Decrease volume" disabled={busy} onClick={() => { const nextVolume = Math.max(0, volumeValue - 0.05); setVolumeValue(nextVolume); void runService('volume_set', { volume_level: nextVolume }); }}><Minus size={14} /></button>
          <input aria-label={`${playerName} volume`} type="range" min="0" max="1" step="0.01" value={volumeValue} onChange={(event) => setVolumeValue(Number(event.target.value))} onPointerUp={() => void runService('volume_set', { volume_level: volumeValue })} onKeyUp={() => void runService('volume_set', { volume_level: volumeValue })} />
          <button type="button" title="Increase volume" aria-label="Increase volume" disabled={busy} onClick={() => { const nextVolume = Math.min(1, volumeValue + 0.05); setVolumeValue(nextVolume); void runService('volume_set', { volume_level: nextVolume }); }}><Plus size={14} /></button>
          <span>{Math.round(volumeValue * 100)}%</span>
        </div>
      ) : null}
      {error ? <p className="player-card__error" role="status">{error}</p> : null}
    </article>
  );
}
