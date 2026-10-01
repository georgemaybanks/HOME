import type { RailDeparture } from './darwinFeed';

const BOARD_URL = 'https://huxley2.azurewebsites.net/departures/RAI/40';
const HORIZON_MINUTES = 120;

interface LdbService {
  std?: string | null;
  etd?: string | null;
  platform?: string | null;
  isCancelled?: boolean;
  serviceID?: string;
  destination?: { locationName?: string }[] | null;
}

interface LdbPayload {
  trainServices?: LdbService[] | null;
  nrccMessages?: { value?: string }[] | null;
}

export interface LdbBoard {
  fetchedAt: number;
  notice: string | null;
  departures: RailDeparture[];
}

export const loadRainhamBoard = async (): Promise<LdbBoard> => {
  const response = await fetch(BOARD_URL, { headers: { accept: 'application/json', 'user-agent': 'CasaMaybanksDashboard/0.1' } });
  if (!response.ok) throw new Error(`National Rail departures returned ${response.status}.`);
  const payload = await response.json() as LdbPayload;
  const nowMinutes = londonNowMinutes();
  const notice = payload.nrccMessages?.find((message) => message.value)?.value?.replace(/\s+/g, ' ').trim() ?? null;
  const departures = (payload.trainServices ?? []).flatMap((service) => toDeparture(service, nowMinutes));
  return { fetchedAt: Date.now(), notice, departures };
};

const toDeparture = (service: LdbService, nowMinutes: number): RailDeparture[] => {
  const scheduled = service.std ?? '';
  const destination = service.destination?.find((item) => item.locationName)?.locationName;
  if (!scheduled || !destination || !withinHorizon(scheduled, nowMinutes)) return [];
  const etd = service.etd ?? 'On time';
  const cancelled = Boolean(service.isCancelled) || etd === 'Cancelled';
  const expectedMinutes = clockMinutes(etd);
  const scheduledMinutes = clockMinutes(scheduled);
  const late = expectedMinutes != null && scheduledMinutes != null && expectedMinutes - scheduledMinutes >= 1;
  const status = cancelled ? 'cancelled' : etd === 'Delayed' || late ? 'delayed' : 'on time';
  const expected = cancelled ? 'Cancelled' : etd === 'On time' ? 'On time' : etd === 'Delayed' ? 'Delayed' : etd.slice(0, 5);
  return [{
    id: service.serviceID || `${scheduled}-${destination}`,
    scheduled: scheduled.slice(0, 5),
    expected,
    destination,
    platform: service.platform && service.platform !== '0' ? service.platform : null,
    status,
  }];
};

const withinHorizon = (clock: string, nowMinutes: number) => {
  const scheduled = clockMinutes(clock);
  if (scheduled == null) return false;
  let ahead = scheduled - nowMinutes;
  if (ahead < -18 * 60) ahead += 24 * 60;
  return ahead >= -2 && ahead <= HORIZON_MINUTES;
};

const londonNowMinutes = () => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return value('hour') * 60 + value('minute');
};

const clockMinutes = (clock: string) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(clock);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};
