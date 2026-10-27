import { PriceHistory } from '@/types';
import { RouteCorridorMetrics } from './types';
import { parseHistoryItineraries } from './itineraryParser';

export function computeRouteCorridor(
  history: PriceHistory[],
  currentPrice: number
): RouteCorridorMetrics {
  const allRecordedPrices: number[] = [];

  if (typeof currentPrice === 'number' && currentPrice > 0) {
    allRecordedPrices.push(currentPrice);
  }

  history.forEach(h => {
    if (h.status === 'Success' && typeof h.price === 'number' && h.price > 0) {
      allRecordedPrices.push(h.price);
    }
    // Also inspect parsed competitor fares from the check metadata
    const itineraries = parseHistoryItineraries(h);
    itineraries.forEach(it => {
      if (typeof it.price === 'number' && it.price > 0) {
        allRecordedPrices.push(it.price);
      }
    });
  });

  if (allRecordedPrices.length === 0) {
    return {
      currentFloor: currentPrice,
      allTimeLow: currentPrice,
      allTimeHigh: currentPrice,
      spreadPercent: 50,
      totalChecks: history.length,
      hasSpread: false,
    };
  }

  const allTimeLow = Math.min(...allRecordedPrices);
  const allTimeHigh = Math.max(...allRecordedPrices);
  const currentFloor = currentPrice > 0 ? currentPrice : allTimeLow;
  const range = allTimeHigh - allTimeLow;
  const spreadPercent = range > 0
    ? Math.min(100, Math.max(0, Math.round(((currentFloor - allTimeLow) / range) * 100)))
    : 50;

  return {
    currentFloor,
    allTimeLow,
    allTimeHigh,
    spreadPercent,
    totalChecks: history.length,
    hasSpread: range > 0,
  };
}