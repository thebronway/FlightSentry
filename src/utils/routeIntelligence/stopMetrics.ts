import { Flight, PriceHistory } from '@/types';
import { parseHistoryItineraries } from './itineraryParser';
import { isNonstopItinerary, isConnectingItinerary } from './stopFilter';

export interface StopPriceBreakdown {
  nonstop: number | null;
  withStops: number | null;
  overall: number | null;
}

export interface StopComparisonMetrics {
  current: StopPriceBreakdown;
  baseline: StopPriceBreakdown;
  allTimeLow: StopPriceBreakdown;
  allTimeHigh: StopPriceBreakdown;
  hasNonstopData: boolean;
  hasWithStopsData: boolean;
}

export function computeCheckStopPrices(
  record: PriceHistory,
  flightMaxStops?: number | null
): StopPriceBreakdown {
  const itineraries = parseHistoryItineraries(record).filter(
    it => typeof it.price === 'number' && it.price > 0
  );

  if (itineraries.length > 0) {
    const nonstopPrices = itineraries.filter(isNonstopItinerary).map(it => it.price);
    const connectingPrices = itineraries.filter(isConnectingItinerary).map(it => it.price);
    const allPrices = itineraries.map(it => it.price);

    return {
      nonstop: nonstopPrices.length > 0 ? Math.min(...nonstopPrices) : null,
      withStops: connectingPrices.length > 0 ? Math.min(...connectingPrices) : null,
      overall: allPrices.length > 0 ? Math.min(...allPrices) : null,
    };
  }

  const fallbackPrice = typeof record.price === 'number' && record.price > 0 ? record.price : null;
  if (flightMaxStops === 0) {
    return { nonstop: fallbackPrice, withStops: null, overall: fallbackPrice };
  }
  return { nonstop: null, withStops: null, overall: fallbackPrice };
}

export function computeStopComparisonMetrics(
  history: PriceHistory[],
  flight: Pick<Flight, 'currentPrice' | 'baselinePrice' | 'purchasePrice' | 'maxStops'>
): StopComparisonMetrics {
  const isNonstopFlight = flight.maxStops === 0;
  const isBooked = Boolean(flight.purchasePrice && flight.purchasePrice > 0);
  const savedBenchmark = isBooked ? flight.purchasePrice! : flight.baselinePrice;

  const validChecks = [...history]
    .filter(h => (h.status === 'Success' || h.status === 'Booked') && typeof h.price === 'number' && h.price > 0)
    .sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime());

  const nonstopValues: number[] = [];
  const withStopsValues: number[] = [];
  const overallValues: number[] = [];

  if (typeof flight.currentPrice === 'number' && flight.currentPrice > 0) {
    overallValues.push(flight.currentPrice);
    if (isNonstopFlight) nonstopValues.push(flight.currentPrice);
  }

  let earliestBreakdown: StopPriceBreakdown | null = null;
  let latestBreakdown: StopPriceBreakdown | null = null;

  for (const check of validChecks) {
    const breakdown = computeCheckStopPrices(check, flight.maxStops);
    if (breakdown.nonstop !== null) nonstopValues.push(breakdown.nonstop);
    if (breakdown.withStops !== null) withStopsValues.push(breakdown.withStops);
    if (breakdown.overall !== null) overallValues.push(breakdown.overall);

    if (check.status === 'Success') {
      if (!earliestBreakdown) earliestBreakdown = breakdown;
      latestBreakdown = breakdown;
    }
  }

  const currentNonstop = isNonstopFlight
    ? (flight.currentPrice > 0 ? flight.currentPrice : latestBreakdown?.nonstop ?? null)
    : (latestBreakdown?.nonstop ?? null);
  const currentWithStops = latestBreakdown?.withStops ?? null;
  const currentOverall = !isNonstopFlight
    ? (flight.currentPrice > 0 ? flight.currentPrice : latestBreakdown?.overall ?? null)
    : (latestBreakdown?.overall ?? currentNonstop);

  const baselineNonstop = isBooked
    ? savedBenchmark
    : isNonstopFlight
    ? (savedBenchmark > 0 ? savedBenchmark : earliestBreakdown?.nonstop ?? null)
    : (earliestBreakdown?.nonstop ?? null);
  const baselineWithStops = isBooked ? null : (earliestBreakdown?.withStops ?? null);
  const baselineOverall = isBooked
    ? savedBenchmark
    : !isNonstopFlight
    ? (savedBenchmark > 0 ? savedBenchmark : earliestBreakdown?.overall ?? null)
    : (earliestBreakdown?.overall ?? baselineNonstop);

  return {
    current: { nonstop: currentNonstop, withStops: currentWithStops, overall: currentOverall },
    baseline: { nonstop: baselineNonstop, withStops: baselineWithStops, overall: baselineOverall },
    allTimeLow: {
      nonstop: nonstopValues.length > 0 ? Math.min(...nonstopValues) : null,
      withStops: withStopsValues.length > 0 ? Math.min(...withStopsValues) : null,
      overall: overallValues.length > 0 ? Math.min(...overallValues) : null,
    },
    allTimeHigh: {
      nonstop: nonstopValues.length > 0 ? Math.max(...nonstopValues) : null,
      withStops: withStopsValues.length > 0 ? Math.max(...withStopsValues) : null,
      overall: overallValues.length > 0 ? Math.max(...overallValues) : null,
    },
    hasNonstopData: nonstopValues.length > 0,
    hasWithStopsData: withStopsValues.length > 0,
  };
}