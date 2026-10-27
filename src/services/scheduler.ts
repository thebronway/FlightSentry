import { flightDb } from '../db/flights';
import { settingsDb } from '../db/settings';
import { historyDb } from '../db/history';
import { checkFlightPrice } from './serpapi';
import { evaluatePrice } from './evaluator';
import { checkAndResetQuota, canMakeApiCall } from './quota';
import { isFlightExpired } from '../utils/date';

export const expireOldFlights = (timezone: string): void => {
  const flights = flightDb.getAll().filter(f => f.status === 'Active');
  for (const flight of flights) {
    if (isFlightExpired(flight.departureDate, timezone)) {
      console.log(`Flight ${flight.id} expired. Marking as Expired.`);
      flightDb.updateStatus(flight.id, 'Expired');
    }
  }
};

import { executeSearchStrategy } from './datasource';
import { calculateNextCheck } from '../utils/queue';

export const processNextFlight = async (): Promise<boolean> => {
  let settings = settingsDb.get();
  settings = checkAndResetQuota(settings);
  
  if (!canMakeApiCall(settings)) {
    console.log("Queue paused: Global pause active or monthly quota exceeded.");
    return false;
  }

  if (settings.circuitBreakerUntil && new Date(settings.circuitBreakerUntil) > new Date()) {
    console.log(`Queue paused: Circuit breaker active until ${settings.circuitBreakerUntil}`);
    return false;
  }

  expireOldFlights(settings.timezone);

  const flight = flightDb.getNextDueFlight();
  if (!flight) return false; // No jobs due

  console.log(`Processing Flight ${flight.id}...`);
  
  const result = await executeSearchStrategy(flight, settings);

  if (result.status === 'RateLimited') {
    // Trigger Circuit Breaker: 4 to 8 hours random pause
    const pauseHours = Math.random() * (8 - 4) + 4;
    const pauseUntil = new Date(Date.now() + pauseHours * 3600000).toISOString();
    settingsDb.update({ circuitBreakerUntil: pauseUntil });
    console.error(`Circuit breaker triggered! Pausing all scraping until ${pauseUntil}`);
    return false;
  }

  if (result.status !== 'Error' && result.sourceUsed) {
    settingsDb.incrementApiUsage(result.sourceUsed);
  }

  if (result.status === 'Success' && result.price !== null) {
    await evaluatePrice(flight, result.price, settings, {
      airline: result.leadingAirline,
      flightNumber: result.leadingFlightNumber,
      metadata: result.itineraries ? JSON.stringify(result.itineraries) : null,
      sourceUsed: result.sourceUsed,
      itineraries: result.itineraries,
    });
  } else {
    historyDb.insert(flight.id, flight.currentPrice, result.status, {
      airline: result.leadingAirline || flight.airline,
      flightNumber: result.leadingFlightNumber || flight.flightNumber,
      metadata: result.itineraries ? JSON.stringify(result.itineraries) : null,
      sourceUsed: result.sourceUsed,
    });
  }

  // Calculate and save the next check time
  const nextCheck = calculateNextCheck(flight, settings);
  flightDb.updateNextCheckAt(flight.id, nextCheck);
  
  return true; // Successfully processed a job
};