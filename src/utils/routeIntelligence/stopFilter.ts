import { PriceHistory, RouteItinerary } from '@/types';
import { parseHistoryItineraries } from './itineraryParser';

export type StopViewMode = 'nonstop-only' | 'all-stops';

export function isNonstopItinerary(it: RouteItinerary): boolean {
  if (typeof it.stops === 'number') return it.stops === 0;
  return it.isNonstop !== false;
}

export function isConnectingItinerary(it: RouteItinerary): boolean {
  return !isNonstopItinerary(it);
}

export function filterItinerariesByStopView(
  itineraries: RouteItinerary[],
  viewMode: StopViewMode
): RouteItinerary[] {
  if (viewMode === 'nonstop-only') {
    return itineraries.filter(isNonstopItinerary);
  }
  return itineraries;
}

export function filterHistoryForStopView(
  history: PriceHistory[],
  viewMode: StopViewMode,
  flightMaxStops?: number | null
): PriceHistory[] {
  const result: PriceHistory[] = [];

  for (const record of history) {
    if (record.status !== 'Success') {
      result.push(record);
      continue;
    }

    const itineraries = parseHistoryItineraries(record);
    if (itineraries.length === 0) {
      if (viewMode === 'nonstop-only' && flightMaxStops !== 0) {
        continue;
      }
      result.push(record);
      continue;
    }

    const matching = filterItinerariesByStopView(itineraries, viewMode).filter(
      it => typeof it.price === 'number' && it.price > 0
    );
    if (matching.length === 0) {
      continue;
    }

    const sortedMatching = [...matching].sort((a, b) => a.price - b.price);
    const cheapest = sortedMatching[0];

    result.push({
      ...record,
      price: cheapest.price,
      airline: cheapest.airline || record.airline,
      flightNumber: cheapest.flightNumber || record.flightNumber,
      metadata: JSON.stringify(sortedMatching),
    });
  }

  return result;
}