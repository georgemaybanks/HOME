import { Camera } from 'lucide-react';
import { useState } from 'react';
import type { EntityState } from '../types/homeAssistant';

interface CameraTileProps {
  entity: EntityState;
  nameOnly?: boolean;
}

export function CameraTile({ entity, nameOnly = false }: CameraTileProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [streamFailed, setStreamFailed] = useState(false);
  const picture = entity.attributes.entity_picture;
  const pictureUrl = typeof picture === 'string' ? picture : undefined;
  const baseUrl = import.meta.env.VITE_HA_URL;
  const accessToken = import.meta.env.VITE_HA_TOKEN;
  let streamUrl: string | undefined;
  if (baseUrl && accessToken) {
    try {
      const url = new URL(`/api/camera_proxy_stream/${encodeURIComponent(entity.entity_id)}`, baseUrl);
      url.searchParams.set('token', accessToken);
      streamUrl = url.toString();
    } catch {
      streamUrl = undefined;
    }
  }
  const useStream = Boolean(streamUrl && !streamFailed);
  const source = useStream ? streamUrl : pictureUrl;
  const showPicture = source && !imageFailed;
  const name = entity.attributes.friendly_name ?? entity.entity_id;

  return (
    <article className="camera-tile">
      <div className="camera-tile__image">
        {showPicture ? (
          <img src={source} alt={`${name} camera`} loading="lazy" onError={() => {
            if (useStream && pictureUrl) setStreamFailed(true);
            else setImageFailed(true);
          }} />
        ) : (
          <div className="camera-tile__placeholder"><Camera size={25} strokeWidth={1.5} /><span>Camera image unavailable</span></div>
        )}
        <span className="camera-tile__live"><i /> {showPicture ? useStream ? 'LIVE' : 'SNAPSHOT' : 'NO IMAGE'}</span>
      </div>
      <div className="camera-tile__caption"><strong>{name}</strong>{nameOnly ? null : <span>{entity.entity_id}</span>}</div>
    </article>
  );
}
