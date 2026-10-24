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

export const runScheduledChecks = async (): Promise<void> => {
  let settings = settingsDb.get();
  settings = checkAndResetQuota(settings);

  if (!canMakeApiCall(settings)) {
    console.log("Check aborted: Global pause active or monthly quota exceeded.");
    return;
  }

  // Auto-expire flights before running checks
  expireOldFlights(settings.timezone);

  const activeFlights = flightDb.getAll().filter(f => f.status === 'Active');

  for (const flight of activeFlights) {
    // Re-check quota inside the loop to ensure we don't breach it mid-run
    settings = settingsDb.get(); 
    if (!canMakeApiCall(settings)) {
      console.warn("Monthly quota reached during batch run. Halting remaining checks.");
      break;
    }

    console.log(`Checking price for Flight ${flight.id}: ${flight.origin}->${flight.destination}`);
    
    const result = await checkFlightPrice(
      settings.serpApiKey,
      flight.origin,
      flight.destination,
      flight.departureDate,
      flight.airline,
      flight.flightNumber
    );

    // Increment quota usage for actual API hits
    settingsDb.incrementApiUsage();

    if (result.status === 'Success' && result.price !== null) {
      await evaluatePrice(flight, result.price, settings);
    } else {
      // Log errors or sold out status without triggering evaluation rules
      console.log(`Flight ${flight.id} returned status: ${result.status}`);
      historyDb.insert(flight.id, flight.currentPrice, result.status);
    }

    // Polite delay between API calls to prevent rate limits
    await new Promise(res => setTimeout(res, 2000));
  }
};