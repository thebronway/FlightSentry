import { RouteItinerary } from '@/types';

export interface SearchPreferenceOptions {
  earliestDeparture?: string | null;
  latestDeparture?: string | null;
  noRedeye?: number | boolean | null;
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
  const { earliestDeparture, latestDeparture, noRedeye } = preferences;

  const earliestMins = earliestDeparture ? parseTimeMinutes(earliestDeparture) : null;
  const latestMins = latestDeparture ? parseTimeMinutes(latestDeparture) : null;
  const shouldFilterRedeye = noRedeye === 1 || noRedeye === true;

  if (earliestMins === null && latestMins === null && !shouldFilterRedeye) {
    return itineraries;
  }

  return itineraries.filter(it => {
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