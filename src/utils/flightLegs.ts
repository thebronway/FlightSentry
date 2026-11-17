import { Flight, TrackedFlightLeg } from '@/types';
import { cleanFlightNumber, isValidAirlineCode, normalizeAirlineCode } from './airline';

export function normalizeSingleTrackedLeg(raw: Partial<TrackedFlightLeg>): TrackedFlightLeg | null {
  const rawAirline = (raw.airline || '').trim().toUpperCase();
  const normalizedCarrier = isValidAirlineCode(rawAirline)
    ? rawAirline
    : normalizeAirlineCode(rawAirline, raw.flightNumber);
  const flightNumber = cleanFlightNumber(raw.flightNumber || '', normalizedCarrier);
  const origin = (raw.origin || '').trim().toUpperCase();
  const destination = (raw.destination || '').trim().toUpperCase();

  if (
    !isValidAirlineCode(normalizedCarrier) ||
    !flightNumber ||
    !/^[A-Z]{3}$/.test(origin) ||
    !/^[A-Z]{3}$/.test(destination) ||
    origin === destination
  ) {
    return null;
  }

  const rawBooking = (raw.bookingAirline || '').trim().toUpperCase();
  const bookingAirline = rawBooking && isValidAirlineCode(rawBooking) ? rawBooking : null;

  return {
    airline: normalizedCarrier,
    bookingAirline,
    flightNumber,
    origin,
    destination,
  };
}

export function parseFlightLegs(
  rawLegs?: string | TrackedFlightLeg[] | null
): TrackedFlightLeg[] {
  if (!rawLegs) return [];
  let parsed: unknown = rawLegs;
  if (typeof rawLegs === 'string') {
    const trimmed = rawLegs.trim();
    if (!trimmed) return [];
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed) || parsed.length < 2) {
    return [];
  }

  const legs: TrackedFlightLeg[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') return [];
    const normalized = normalizeSingleTrackedLeg(item as Partial<TrackedFlightLeg>);
    if (!normalized) return [];
    legs.push(normalized);
  }

  for (let i = 0; i < legs.length - 1; i++) {
    if (legs[i].destination !== legs[i + 1].origin) {
      return [];
    }
  }

  return legs.length >= 2 ? legs : [];
}

export function serializeFlightLegs(
  rawLegs?: string | TrackedFlightLeg[] | null
): string | null {
  const legs = parseFlightLegs(rawLegs);
  return legs.length >= 2 ? JSON.stringify(legs) : null;
}

export function getLayoverAirports(legs: TrackedFlightLeg[]): string[] {
  if (legs.length < 2) return [];
  return legs.slice(0, -1).map((leg) => leg.destination);
}

export function getLegUniqueCarriers(legs: TrackedFlightLeg[]): string[] {
  const unique: string[] = [];
  for (const leg of legs) {
    if (leg.airline && !unique.includes(leg.airline)) {
      unique.push(leg.airline);
    }
  }
  return unique;
}

export function getEffectiveFlightLegs(
  flight: Pick<Flight, 'origin' | 'destination' | 'airline' | 'bookingAirline' | 'flightNumber' | 'legs'>
): TrackedFlightLeg[] {
  const multi = parseFlightLegs(flight.legs);
  if (multi.length >= 2) return multi;

  if (flight.origin && flight.destination && flight.airline && flight.flightNumber) {
    const single = normalizeSingleTrackedLeg({
      airline: flight.airline,
      bookingAirline: flight.bookingAirline ?? null,
      flightNumber: flight.flightNumber,
      origin: flight.origin,
      destination: flight.destination,
    });
    return single ? [single] : [];
  }

  return [];
}

export function matchesTrackedFlightLegs(
  itinerarySegments: Array<{
    airline: string;
    flightNumber: string;
    origin?: string;
    destination?: string;
  }>,
  trackedLegs: TrackedFlightLeg[]
): boolean {
  if (trackedLegs.length < 2 || itinerarySegments.length !== trackedLegs.length) {
    return false;
  }

  for (let i = 0; i < trackedLegs.length; i++) {
    const expected = trackedLegs[i];
    const actual = itinerarySegments[i];

    const actualCode = normalizeAirlineCode(actual.airline || '', actual.flightNumber);
    const actualNum = cleanFlightNumber(actual.flightNumber || '', actualCode);
    const expectedNum = cleanFlightNumber(expected.flightNumber, expected.airline);

    if (actualCode !== expected.airline || actualNum !== expectedNum) {
      return false;
    }

    const actualOrig = (actual.origin || '').trim().toUpperCase();
    const actualDest = (actual.destination || '').trim().toUpperCase();
    if (actualOrig.length === 3 && actualOrig !== expected.origin) {
      return false;
    }
    if (actualDest.length === 3 && actualDest !== expected.destination) {
      return false;
    }
  }

  return true;
}