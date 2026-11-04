import { Flight, Settings, RouteItinerary } from '../types';
import { flightDb } from '../db/flights';
import { historyDb } from '../db/history';
import { sendPriceDropAlert, sendPriceIncreaseAlert } from './notifications';

export interface EvaluationDetails {
  airline?: string | null;
  flightNumber?: string | null;
  metadata?: string | null;
  sourceUsed?: string | null;
  itineraries?: RouteItinerary[];
}

export const evaluatePrice = async (
  flight: Flight, 
  newPrice: number, 
  settings: Settings,
  details?: EvaluationDetails
): Promise<void> => {
  // 1. Update the database with the new current price
  flightDb.updatePrice(flight.id, newPrice);

  // 2. Add to price history with full route metadata
  historyDb.insert(flight.id, newPrice, 'Success', {
    airline: details?.airline,
    flightNumber: details?.flightNumber,
    metadata: details?.metadata,
    sourceUsed: details?.sourceUsed,
  });

  // 3. Evaluate threshold rules using active benchmark
  const previousPrice = flight.currentPrice;
  const isBooked = Boolean(flight.purchasePrice && flight.purchasePrice > 0);
  const benchmarkPrice = isBooked ? flight.purchasePrice! : flight.baselinePrice;

  // Tracking direction: drop (default), increase, or both
  const direction = flight.priceTrackingDirection || 'drop';

  // --- BRANCH A: PRICE DROP EVALUATION ---
  if (direction === 'drop' || direction === 'both') {
    const dropFromBenchmark = benchmarkPrice - newPrice;
    const dropPercentFromBenchmark = benchmarkPrice > 0 ? (dropFromBenchmark / benchmarkPrice) * 100 : 0;
    const isLowerThanPrevious = newPrice < previousPrice;
    const isLowerThanBenchmark = newPrice < benchmarkPrice;

    const minDropDollar = (flight.minDropDollar !== null && flight.minDropDollar !== undefined)
      ? flight.minDropDollar
      : settings.minDropDollar;

    const minDropPercent = (flight.minDropPercent !== null && flight.minDropPercent !== undefined)
      ? flight.minDropPercent
      : settings.minDropPercent;

    const hasDollarRule = minDropDollar !== null && minDropDollar !== undefined && minDropDollar > 0;
    const hitsDollarThreshold = hasDollarRule ? dropFromBenchmark >= minDropDollar : false;

    const hasPercentRule = minDropPercent !== null && minDropPercent !== undefined && minDropPercent > 0;
    const hitsPercentThreshold = hasPercentRule ? dropPercentFromBenchmark >= minDropPercent : false;

    const hitsTargetPrice = flight.targetPrice ? newPrice <= flight.targetPrice : false;

    if (isLowerThanPrevious && isLowerThanBenchmark && (hitsDollarThreshold || hitsPercentThreshold || hitsTargetPrice)) {
      console.log(`[Alert] Drop alert triggered for Flight ID: ${flight.id} at ${newPrice} (Benchmark: ${benchmarkPrice}, Min$: ${minDropDollar}, Min%: ${minDropPercent})`);
      await sendPriceDropAlert(settings, flight, newPrice, details);
    }
  }

  // --- BRANCH B: PRICE INCREASE EVALUATION ---
  // Strictly permitted ONLY when planning to buy (unpurchased)
  if (!isBooked && (direction === 'increase' || direction === 'both')) {
    const surgeFromBenchmark = newPrice - benchmarkPrice;
    const surgePercentFromBenchmark = benchmarkPrice > 0 ? (surgeFromBenchmark / benchmarkPrice) * 100 : 0;
    const isHigherThanPrevious = newPrice > previousPrice;
    const isHigherThanBenchmark = newPrice > benchmarkPrice;

    // Use per-flight surge overrides, fallback to global defaults
    const minIncreaseDollar = (flight.minIncreaseDollar !== null && flight.minIncreaseDollar !== undefined)
      ? flight.minIncreaseDollar
      : settings.minIncreaseDollar ?? 50;

    const minIncreasePercent = (flight.minIncreasePercent !== null && flight.minIncreasePercent !== undefined)
      ? flight.minIncreasePercent
      : settings.minIncreasePercent ?? 10;

    const hasIncreaseDollarRule = minIncreaseDollar !== null && minIncreaseDollar !== undefined && minIncreaseDollar > 0;
    const hitsIncreaseDollarThreshold = hasIncreaseDollarRule ? surgeFromBenchmark >= minIncreaseDollar : false;

    const hasIncreasePercentRule = minIncreasePercent !== null && minIncreasePercent !== undefined && minIncreasePercent > 0;
    const hitsIncreasePercentThreshold = hasIncreasePercentRule ? surgePercentFromBenchmark >= minIncreasePercent : false;

    if (isHigherThanPrevious && isHigherThanBenchmark && (hitsIncreaseDollarThreshold || hitsIncreasePercentThreshold)) {
      console.log(`[Alert] Surge alert triggered for Flight ID: ${flight.id} at ${newPrice} (Benchmark: ${benchmarkPrice}, Min$: ${minIncreaseDollar}, Min%: ${minIncreasePercent})`);
      await sendPriceIncreaseAlert(settings, flight, newPrice, details);
    }
  }
};