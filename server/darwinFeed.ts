import zlib from 'node:zlib';
import { XMLParser } from 'fast-xml-parser';
import { openStomp } from './stomp';
import { stationName } from './stationNames';

const RAINHAM = 'RAINHMK';
const ARRAY_TAGS = new Set(['uR', 'Location', 'IP', 'OPIP', 'PP', 'OR', 'OPOR', 'DT', 'OPDT', 'Station', 'set', 'clear']);

export interface RailDeparture {
  id: string;
  scheduled: string;
  expected: string;
  destination: string;
  platform: string | null;
  status: 'on time' | 'delayed' | 'cancelled';
}

export interface RailSnapshot {
  status: 'connecting' | 'connected' | 'error';
  error: string | null;
  notice: string | null;
  departures: RailDeparture[];
}

interface DarwinOptions {
  host: string;
  port: number;
  username: string;
  password: string;
  topic: string;
  statusTopic: string;
}

interface Stop {
  tpl: string;
  kind: 'origin' | 'call' | 'pass' | 'dest';
  pta?: string;
  ptd?: string;
  wta?: string;
  wtd?: string;
  et?: string;
  at?: string;
  clearActual?: boolean;
  etUnknown?: boolean;
  platform?: string;
  suppressed?: boolean;
  passOnly?: boolean;
  cancelled?: boolean;
}

interface Service {
  rid: string;
  ssd: string;
  operator: string;
  cancelled: boolean;
  stops: Stop[];
}

type XmlNode = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text',
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: (tagName, _path, _leaf, isAttribute) => !isAttribute && ARRAY_TAGS.has(tagName),
});

export const startDarwinFeed = (options: DarwinOptions) => {
  const board = createRailBoard();
  let status: RailSnapshot['status'] = 'connecting';
  let error: string | null = null;
  let connection: { close: () => void } | null = null;
  let stopped = false;
  let attempt = 0;
  let timer: NodeJS.Timeout | null = null;
  let messages = 0;

  const connect = () => {
    if (stopped || connection) return;
    if (!options.username || !options.password) {
      status = 'error';
      error = 'Add the Darwin username and password to the local .env file.';
      return;
    }
    status = error ? 'error' : 'connecting';
    connection = openStomp({
      host: options.host,
      port: options.port,
      login: options.username,
      passcode: options.password,
      clientId: `${options.username}-casa`,
      onReady: (send) => {
        attempt = 0;
        status = 'connected';
        error = null;
        send('SUBSCRIBE', { id: 'live', destination: topicPath(options.topic), ack: 'auto' });
        send('SUBSCRIBE', { id: 'status', destination: topicPath(options.statusTopic), ack: 'auto' });
        console.info('Darwin Push Port connected.');
      },
      onFrame: (frame) => {
        if (frame.command !== 'MESSAGE') return;
        const xml = decodeBody(frame.body);
        const destination = frame.headers.destination ?? '';
        if (destination.includes('status')) {
          board.noteFeedStatus(xml.replace(/\s+/g, ' ').trim().slice(0, 240));
          return;
        }
        board.ingest(xml);
        messages += 1;
        if (messages === 1) console.info('Darwin live feed is receiving updates.');
      },
      onError: (nextError) => {
        status = 'error';
        error = nextError.message.includes('already connected')
          ? 'National Rail already has this feed open. Retrying.'
          : 'National Rail connection failed. Retrying.';
        if (nextError.message.includes('already connected')) attempt = Math.max(attempt, 3);
        console.error(`Darwin connection error: ${nextError.message.replaceAll(options.username, 'Darwin user')}`);
      },
      onClose: () => {
        connection = null;
        if (stopped) return;
        if (status !== 'error') status = 'connecting';
        const delay = Math.min(30_000, 2_000 * 2 ** attempt);
        attempt += 1;
        timer = setTimeout(connect, delay);
      },
    });
  };

  connect();

  return {
    snapshot: (): RailSnapshot => ({ ...board.snapshot(), status, error }),
    close: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      connection?.close();
    },
  };
};

export const createRailBoard = () => {
  const services = new Map<string, Service>();
  let notice: { id: string; text: string } | null = null;
  let feedStatus = '';

  const ingest = (xml: string) => {
    const mentionsStation = xml.includes(RAINHAM) || xml.includes('crs="RAI"');
    const mentionsRemoval = xml.includes('<deactivated') || xml.includes('deleted="true"') || xml.includes('<cancel');
    if (!mentionsStation && !mentionsRemoval) return;
    if (!mentionsStation && mentionsRemoval) {
      const rid = xml.match(/\brid="([^"]+)"/)?.[1];
      if (!rid || !services.has(rid)) return;
    }

    let document: unknown;
    try {
      document = parser.parse(xml);
    } catch {
      return;
    }
    const root = asNode(document);
    const port = asNode(root?.Pport) ?? root;
    if (!port) return;
    for (const update of asNodes(port.uR)) applyUpdate(update);
  };

  const applyUpdate = (update: XmlNode) => {
    const deactivated = asNode(update.deactivated);
    if (deactivated?.rid) services.delete(String(deactivated.rid));
    const schedule = asNode(update.schedule);
    if (schedule) applySchedule(schedule);
    const train = asNode(update.TS);
    if (train) applyTrain(train);
    if (update.alarm) applyAlarm(update.alarm);
  };

  const applySchedule = (schedule: XmlNode) => {
    const rid = attr(schedule, 'rid');
    if (!rid) return;
    if (attr(schedule, 'deleted') === 'true') {
      services.delete(rid);
      return;
    }
    const stops = readScheduleStops(schedule);
    const rainham = stops.find((stop) => stop.tpl === RAINHAM);
    if (!rainham || rainham.passOnly) {
      services.delete(rid);
      return;
    }
    if (attr(schedule, 'isPassengerSvc') === 'false' && !rainham.ptd && !rainham.pta) {
      services.delete(rid);
      return;
    }
    const previous = services.get(rid);
    services.set(rid, {
      rid,
      ssd: attr(schedule, 'ssd') ?? previous?.ssd ?? '',
      operator: attr(schedule, 'toc') ?? previous?.operator ?? '',
      cancelled: Boolean(schedule.cancelReason) || previous?.cancelled || false,
      stops: stops.map((stop) => mergeStop(previous?.stops.find((item) => item.tpl === stop.tpl), stop)),
    });
  };

  const applyTrain = (train: XmlNode) => {
    const rid = attr(train, 'rid');
    if (!rid) return;
    const locations = asNodes(train.Location).map(readForecastStop).filter((stop): stop is Stop => Boolean(stop));
    const rainhamUpdate = locations.some((stop) => stop.tpl === RAINHAM);
    const existing = services.get(rid);
    if (!existing && !rainhamUpdate) return;
    const service: Service = existing ?? { rid, ssd: attr(train, 'ssd') ?? '', operator: '', cancelled: false, stops: [] };
    service.ssd = attr(train, 'ssd') ?? service.ssd;
    if (train.cancel != null) service.cancelled = true;
    for (const location of locations) {
      const index = service.stops.findIndex((stop) => stop.tpl === location.tpl);
      if (index === -1) service.stops.push(location);
      else service.stops[index] = mergeStop(service.stops[index], location);
    }
    const rainham = service.stops.find((stop) => stop.tpl === RAINHAM);
    if (!rainham || rainham.passOnly || rainham.suppressed) {
      services.delete(rid);
      return;
    }
    services.set(rid, service);
  };

  const applyAlarm = (alarm: unknown) => {
    const node = asNode(alarm);
    if (!node) return;
    for (const clear of asNodes(node.clear)) {
      if (notice && attr(clear, 'id') === notice.id) notice = null;
    }
    for (const item of asNodes(node.set)) {
      const stations = asNodes(item.Station);
      if (!stations.some((station) => attr(station, 'crs') === 'RAI')) continue;
      const text = textOf(item.Msg)?.replace(/\s+/g, ' ').trim();
      if (text) notice = { id: attr(item, 'id') ?? text, text };
    }
  };

  const snapshot = (): Pick<RailSnapshot, 'notice' | 'departures'> => {
    const now = Date.now();
    for (const [rid, service] of services) {
      const stop = service.stops.find((item) => item.tpl === RAINHAM);
      const scheduled = stop?.ptd || stop?.pta || stop?.wtd || stop?.wta;
      const scheduledAt = scheduled && service.ssd ? londonToUtc(service.ssd, scheduled) : null;
      if (scheduledAt != null && scheduledAt < now - 3 * 60 * 60_000) services.delete(rid);
    }
    const departures = [...services.values()].flatMap((service) => toDeparture(service, now)).sort((left, right) => left.sort - right.sort);
    const problem = /unavailable|error|fail|down/i.test(feedStatus) ? feedStatus : null;
    return { notice: problem ?? notice?.text ?? null, departures: departures.map(({ sort: _sort, ...departure }) => departure) };
  };

  return { ingest, snapshot, noteFeedStatus: (text: string) => { feedStatus = text; } };
};

const toDeparture = (service: Service, now: number) => {
  const stop = service.stops.find((item) => item.tpl === RAINHAM);
  const scheduled = stop?.ptd || stop?.pta || stop?.wtd || stop?.wta;
  if (!stop || !scheduled || stop.suppressed || stop.passOnly || !service.ssd) return [];
  const scheduledAt = londonToUtc(service.ssd, scheduled);
  const expectedClock = stop.et || scheduled;
  const expectedAt = londonToUtc(service.ssd, expectedClock) ?? scheduledAt;
  if (scheduledAt == null || expectedAt == null) return [];
  const cancelled = service.cancelled || stop.cancelled === true;
  const actualAt = stop.at ? londonToUtc(service.ssd, stop.at) : null;
  if (!cancelled && actualAt != null && actualAt < now - 60_000) return [];
  if (!cancelled && actualAt == null && !stop.etUnknown && expectedAt < now - 2 * 60_000) return [];
  if (!cancelled && stop.etUnknown && scheduledAt < now - 90 * 60_000) return [];
  if (cancelled && scheduledAt < now - 30 * 60_000) return [];
  if (scheduledAt > now + 2 * 60 * 60_000) return [];

  const destination = describeDestination(service.stops, stop);
  if (!destination) return [];
  const late = stop.et ? clockMinutes(stop.et) - clockMinutes(scheduled) : 0;
  const status = cancelled ? 'cancelled' : stop.etUnknown || late >= 1 ? 'delayed' : 'on time';
  const expected = cancelled ? 'Cancelled' : stop.etUnknown ? 'Delayed' : status === 'on time' ? 'On time' : displayTime(stop.et || scheduled);

  return [{
    id: service.rid,
    scheduled: displayTime(scheduled),
    expected,
    destination,
    platform: stop.platform ?? null,
    status,
    sort: expectedAt,
  }];
};

const describeDestination = (stops: Stop[], rainham: Stop) => {
  const ahead = stopsAfter(stops, rainham);
  const explicit = [...ahead].reverse().find((stop) => stop.kind === 'dest');
  const terminus = [...ahead].reverse().find((stop) => (stop.pta || stop.wta) && !stop.ptd && !stop.wtd);
  const target = explicit ?? terminus ?? ahead.at(-1);
  if (target) return stationName(target.tpl);
  if (!rainham.ptd && !rainham.wtd) return 'Rainham';
  return null;
};

const stopsAfter = (stops: Stop[], rainham: Stop) => {
  const rainhamClock = stopClock(rainham);
  if (!rainhamClock) return [];
  const rainhamMinutes = clockMinutes(rainhamClock);
  return stops
    .filter((stop) => stop.tpl !== RAINHAM && !stop.passOnly && !stop.suppressed && stationName(stop.tpl))
    .flatMap((stop) => {
      const minutes = minutesAfter(stop, rainhamMinutes);
      return minutes == null ? [] : [{ stop, minutes }];
    })
    .filter((item) => item.minutes > rainhamMinutes)
    .sort((left, right) => left.minutes - right.minutes)
    .map((item) => item.stop);
};

const stopClock = (stop: Stop) => stop.ptd || stop.wtd || stop.pta || stop.wta;

const minutesAfter = (stop: Stop, rainhamMinutes: number) => {
  const clock = stopClock(stop);
  if (!clock) return null;
  let minutes = clockMinutes(clock);
  if (minutes + 12 * 60 < rainhamMinutes) minutes += 24 * 60;
  return minutes;
};

const readScheduleStops = (schedule: XmlNode): Stop[] => [
  ...asNodes(schedule.OR).concat(asNodes(schedule.OPOR)).flatMap((node) => optionalStop(node, 'origin')),
  ...asNodes(schedule.IP).concat(asNodes(schedule.OPIP)).flatMap((node) => optionalStop(node, 'call')),
  ...asNodes(schedule.PP).flatMap((node) => optionalStop(node, 'pass')),
  ...asNodes(schedule.DT).concat(asNodes(schedule.OPDT)).flatMap((node) => optionalStop(node, 'dest')),
];

const optionalStop = (node: XmlNode, kind: Stop['kind']) => {
  const stop = readTimingStop(node, kind);
  return stop ? [stop] : [];
};

const readTimingStop = (node: XmlNode, kind: Stop['kind']): Stop | null => {
  const tpl = attr(node, 'tpl');
  if (!tpl) return null;
  const pta = attr(node, 'pta');
  const ptd = attr(node, 'ptd');
  const wta = attr(node, 'wta');
  const wtd = attr(node, 'wtd');
  return {
    tpl,
    kind,
    pta,
    ptd,
    wta,
    wtd,
    passOnly: kind === 'pass' || Boolean(attr(node, 'wtp')) && !pta && !ptd && !wta && !wtd,
  };
};

const readForecastStop = (node: XmlNode): Stop | null => {
  const base = readTimingStop(node, 'call');
  if (!base) return null;
  const movement = asNode(node.dep) ?? asNode(node.arr) ?? asNode(node.pass);
  const scheduled = base.ptd || base.pta || base.wtd || base.wta;
  return {
    ...base,
    passOnly: base.passOnly || (Boolean(node.pass) && !node.dep && !node.arr),
    et: movement ? estimatedClock(scheduled, movement) : undefined,
    at: movement ? attr(movement, 'at') : undefined,
    clearActual: movement ? attr(movement, 'atRemoved') === 'true' : false,
    etUnknown: movement ? attr(movement, 'etUnknown') === 'true' || attr(movement, 'delayed') === 'true' : false,
    platform: textOf(node.plat),
    suppressed: node.suppr != null,
    cancelled: node.can != null,
  };
};

const mergeStop = (existing: Stop | undefined, next: Stop): Stop => {
  if (!existing) return next;
  return {
    ...existing,
    ...compact(next),
    kind: next.kind === 'call' ? existing.kind : next.kind,
    et: next.et ?? existing.et,
    at: next.clearActual ? undefined : next.at ?? existing.at,
    platform: next.platform ?? existing.platform,
    etUnknown: next.et ? false : next.etUnknown || existing.etUnknown,
    cancelled: next.cancelled || existing.cancelled,
    suppressed: next.suppressed || existing.suppressed,
  };
};

const estimatedClock = (scheduled: string | undefined, movement: XmlNode) => {
  const estimate = attr(movement, 'et');
  if (estimate) return estimate;
  const delay = attr(movement, 'etmin');
  if (!delay || !scheduled) return undefined;
  const minutes = clockMinutes(scheduled) + Number(delay);
  if (!Number.isFinite(minutes)) return undefined;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

const compact = (stop: Stop) => Object.fromEntries(Object.entries(stop).filter(([, value]) => value !== undefined)) as Stop;

const topicPath = (topic: string) => (topic.startsWith('/topic/') ? topic : `/topic/${topic}`);

const decodeBody = (body: Buffer) => {
  try {
    if (body.length >= 2 && body[0] === 0x1f && body[1] === 0x8b) return zlib.gunzipSync(body).toString('utf8');
  } catch {
    return body.toString('utf8');
  }
  return body.toString('utf8');
};

const asNode = (value: unknown): XmlNode | null => (value && typeof value === 'object' && !Array.isArray(value) ? value as XmlNode : null);

const asNodes = (value: unknown) => {
  if (Array.isArray(value)) return value.flatMap((item) => { const node = asNode(item); return node ? [node] : []; });
  const node = asNode(value);
  return node ? [node] : [];
};

const attr = (node: XmlNode, name: string) => {
  const value = node[name];
  return typeof value === 'string' && value ? value : undefined;
};

const textOf = (value: unknown) => {
  if (typeof value === 'string' && value) return value;
  const node = asNode(value);
  const text = node?.text;
  return typeof text === 'string' && text ? text : undefined;
};

const clockMinutes = (clock: string) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(clock);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
};

const displayTime = (clock: string) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(clock);
  if (!match) return clock;
  return `${String(Number(match[1]) % 24).padStart(2, '0')}:${match[2]}`;
};

const londonToUtc = (ssd: string, clock: string) => {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ssd);
  const time = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(clock);
  if (!date || !time) return null;
  const extraDays = Math.floor(Number(time[1]) / 24);
  const guess = Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3]) + extraDays, Number(time[1]) % 24, Number(time[2]), Number(time[3] ?? 0));
  const shown = londonParts(new Date(guess));
  const shownUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, shown.second);
  return guess - (shownUtc - guess);
};

const londonParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day'), hour: value('hour'), minute: value('minute'), second: value('second') };
};
