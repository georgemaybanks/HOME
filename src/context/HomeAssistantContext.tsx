import { createContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { HomeAssistantSocket } from '../services/homeAssistantSocket';
import type { ConnectionStatus, EntityState } from '../types/homeAssistant';

interface HomeAssistantContextValue {
  entities: Record<string, EntityState>;
  status: ConnectionStatus;
  error: string | null;
  callService: (domain: string, service: string, serviceData?: Record<string, unknown>) => Promise<void>;
}

export const HomeAssistantContext = createContext<HomeAssistantContextValue | null>(null);

export function HomeAssistantProvider({ children }: { children: ReactNode }) {
  const [entities, setEntities] = useState<Record<string, EntityState>>({});
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<HomeAssistantSocket | null>(null);

  useEffect(() => {
    // Set VITE_HA_URL and VITE_HA_TOKEN in .env before starting the Vite dev server.
    const baseUrl = import.meta.env.VITE_HA_URL;
    const accessToken = import.meta.env.VITE_HA_TOKEN;

    if (!baseUrl || !accessToken) {
      setStatus('error');
      setError('Add VITE_HA_URL and VITE_HA_TOKEN to your local .env file.');
      return;
    }

    let active = true;
    const client = new HomeAssistantSocket(
      baseUrl,
      accessToken,
      (states) => {
        if (active) setEntities(Object.fromEntries(states.map((entity) => [entity.entity_id, entity])));
      },
      (entityId, state) => {
        if (!active) return;
        setEntities((current) => {
          const next = { ...current };
          if (state) next[entityId] = state;
          else delete next[entityId];
          return next;
        });
      },
      (nextStatus) => {
        if (active) setStatus(nextStatus);
      },
    );
    clientRef.current = client;

    setStatus('connecting');
    setError(null);
    void client.start().catch((connectionError: unknown) => {
      if (active) setError(connectionError instanceof Error ? connectionError.message : 'Home Assistant connection failed.');
    });

    return () => {
      active = false;
      if (clientRef.current === client) clientRef.current = null;
      client.stop();
    };
  }, []);

  const callService = async (domain: string, service: string, serviceData?: Record<string, unknown>) => {
    const client = clientRef.current;
    if (!client) throw new Error('Home Assistant is not connected.');
    await client.callService(domain, service, serviceData);
  };

  return (
    <HomeAssistantContext.Provider value={{ entities, status, error, callService }}>
      {children}
    </HomeAssistantContext.Provider>
  );
}
