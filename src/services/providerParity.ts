import { RouteItinerary, CheckResultStatus } from '@/types';
import { DataSourceProvider } from './datasource';
import { normalizeAirlineCode, cleanFlightNumber } from '@/utils/airline';

export type ParityField =
  | 'carrier'
  | 'flightNumber'
  | 'price'
  | 'stops'
  | 'departureTime'
  | 'arrivalTime';

export interface ProviderParityInput {
  provider: DataSourceProvider;
  label: string;
  status: CheckResultStatus;
  price: number | null;
  itineraries: RouteItinerary[];
}

export interface NormalizedParityItinerary {
  provider: DataSourceProvider;
  carrier: string;
  airlineName?: string;
  flightNumber: string;
  price: number;
  stops: number;
  departureTime: string;
  arrivalTime: string;
  duration?: string;
}

export interface ParityComparisonRow {
  rowKey: string;
  displayLabel: string;
  byProvider: Partial<Record<DataSourceProvider, NormalizedParityItinerary>>;
  missingInProviders: DataSourceProvider[];
  mismatchedFields: ParityField[];
  isFullMatch: boolean;
}

export interface ProviderParityReport {
  parityStatus: 'consistent' | 'mismatch' | 'insufficient_data';
  comparedProviders: DataSourceProvider[];
  totalRows: number;
  matchedRowCount: number;
  mismatchedRowCount: number;
  statusMismatch: boolean;
  statusSummary: string;
  lowestPriceSpread: {
    minPrice: number | null;
    maxPrice: number | null;
    spread: number | null;
    differs: boolean;
  };
  itineraryCountDiffers: boolean;
  fieldMismatchCounts: Record<ParityField, number>;
  rows: ParityComparisonRow[];
}

function normalizeTimeForParity(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Normalize "YYYY-MM-DD HH:MM" or "YYYY-MM-DDTHH:MM(:SS)" to "YYYY-MM-DD HH:MM"
  const dateTimeMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{1,2}):(\d{2})/);
  if (dateTimeMatch) {
    const [, datePart, hourRaw, minPart] = dateTimeMatch;
    return `${datePart} ${hourRaw.padStart(2, '0')}:${minPart}`;
  }

  // Normalize standalone "H:MM" or "HH:MM" to "HH:MM"
  const timeOnlyMatch = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (timeOnlyMatch) {
    const [, hourRaw, minPart] = timeOnlyMatch;
    return `${hourRaw.padStart(2, '0')}:${minPart}`;
  }

  return trimmed;
}

function normalizeItinerary(
  provider: DataSourceProvider,
  it: RouteItinerary
): NormalizedParityItinerary {
  const rawCarrier = (it.airline || '').trim();
  const normalizedCode = normalizeAirlineCode(rawCarrier, it.flightNumber);
  const carrier =
    normalizedCode && normalizedCode !== 'UN'
      ? normalizedCode
      : rawCarrier.toUpperCase() || 'UN';

  const cleanedNum = cleanFlightNumber(it.flightNumber || '', carrier);
  const flightNumber = cleanedNum || (it.flightNumber || '').trim().toUpperCase();
  const stops =
    typeof it.stops === 'number'
      ? it.stops
      : it.isNonstop
      ? 0
      : 0;

  return {
    provider,
    carrier,
    airlineName: it.airlineName,
    flightNumber,
    price: Number(it.price),
    stops,
    departureTime: normalizeTimeForParity(it.departureTime),
    arrivalTime: normalizeTimeForParity(it.arrivalTime),
    duration: it.duration,
  };
}

function buildMatchKeys(item: NormalizedParityItinerary): string[] {
  const keys: string[] = [];

  if (item.carrier !== 'UN' && item.flightNumber) {
    keys.push(`cf:${item.carrier}#${item.flightNumber}`);
  }

  if (item.departureTime && item.arrivalTime) {
    keys.push(`sched:${item.departureTime}|${item.arrivalTime}|${item.stops}`);
  }

  if (item.carrier !== 'UN' && item.departureTime) {
    keys.push(`cd:${item.carrier}|${item.departureTime}`);
  }

  if (keys.length === 0) {
    keys.push(
      `fallback:${item.carrier}|${item.flightNumber}|${item.departureTime}|${item.arrivalTime}|${item.stops}|${item.price}`
    );
  }

  return keys;
}

function hasDistinctNonEmptyValues(values: string[]): boolean {
  const nonEmpty = values.filter((v) => v !== '');
  if (nonEmpty.length <= 1) return false;
  return new Set(nonEmpty).size > 1;
}

export function evaluateProviderParity(
  providerInputs: ProviderParityInput[]
): ProviderParityReport {
  const fieldMismatchCounts: Record<ParityField, number> = {
    carrier: 0,
    flightNumber: 0,
    price: 0,
    stops: 0,
    departureTime: 0,
    arrivalTime: 0,
  };

  const succeeding = providerInputs.filter(
    (p) => p.status === 'Success' && p.itineraries.length > 0
  );
  const soldOut = providerInputs.filter((p) => p.status === 'SoldOut');
  const errored = providerInputs.filter(
    (p) => p.status === 'Error' || p.status === 'RateLimited' || p.status === 'Paused'
  );

  const statusMismatch = succeeding.length > 0 && soldOut.length > 0;

  const statusParts: string[] = [];
  if (succeeding.length > 0) {
    statusParts.push(`${succeeding.length} returned flights`);
  }
  if (soldOut.length > 0) {
    statusParts.push(`${soldOut.length} reported 0 flights`);
  }
  if (errored.length > 0) {
    statusParts.push(`${errored.length} failed/unavailable`);
  }
  const statusSummary = statusParts.join(' • ') || 'No providers executed';

  const lowestPrices = succeeding
    .map((p) => p.price)
    .filter((price): price is number => typeof price === 'number' && price > 0);

  const minPrice = lowestPrices.length > 0 ? Math.min(...lowestPrices) : null;
  const maxPrice = lowestPrices.length > 0 ? Math.max(...lowestPrices) : null;
  const spread =
    minPrice !== null && maxPrice !== null ? Number((maxPrice - minPrice).toFixed(2)) : null;
  const lowestPriceDiffers = spread !== null && spread > 0.009;

  const counts = succeeding.map((p) => p.itineraries.length);
  const itineraryCountDiffers = counts.length > 1 && new Set(counts).size > 1;

  if (succeeding.length < 2) {
    return {
      parityStatus: statusMismatch ? 'mismatch' : 'insufficient_data',
      comparedProviders: succeeding.map((p) => p.provider),
      totalRows: 0,
      matchedRowCount: 0,
      mismatchedRowCount: 0,
      statusMismatch,
      statusSummary,
      lowestPriceSpread: {
        minPrice,
        maxPrice,
        spread,
        differs: lowestPriceDiffers,
      },
      itineraryCountDiffers,
      fieldMismatchCounts,
      rows: [],
    };
  }

  interface MutableBucket {
    id: string;
    keys: Set<string>;
    byProvider: Partial<Record<DataSourceProvider, NormalizedParityItinerary>>;
    firstSeen: NormalizedParityItinerary;
  }

  const buckets: MutableBucket[] = [];
  const keyToBucket = new Map<string, MutableBucket>();

  for (const provInput of succeeding) {
    const normalizedList = provInput.itineraries.map((it) =>
      normalizeItinerary(provInput.provider, it)
    );

    for (const item of normalizedList) {
      const candidateKeys = buildMatchKeys(item);
      let matchedBucket: MutableBucket | undefined;

      for (const k of candidateKeys) {
        const existing = keyToBucket.get(k);
        if (existing && !existing.byProvider[provInput.provider]) {
          matchedBucket = existing;
          break;
        }
      }

      if (!matchedBucket) {
        matchedBucket = {
          id: candidateKeys[0],
          keys: new Set<string>(candidateKeys),
          byProvider: {},
          firstSeen: item,
        };
        buckets.push(matchedBucket);
      } else {
        candidateKeys.forEach((k) => matchedBucket!.keys.add(k));
      }

      matchedBucket.byProvider[provInput.provider] = item;
      for (const k of candidateKeys) {
        if (!keyToBucket.has(k)) {
          keyToBucket.set(k, matchedBucket);
        }
      }
    }
  }

  const comparedProviders = succeeding.map((p) => p.provider);

  const rows: ParityComparisonRow[] = buckets.map((bucket, idx) => {
    const entries = Object.values(bucket.byProvider).filter(
      (v): v is NormalizedParityItinerary => Boolean(v)
    );
    const missingInProviders = comparedProviders.filter((p) => !bucket.byProvider[p]);
    const mismatchedFields: ParityField[] = [];

    if (entries.length >= 2) {
      if (hasDistinctNonEmptyValues(entries.map((e) => e.carrier))) {
        mismatchedFields.push('carrier');
        fieldMismatchCounts.carrier += 1;
      }

      if (hasDistinctNonEmptyValues(entries.map((e) => e.flightNumber))) {
        mismatchedFields.push('flightNumber');
        fieldMismatchCounts.flightNumber += 1;
      }

      const distinctPrices = new Set(entries.map((e) => Number(e.price.toFixed(2))));
      if (distinctPrices.size > 1) {
        mismatchedFields.push('price');
        fieldMismatchCounts.price += 1;
      }

      const distinctStops = new Set(entries.map((e) => e.stops));
      if (distinctStops.size > 1) {
        mismatchedFields.push('stops');
        fieldMismatchCounts.stops += 1;
      }

      if (hasDistinctNonEmptyValues(entries.map((e) => e.departureTime))) {
        mismatchedFields.push('departureTime');
        fieldMismatchCounts.departureTime += 1;
      }

      if (hasDistinctNonEmptyValues(entries.map((e) => e.arrivalTime))) {
        mismatchedFields.push('arrivalTime');
        fieldMismatchCounts.arrivalTime += 1;
      }
    }

    const rep = bucket.firstSeen;
    const carrierPart = rep.carrier !== 'UN' ? rep.carrier : 'Flight';
    const numPart = rep.flightNumber ? ` ${rep.flightNumber}` : '';
    const timePart = rep.departureTime ? ` (${rep.departureTime})` : '';
    const displayLabel = `${carrierPart}${numPart}${timePart}`.trim();

    return {
      rowKey: `${bucket.id}-${idx}`,
      displayLabel,
      byProvider: bucket.byProvider,
      missingInProviders,
      mismatchedFields,
      isFullMatch: mismatchedFields.length === 0 && missingInProviders.length === 0,
    };
  });

  const getMinRowPrice = (row: ParityComparisonRow): number => {
    const prices = Object.values(row.byProvider)
      .filter((v): v is NormalizedParityItinerary => Boolean(v))
      .map((v) => v.price);
    return prices.length > 0 ? Math.min(...prices) : Number.MAX_SAFE_INTEGER;
  };

  rows.sort((a, b) => {
    if (a.mismatchedFields.length !== b.mismatchedFields.length) {
      return b.mismatchedFields.length - a.mismatchedFields.length;
    }
    return getMinRowPrice(a) - getMinRowPrice(b);
  });

  const mismatchedRowCount = rows.filter((r) => r.mismatchedFields.length > 0).length;
  const matchedRowCount = rows.filter((r) => r.isFullMatch).length;

  const hasAnyMismatch =
    statusMismatch ||
    mismatchedRowCount > 0 ||
    lowestPriceDiffers ||
    itineraryCountDiffers ||
    rows.some((r) => r.missingInProviders.length > 0);

  return {
    parityStatus: hasAnyMismatch ? 'mismatch' : 'consistent',
    comparedProviders,
    totalRows: rows.length,
    matchedRowCount,
    mismatchedRowCount,
    statusMismatch,
    statusSummary,
    lowestPriceSpread: {
      minPrice,
      maxPrice,
      spread,
      differs: lowestPriceDiffers,
    },
    itineraryCountDiffers,
    fieldMismatchCounts,
    rows,
  };
}