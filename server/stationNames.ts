import names from './stationNames.json';

const stationNames = names as Record<string, string>;

export const stationName = (tiploc: string | null | undefined) => (tiploc ? stationNames[tiploc] ?? null : null);
