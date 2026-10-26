import { DataSourceResult } from './datasource';
import { Flight } from '../types';

export const checkSearchApiPrice = async (
  flight: Flight,
  apiKey: string
): Promise<DataSourceResult> => {
  try {
    const url = new URL('https://www.searchapi.io/api/v1/search');
    url.searchParams.append('engine', 'google_flights');
    if (!flight.origin || !flight.destination) {
      console.error(`SearchApi.io validation failed: Origin and Destination are required. (Flight ID: ${flight.id})`);
      return { price: null, status: 'Error' };
    }

    url.searchParams.append('departure_id', flight.origin);
    url.searchParams.append('arrival_id', flight.destination);
    url.searchParams.append('outbound_date', flight.departureDate);
    url.searchParams.append('flight_type', 'one_way'); // SearchApi.io documented parameter
    url.searchParams.append('currency', 'USD');
    url.searchParams.append('hl', 'en');
    url.searchParams.append('api_key', apiKey);

    const searchApiCabinMap: Record<string, string> = {
      economy: '1',
      premium_economy: '2',
      business: '3',
      first: '4',
    };
    url.searchParams.append('travel_class', searchApiCabinMap[flight.cabinClass || 'economy'] || '1');

    if (flight.fareTier === 'Standard') {
      url.searchParams.append('exclude_basic_economy', 'true');
    }
    if (flight.includedAirlines) {
      url.searchParams.append('include_airlines', flight.includedAirlines.replace(/\s+/g, ''));
    }
    if (flight.excludedAirlines) {
      url.searchParams.append('exclude_airlines', flight.excludedAirlines.replace(/\s+/g, ''));
    }

    console.log(`[SearchApi] Querying ${flight.origin} -> ${flight.destination} on ${flight.departureDate}`);
    const response = await fetch(url.toString());

    if (response.status === 429) {
      console.warn("[SearchApi] Rate limit (HTTP 429)");
      return { price: null, status: 'RateLimited' };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SearchApi] HTTP ${response.status} ${response.statusText}: ${errorText}`);
      return { price: null, status: 'Error' };
    }

    const data = await response.json();
    const bestFlights = data.best_flights || [];
    const otherFlights = data.other_flights || [];
    const allFlights = [...bestFlights, ...otherFlights];

    console.log(`[SearchApi] Returned ${allFlights.length} itineraries (${bestFlights.length} best, ${otherFlights.length} other)`);

    if (allFlights.length === 0) {
      return { price: null, status: 'SoldOut' };
    }

    // Specific Flight Number matching
    if (flight.searchMode === 'FlightNumber' && flight.flightNumber) {
      const targetFlight = allFlights.find((f: any) => {
        const legs = f.flights || [];
        return legs.some((leg: any) => {
          const apiAirline = (leg.airline || '').toLowerCase();
          const targetAirline = (flight.airline || '').toLowerCase();
          const matchesAirline = targetAirline ? apiAirline.includes(targetAirline) : true;

          const apiFlightNumber = (leg.flight_number || '').toString().toLowerCase();
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

    // Route Mode: return the lowest available fare among matching carriers
    let candidates = allFlights;
    if (flight.airline) {
      candidates = candidates.filter((f: any) => {
        const legs = f.flights || [];
        return legs.some((leg: any) => (leg.airline || '').toLowerCase().includes(flight.airline!.toLowerCase()));
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
    console.error("Error fetching from SearchApi.io:", error);
    return { price: null, status: 'Error' };
  }
};