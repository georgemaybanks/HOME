export interface EntityState {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    icon?: string;
    unit_of_measurement?: string;
    [key: string]: unknown;
  };
  last_changed: string;
  last_updated: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
