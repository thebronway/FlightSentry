import { RouteItinerary } from '@/types';
import { selectDiverseItineraries } from './carrierDiversity';
import { isNonstopItinerary, isConnectingItinerary } from './stopFilter';

export function ensureStopCategoryRepresentation(
  itineraries: RouteItinerary[],
  maxLimit: number = 12,
  diversityEnabled: boolean = true
): RouteItinerary[] {
  if (!itineraries || itineraries.length === 0) return [];
  const limit = Math.max(1, maxLimit);

  const getKey = (it: RouteItinerary) =>
    `${(it.airline || '').toUpperCase()}|${it.flightNumber || ''}|${it.departureTime || ''}|${it.price}`;

  const seen = new Set<string>();
  const uniqueSorted: RouteItinerary[] = [];
  for (const it of itineraries) {
    if (typeof it.price !== 'number' || it.price <= 0) continue;
    const key = getKey(it);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSorted.push(it);
    }
  }
  uniqueSorted.sort((a, b) => a.price - b.price);

  const baseSelected = selectDiverseItineraries(uniqueSorted, limit, diversityEnabled);
  if (uniqueSorted.length <= limit || limit < 2) {
    return baseSelected;
  }

  const nonstopPool = uniqueSorted.filter(isNonstopItinerary);
  const connectingPool = uniqueSorted.filter(isConnectingItinerary);
  if (nonstopPool.length === 0 || connectingPool.length === 0) {
    return baseSelected;
  }

  const selected = [...baseSelected];
  const hasNonstop = selected.some(isNonstopItinerary);
  const hasConnecting = selected.some(isConnectingItinerary);

  if (!hasNonstop) {
    selected.sort((a, b) => a.price - b.price);
    selected[selected.length - 1] = nonstopPool[0];
  } else if (!hasConnecting) {
    selected.sort((a, b) => a.price - b.price);
    selected[selected.length - 1] = connectingPool[0];
  }

  return selected.sort((a, b) => a.price - b.price);
}