import { PriceHistory, RouteItinerary } from '@/types';
import { CarrierMatrixRow } from './types';
import { parseHistoryItineraries } from './itineraryParser';
import { getAirlineColor, getAirlineName, cleanDisplayTime } from '@/utils/airline';

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