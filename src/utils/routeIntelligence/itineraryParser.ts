import { PriceHistory, RouteItinerary } from '@/types';

export function parseHistoryItineraries(historyItem: PriceHistory): RouteItinerary[] {
  if (!historyItem.metadata) return [];
  try {
    const parsed = JSON.parse(historyItem.metadata);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}