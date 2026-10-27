import { PriceHistory, RouteItinerary } from '../types';
import { getAirlineColor, getAirlineName, cleanDisplayTime } from './airline';

export interface CarrierMatrixRow {
  airline: string;
  airlineName: string;
  color: string;
  bestFlightDetail: string; // e.g. "B6 523 · Nonstop · 8:30 AM"
  currentLowestPrice: number;
  allTimeLow: number;
  allTimeHigh: number;
  priceDelta: number; // Current price minus previous check price for this carrier
  deltaStatus: 'dropped' | 'risen' | 'steady';
  isRouteFloor: boolean;
}

export interface RouteCorridorMetrics {
  currentFloor: number;
  allTimeLow: number;
  allTimeHigh: number;
  spreadPercent: number; // 0% (at low) to 100% (at high)
  totalChecks: number;
  hasSpread: boolean;
}

export function parseHistoryItineraries(historyItem: PriceHistory): RouteItinerary[] {
  if (!historyItem.metadata) return [];
  try {
    const parsed = JSON.parse(historyItem.metadata);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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

export function computeCarrierMatrix(history: PriceHistory[]): CarrierMatrixRow[] {
  // Sort chronologically (oldest to newest)
  const sorted = [...history]
    .filter(h => typeof h.price === 'number' && h.price > 0 && h.status === 'Success')
    .sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime());

  if (sorted.length === 0) return [];

  // Track each carrier across checks
  interface CarrierCheckRecord {
    price: number;
    flightNumber?: string;
    departureTime?: string;
    isNonstop?: boolean;
    stops?: number;
  }

  const carrierHistories: Record<string, CarrierCheckRecord[]> = {};

  sorted.forEach(h => {
    const itineraries = parseHistoryItineraries(h);

    if (itineraries.length > 0) {
      // Find each carrier's best fare in this specific check
      const checkCarrierBest: Record<string, RouteItinerary> = {};
      itineraries.forEach(it => {
        const code = (it.airline || '').toUpperCase();
        if (!code || typeof it.price !== 'number' || it.price <= 0) return;
        if (!checkCarrierBest[code] || it.price < checkCarrierBest[code].price) {
          checkCarrierBest[code] = it;
        }
      });

      Object.entries(checkCarrierBest).forEach(([code, bestIt]) => {
        if (!carrierHistories[code]) carrierHistories[code] = [];
        carrierHistories[code].push({
          price: bestIt.price,
          flightNumber: bestIt.flightNumber,
          departureTime: bestIt.departureTime,
          isNonstop: bestIt.isNonstop,
          stops: bestIt.stops,
        });
      });
    } else if (h.airline) {
      const code = h.airline.toUpperCase();
      if (!carrierHistories[code]) carrierHistories[code] = [];
      carrierHistories[code].push({
        price: h.price,
        flightNumber: h.flightNumber || undefined,
      });
    }
  });

  const carriers = Object.keys(carrierHistories);
  if (carriers.length === 0) return [];

  // Find the absolute lowest current price across any active carrier
  const currentPrices = carriers.map(code => {
    const records = carrierHistories[code];
    return records[records.length - 1].price;
  });
  const minCurrentPrice = Math.min(...currentPrices);

  const rows: CarrierMatrixRow[] = carriers.map(code => {
    const records = carrierHistories[code];
    const latest = records[records.length - 1];
    const previous = records.length > 1 ? records[records.length - 2] : null;

    const allPrices = records.map(r => r.price);
    const allTimeLow = Math.min(...allPrices);
    const allTimeHigh = Math.max(...allPrices);

    const priceDelta = previous ? latest.price - previous.price : 0;
    const deltaStatus: 'dropped' | 'risen' | 'steady' =
      priceDelta < 0 ? 'dropped' : priceDelta > 0 ? 'risen' : 'steady';

    // Construct descriptive best flight string: e.g. "B6 523 · Nonstop · 8:30 AM"
    const detailParts: string[] = [];
    if (latest.flightNumber) {
      detailParts.push(`${code} ${latest.flightNumber}`);
    } else {
      detailParts.push(code);
    }

    if (latest.isNonstop !== undefined) {
      detailParts.push(latest.isNonstop ? 'Nonstop' : `${latest.stops || 1} Stop${(latest.stops || 1) > 1 ? 's' : ''}`);
    }

    const formattedTime = cleanDisplayTime(latest.departureTime);
    if (formattedTime) {
      detailParts.push(formattedTime);
    }

    return {
      airline: code,
      airlineName: getAirlineName(code),
      color: getAirlineColor(code),
      bestFlightDetail: detailParts.join(' · '),
      currentLowestPrice: latest.price,
      allTimeLow,
      allTimeHigh,
      priceDelta,
      deltaStatus,
      isRouteFloor: latest.price === minCurrentPrice,
    };
  });

  // Sort rows: route floor winner first, then by current lowest price
  return rows.sort((a, b) => {
    if (a.isRouteFloor && !b.isRouteFloor) return -1;
    if (!a.isRouteFloor && b.isRouteFloor) return 1;
    return a.currentLowestPrice - b.currentLowestPrice;
  });
}