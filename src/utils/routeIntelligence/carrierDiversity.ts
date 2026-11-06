import { RouteItinerary } from '@/types';

/**
 * Selects up to `maxLimit` itineraries applying the carrier diversity algorithm.
 *
 * Behavior:
 * 1. Deduplicates candidate itineraries by (airline, flightNumber, departureTime, price).
 * 2. If diversityEnabled:
 *    - Groups valid candidate itineraries by operating carrier code (e.g. DL, AA, UA, WN).
 *    - Guarantees at least 1 lowest fare from every operating airline on the route.
 *    - Allocates remaining capacity slots up to `maxLimit` to the next absolute cheapest flights across all carriers.
 * 3. If diversityEnabled is false:
 *    - Sorts all itineraries strictly by price ascending and takes the top `maxLimit`.
 * 4. The resulting list is sorted by price ascending so index 0 is always the route floor fare.
 */
export function selectDiverseItineraries(
  itineraries: RouteItinerary[],
  maxLimit: number = 12,
  diversityEnabled: boolean = true
): RouteItinerary[] {
  if (!itineraries || itineraries.length === 0) return [];
  const limit = Math.max(1, maxLimit);

  // 1. Deduplicate identical flights
  const seen = new Set<string>();
  const uniqueItineraries: RouteItinerary[] = [];

  for (const it of itineraries) {
    if (typeof it.price !== 'number' || it.price <= 0) continue;
    const key = `${(it.airline || '').toUpperCase()}|${it.flightNumber || ''}|${it.departureTime || ''}|${it.price}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueItineraries.push(it);
    }
  }

  if (uniqueItineraries.length <= limit) {
    return uniqueItineraries.sort((a, b) => a.price - b.price);
  }

  if (!diversityEnabled) {
    return uniqueItineraries
      .sort((a, b) => a.price - b.price)
      .slice(0, limit);
  }

  // 2. Carrier Diversity Selection
  const byCarrier: Record<string, RouteItinerary[]> = {};
  for (const it of uniqueItineraries) {
    const code = (it.airline || 'UNKNOWN').toUpperCase();
    if (!byCarrier[code]) byCarrier[code] = [];
    byCarrier[code].push(it);
  }

  // Sort each carrier's flights by price ascending (index 0 is their lowest fare)
  Object.values(byCarrier).forEach(list => list.sort((a, b) => a.price - b.price));

  const selected: RouteItinerary[] = [];
  const selectedKeys = new Set<string>();

  const getItineraryKey = (it: RouteItinerary) =>
    `${(it.airline || '').toUpperCase()}|${it.flightNumber || ''}|${it.departureTime || ''}|${it.price}`;

  // Step A: Guarantee at least 1 lowest fare from every operating airline
  // Sort carriers by their lowest fare so cheaper airlines take initial slots if carrier count exceeds limit
  const carrierCheapest = Object.entries(byCarrier)
    .map(([carrier, list]) => ({ carrier, cheapest: list[0] }))
    .sort((a, b) => a.cheapest.price - b.cheapest.price);

  for (const item of carrierCheapest) {
    if (selected.length >= limit) break;
    selected.push(item.cheapest);
    selectedKeys.add(getItineraryKey(item.cheapest));
  }

  // Step B: Allocate remaining slots to the next absolute cheapest flights across all carriers
  if (selected.length < limit) {
    const remainingCandidates = uniqueItineraries
      .filter(it => !selectedKeys.has(getItineraryKey(it)))
      .sort((a, b) => a.price - b.price);

    for (const it of remainingCandidates) {
      if (selected.length >= limit) break;
      selected.push(it);
      selectedKeys.add(getItineraryKey(it));
    }
  }

  // Final sort by price ascending
  return selected.sort((a, b) => a.price - b.price);
}