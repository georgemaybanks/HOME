import type { EntityState } from '../types/homeAssistant';

interface HomeAssistantError {
  code?: string;
  message?: string;
}

const failureMessage = (error?: HomeAssistantError) => error?.message || 'Home Assistant rejected a WebSocket request.';

interface HomeAssistantMessage {
  id?: number;
  type: string;
  success?: boolean;
  result?: unknown;
  error?: HomeAssistantError;
  event?: {
    event_type?: string;
    data?: {
      entity_id?: string;
      new_state?: EntityState | null;
    };
  };
}

interface PendingStateChange {
  entityId: string;
  state: EntityState | null;
}

interface Subscription {
  onEvent: (event: unknown) => void;
  onSubscribed: () => void;
  onError: (error: Error) => void;
}

export class HomeAssistantSocket {
  private socket: WebSocket | null = null;
  private nextId = 1;
  private pendingRequests = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private subscriptions = new Map<number, Subscription>();
  private pendingStateChanges: PendingStateChange[] = [];
  private ready = false;

  constructor(
    private readonly baseUrl: string,
    private readonly accessToken: string,
    private readonly onStates: (states: EntityState[]) => void,
    private readonly onStateChanged: (entityId: string, state: EntityState | null) => void,
    private readonly onStatus: (status: 'connected' | 'disconnected' | 'error') => void,
  ) {}

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        this.onStatus('error');
        reject(error);
      };

      try {
        this.socket = new WebSocket(this.toWebSocketUrl(this.baseUrl));
      } catch (error) {
        fail(error instanceof Error ? error : new Error('Could not open the Home Assistant connection.'));
        return;
      }

      this.socket.addEventListener('open', () => {
        // The token is read from VITE_HA_TOKEN in the provider; configure it in your local .env file.
        this.socket?.send(JSON.stringify({ type: 'auth', access_token: this.accessToken }));
      });

      this.socket.addEventListener('message', (event: MessageEvent<string>) => {
        const message = JSON.parse(event.data) as HomeAssistantMessage;

        if (message.type === 'auth_required') return;
        if (message.type === 'auth_invalid') {
          fail(new Error('Home Assistant rejected the access token.'));
          return;
        }

        if (message.type === 'auth_ok') {
          void this.initialize().then(() => {
            if (!settled) {
              settled = true;
              resolve();
            }
          }).catch((error: unknown) => {
            fail(error instanceof Error ? error : new Error('Home Assistant initialization failed.'));
          });
          return;
        }

        if (message.type === 'result' && message.id !== undefined) {
          const subscription = this.subscriptions.get(message.id);
          if (subscription) {
            if (message.success === false) {
              this.subscriptions.delete(message.id);
              subscription.onError(new Error(failureMessage(message.error)));
            } else {
              subscription.onSubscribed();
            }
            return;
          }
          const pending = this.pendingRequests.get(message.id);
          if (!pending) return;
          this.pendingRequests.delete(message.id);
          if (message.success === false) {
            pending.reject(new Error(failureMessage(message.error)));
          } else {
            pending.resolve(message.result);
          }
          return;
        }

        if (message.type === 'event' && message.id !== undefined) {
          const subscription = this.subscriptions.get(message.id);
          if (subscription) {
            subscription.onEvent(message.event);
            return;
          }
        }

        if (message.type === 'event' && message.event?.event_type === 'state_changed') {
          const data = message.event.data;
          if (!data?.entity_id) return;
          const change = { entityId: data.entity_id, state: data.new_state ?? null };
          if (this.ready) this.onStateChanged(change.entityId, change.state);
          else this.pendingStateChanges.push(change);
        }
      });

      this.socket.addEventListener('error', () => fail(new Error('Unable to connect to Home Assistant. Check the URL and network access.')));
      this.socket.addEventListener('close', () => {
        this.onStatus('disconnected');
        if (!settled) fail(new Error('The Home Assistant connection closed before it was ready.'));
      });
    });
  }

  stop(): void {
    this.ready = false;
    this.socket?.close();
    this.socket = null;
    this.pendingRequests.forEach(({ reject }) => reject(new Error('Home Assistant connection closed.')));
    this.pendingRequests.clear();
    this.subscriptions.forEach((subscription) => subscription.onError(new Error('Home Assistant connection closed.')));
    this.subscriptions.clear();
  }

  command<T>(type: string, payload: Record<string, unknown> = {}): Promise<T> {
    return this.request<T>(type, payload);
  }

  subscribe(type: string, payload: Record<string, unknown>, onEvent: (event: unknown) => void): Promise<() => void> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.subscriptions.set(id, {
        onEvent,
        onSubscribed: () => resolve(() => this.unsubscribe(id)),
        onError: reject,
      });
      this.socket?.send(JSON.stringify({ id, type, ...payload }));
    });
  }

  private unsubscribe(id: number): void {
    if (!this.subscriptions.delete(id)) return;
    const messageId = this.nextId++;
    this.socket?.send(JSON.stringify({ id: messageId, type: 'unsubscribe_events', subscription: id }));
  }

  callService(domain: string, service: string, serviceData: Record<string, unknown> = {}, target?: Record<string, unknown>): Promise<void> {
    return this.request('call_service', { domain, service, service_data: serviceData, ...(target ? { target } : {}) }).then(() => undefined);
  }

  callServiceResult(domain: string, service: string, serviceData: Record<string, unknown> = {}, target?: Record<string, unknown>): Promise<unknown> {
    return this.request('call_service', { domain, service, service_data: serviceData, target, return_response: true });
  }

  private async initialize(): Promise<void> {
    this.onStatus('connected');
    await this.request('subscribe_events', { event_type: 'state_changed' });
    const states = await this.request<EntityState[]>('get_states');
    this.onStates(states);
    this.pendingStateChanges.forEach(({ entityId, state }) => this.onStateChanged(entityId, state));
    this.pendingStateChanges = [];
    this.ready = true;
  }

  private request<T>(type: string, payload: Record<string, unknown> = {}): Promise<T> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve: (value) => resolve(value as T), reject });
      this.socket?.send(JSON.stringify({ id, type, ...payload }));
    });
  }

  private toWebSocketUrl(baseUrl: string): string {
    const url = new URL(baseUrl);
    url.protocol = url.protocol === 'https:' || url.protocol === 'wss:' ? 'wss:' : 'ws:';
    url.pathname = `${url.pathname.replace(/\/$/, '')}/api/websocket`;
    return url.toString();
  }
}
