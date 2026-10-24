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

  // 3. Evaluate threshold rules
  const previousPrice = flight.currentPrice;
  const baselinePrice = flight.baselinePrice;
  
  const dropFromPrevious = previousPrice - newPrice;
  const dropFromBaseline = baselinePrice - newPrice;
  const dropPercentFromBaseline = (dropFromBaseline / baselinePrice) * 100;

  const isLowerThanPrevious = newPrice < previousPrice;
  const isLowerThanBaseline = newPrice < baselinePrice;
  
  const hitsDollarThreshold = dropFromBaseline >= settings.minDropDollar;
  const hitsPercentThreshold = dropPercentFromBaseline >= settings.minDropPercent;
  const hitsTargetPrice = flight.targetPrice ? newPrice <= flight.targetPrice : false;

  // STRICT RULES:
  // Must be lower than last check AND lower than original baseline.
  // AND must meet at least one threshold ($ drop, % drop, or hits target price)
  if (isLowerThanPrevious && isLowerThanBaseline && (hitsDollarThreshold || hitsPercentThreshold || hitsTargetPrice)) {
    console.log(`Alert triggered for Flight ID: ${flight.id} at ${newPrice}`);
    await sendPriceDropAlert(settings.appriseUrl, flight, newPrice);
  }
};