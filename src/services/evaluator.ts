import { Flight, Settings } from '../types';
import { flightDb } from '../db/flights';
import { historyDb } from '../db/history';
import { sendPriceDropAlert } from './apprise';

export const evaluatePrice = async (
  flight: Flight, 
  newPrice: number, 
  settings: Settings
): Promise<void> => {
  // 1. Update the database with the new current price
  flightDb.updatePrice(flight.id, newPrice);
  
  // 2. Add to price history
  historyDb.insert(flight.id, newPrice, 'Success');

  // 3. Evaluate threshold rules using active benchmark (purchase price takes priority if set)
  const previousPrice = flight.currentPrice;
  const benchmarkPrice = (flight.purchasePrice && flight.purchasePrice > 0)
    ? flight.purchasePrice
    : flight.baselinePrice;

  const dropFromPrevious = previousPrice - newPrice;
  const dropFromBenchmark = benchmarkPrice - newPrice;
  const dropPercentFromBenchmark = benchmarkPrice > 0 ? (dropFromBenchmark / benchmarkPrice) * 100 : 0;

  const isLowerThanPrevious = newPrice < previousPrice;
  const isLowerThanBenchmark = newPrice < benchmarkPrice;

  // Per-flight threshold overrides with fallback to global settings
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

  // STRICT RULES:
  // Must be lower than last check AND lower than the benchmark.
  // AND must meet at least one configured threshold ($ drop, % drop, or hits target price)
  if (isLowerThanPrevious && isLowerThanBenchmark && (hitsDollarThreshold || hitsPercentThreshold || hitsTargetPrice)) {
    console.log(`Alert triggered for Flight ID: ${flight.id} at ${newPrice} (Benchmark: ${benchmarkPrice}, Min$: ${minDropDollar}, Min%: ${minDropPercent})`);
    await sendPriceDropAlert(settings, flight, newPrice);
  }
};