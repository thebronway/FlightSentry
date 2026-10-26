import { Flight } from '../types';
import { DataSourceResult } from './datasource';

export const checkHasDataPrice = async (
  flight: Flight,
  apiKey: string
): Promise<DataSourceResult> => {
  if (!apiKey) {
    console.error('[HasData] API key is missing or not configured.');
    return { price: null, status: 'Error' };
  }
  if (!flight.origin || !flight.destination) {
    console.error(`[HasData] Validation failed: Origin and Destination are required. (Flight ID: ${flight.id})`);
    return { price: null, status: 'Error' };
  }

  try {
    const url = new URL('https://api.hasdata.com/scrape/google/flights');
    url.searchParams.append('departureId', flight.origin);
    url.searchParams.append('arrivalId', flight.destination);
    url.searchParams.append('outboundDate', flight.departureDate);
    url.searchParams.append('type', 'oneWay');
    url.searchParams.append('currency', 'USD');
    url.searchParams.append('hl', 'en');

    const travelClassMap: Record<string, string> = {
      economy: 'economy',
      premium_economy: 'premiumEconomy',
      business: 'business',
      first: 'first',
    };
    url.searchParams.append('travelClass', travelClassMap[flight.cabinClass || 'economy'] || 'economy');

    if (flight.includedAirlines) {
      url.searchParams.append('includeAirlines', flight.includedAirlines.replace(/\s+/g, ''));
    } else if (flight.excludedAirlines) {
      url.searchParams.append('excludeAirlines', flight.excludedAirlines.replace(/\s+/g, ''));
    }

    console.log(`[HasData] Querying ${flight.origin} -> ${flight.destination} on ${flight.departureDate}`);
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 429) {
      console.warn('[HasData] Rate limit encountered (HTTP 429). Logged for tracking.');
      return { price: null, status: 'RateLimited' };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[HasData] HTTP ${response.status} ${response.statusText}: ${errorText}`);
      return { price: null, status: 'Error' };
    }

    const data = await response.json();
    const bestFlights = data.bestFlights || [];
    const otherFlights = data.otherFlights || [];
    const allFlights = data.allFlights || [...bestFlights, ...otherFlights];

    console.log(`[HasData] Returned ${allFlights.length} itineraries`);

    if (allFlights.length === 0) {
      return { price: null, status: 'SoldOut' };
    }

    // Flight number matching
    if (flight.searchMode === 'FlightNumber' && flight.flightNumber) {
      const targetFlight = allFlights.find((f: any) => {
        const legs = f.flights || [];
        return legs.some((leg: any) => {
          const apiAirline = (leg.airline || leg.airlineName || '').toLowerCase();
          const targetAirline = (flight.airline || '').toLowerCase();
          const matchesAirline = targetAirline ? apiAirline.includes(targetAirline) : true;
          const apiFlightNumber = (leg.flight_number || leg.flightNumber || '').toString().toLowerCase();
          const targetNumber = flight.flightNumber!.toLowerCase();
          const matchesNumber =
            apiFlightNumber === targetNumber ||
            apiFlightNumber.endsWith(' ' + targetNumber) ||
            apiFlightNumber.includes(targetNumber);
          return matchesAirline && matchesNumber;
        });
      });

      if (targetFlight && typeof targetFlight.price === 'number') {
        return { price: targetFlight.price, status: 'Success' };
      }
      return { price: null, status: 'SoldOut' };
    }

    // Route Mode: return lowest available fare among matching carriers
    let candidates = allFlights;
    if (flight.airline) {
      candidates = candidates.filter((f: any) => {
        const legs = f.flights || [];
        return legs.some((leg: any) =>
          (leg.airline || leg.airlineName || '').toLowerCase().includes(flight.airline!.toLowerCase())
        );
      });
    }

    const validPrices = candidates
      .map((f: any) => f.price)
      .filter((p: any) => typeof p === 'number');

    if (validPrices.length > 0) {
      return { price: Math.min(...validPrices), status: 'Success' };
    }

    return { price: null, status: 'SoldOut' };
  } catch (error) {
    console.error('[HasData] Request exception:', error);
    return { price: null, status: 'Error' };
  }
};