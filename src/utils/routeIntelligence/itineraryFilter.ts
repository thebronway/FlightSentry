import { RouteItinerary } from '@/types';
import { expandAlliancesToAirlines } from '../airlineThemes';

export interface SearchPreferenceOptions {
  earliestDeparture?: string | null;
  latestDeparture?: string | null;
  noRedeye?: number | boolean | null;
  maxStops?: number | null;
  maxLayoverMinutes?: number | null;
  excludedConnectingAirports?: string | null;
  maxTotalDurationMinutes?: number | null;
  includedAlliances?: string | null;
  excludedAlliances?: string | null;
}

export function parseDurationMinutes(durationStr?: string | null): number | null {
  if (!durationStr) return null;
  const str = String(durationStr).trim().toLowerCase();
  if (!str) return null;

  const hMatch = str.match(/(\d+)\s*h/);
  const mMatch = str.match(/(\d+)\s*m/);

  let total = 0;
  let found = false;
  if (hMatch) {
    total += parseInt(hMatch[1], 10) * 60;
    found = true;
  }
  if (mMatch) {
    total += parseInt(mMatch[1], 10);
    found = true;
  }

  if (found) return total;
  const num = parseInt(str, 10);
  return !isNaN(num) && num > 0 ? num : null;
}

export function parseTimeMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const str = String(timeStr).trim();
  if (!str || str.includes('undefined')) return null;

  const timePart = str.includes(' ')
    ? str.split(' ')[1]
    : str.includes('T')
    ? str.split('T')[1]
    : str;

  const match = timePart.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;

  return hours * 60 + minutes;
}

export function isRedeyeFlight(
  departureTime?: string | null,
  arrivalTime?: string | null
): boolean {
  const depMins = parseTimeMinutes(departureTime);
  const arrMins = parseTimeMinutes(arrivalTime);

  if (depMins === null) return false;

  // Departs overnight between 21:00 (9:00 PM) and 05:00 (5:00 AM)
  if (depMins >= 21 * 60 || depMins < 5 * 60) {
    return true;
  }

  // Departs late evening (>= 20:00) and arrives early morning next day (arrival clock time < departure clock time)
  if (depMins >= 20 * 60 && arrMins !== null && arrMins < depMins) {
    return true;
  }

  return false;
}

export function filterItinerariesBySearchPreferences(
  itineraries: RouteItinerary[],
  preferences: SearchPreferenceOptions
): RouteItinerary[] {
  const {
    earliestDeparture,
    latestDeparture,
    noRedeye,
    maxStops,
    maxLayoverMinutes,
    excludedConnectingAirports,
    maxTotalDurationMinutes,
    includedAlliances,
    excludedAlliances,
  } = preferences;

  const earliestMins = earliestDeparture ? parseTimeMinutes(earliestDeparture) : null;
  const latestMins = latestDeparture ? parseTimeMinutes(latestDeparture) : null;
  const shouldFilterRedeye = noRedeye === 1 || noRedeye === true;
  const hasStopsFilter = maxStops !== undefined && maxStops !== null;
  const hasLayoverFilter = maxLayoverMinutes !== undefined && maxLayoverMinutes !== null && maxLayoverMinutes > 0;
  const hasDurationFilter = maxTotalDurationMinutes !== undefined && maxTotalDurationMinutes !== null && maxTotalDurationMinutes > 0;

  const excludedConns = excludedConnectingAirports
    ? excludedConnectingAirports.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    : [];

  const includedAllianceAirlines = includedAlliances ? expandAlliancesToAirlines(includedAlliances) : [];
  const excludedAllianceAirlines = excludedAlliances ? expandAlliancesToAirlines(excludedAlliances) : [];

  if (
    earliestMins === null &&
    latestMins === null &&
    !shouldFilterRedeye &&
    !hasStopsFilter &&
    !hasLayoverFilter &&
    !hasDurationFilter &&
    excludedConns.length === 0 &&
    includedAllianceAirlines.length === 0 &&
    excludedAllianceAirlines.length === 0
  ) {
    return itineraries;
  }

  return itineraries.filter(it => {
    // 1. Max stops filter
    if (hasStopsFilter) {
      const stops = it.stops !== undefined ? it.stops : (it.isNonstop ? 0 : 0);
      if (stops > (maxStops as number)) {
        return false;
      }
    }

    // 2. Excluded connecting airports
    if (excludedConns.length > 0 && it.layoverAirports && it.layoverAirports.length > 0) {
      if (it.layoverAirports.some(code => excludedConns.includes(code.toUpperCase()))) {
        return false;
      }
    }

    // 3. Max layover duration filter
    if (hasLayoverFilter && it.maxLayoverMinutes !== undefined && it.maxLayoverMinutes !== null) {
      if (it.maxLayoverMinutes > (maxLayoverMinutes as number)) {
        return false;
      }
    }

    // 4. Max total trip duration filter
    if (hasDurationFilter) {
      const durationMins = it.durationMinutes !== undefined && it.durationMinutes !== null
        ? it.durationMinutes
        : parseDurationMinutes(it.duration);
      if (durationMins !== null && durationMins > (maxTotalDurationMinutes as number)) {
        return false;
      }
    }

    // 5. Alliance inclusions & exclusions
    if (includedAllianceAirlines.length > 0) {
      if (!includedAllianceAirlines.includes(it.airline.toUpperCase())) {
        return false;
      }
    }
    if (excludedAllianceAirlines.length > 0) {
      if (excludedAllianceAirlines.includes(it.airline.toUpperCase())) {
        return false;
      }
    }

    // 6. Departure time window and redeye checks
    const depMins = parseTimeMinutes(it.departureTime);

    // If departure time is absent from raw itinerary, keep it to prevent accidental false exclusions
    if (depMins === null) {
      return true;
    }

    if (earliestMins !== null && depMins < earliestMins) {
      return false;
    }

    if (latestMins !== null && depMins > latestMins) {
      return false;
    }

    if (shouldFilterRedeye && isRedeyeFlight(it.departureTime, it.arrivalTime)) {
      return false;
    }

    return true;
  });
}