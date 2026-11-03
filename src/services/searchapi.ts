import { DataSourceResult } from './datasource';
import { Flight, RouteItinerary } from '../types';
import { normalizeAirlineCode, getAirlineName, cleanFlightNumber } from '../utils/airline';

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
      economy: 'economy',
      premium_economy: 'premium_economy',
      business: 'business',
      first: 'first_class',
    };
    url.searchParams.append('travel_class', searchApiCabinMap[flight.cabinClass || 'economy'] || 'economy');

    if (flight.fareTier === 'Standard') {
      url.searchParams.append('exclude_basic_economy', 'true');
    }
    if (flight.includedAirlines) {
      url.searchParams.append('included_airlines', flight.includedAirlines.replace(/\s+/g, ''));
    }
    if (flight.excludedAirlines) {
      url.searchParams.append('excluded_airlines', flight.excludedAirlines.replace(/\s+/g, ''));
    }

    console.log(`[SearchApi] Querying ${flight.origin} -> ${flight.destination} on ${flight.departureDate}`);
    const response = await fetch(url.toString());

    if (response.status === 429) {
      console.warn("[SearchApi] Rate limit (HTTP 429)");
      return { price: null, status: 'RateLimited', errorMessage: 'SearchApi.io rate limit (HTTP 429)' };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SearchApi] HTTP ${response.status} ${response.statusText}: ${errorText}`);
      
      let parsedMessage = errorText;
      try {
        const json = JSON.parse(errorText);
        parsedMessage = json.error || json.message || errorText;
      } catch {
        // use raw text
      }

      return {
        price: null,
        status: 'Error',
        errorMessage: `SearchApi HTTP ${response.status}: ${parsedMessage}`,
      };
    }

    const data = await response.json();
    const bestFlights = data.best_flights || [];
    const otherFlights = data.other_flights || [];
    const allFlights = [...bestFlights, ...otherFlights];

    console.log(`[SearchApi] Returned ${allFlights.length} itineraries (${bestFlights.length} best, ${otherFlights.length} other)`);

    if (allFlights.length === 0) {
      return { price: null, status: 'SoldOut' };
    }

    // Parse and retain all structured competitor itineraries
    const parsedItineraries: RouteItinerary[] = allFlights
      .filter((f: any) => typeof f.price === 'number' && f.price > 0)
      .map((f: any): RouteItinerary => {
        const firstLeg = f.flights?.[0] || {};
        const lastLeg = f.flights?.[f.flights.length - 1] || firstLeg;
        const rawAirline = firstLeg.airline || '';
        const rawFlightNum = (firstLeg.flight_number || '').toString();
        const code = normalizeAirlineCode(rawAirline, rawFlightNum);
        const flightNum = cleanFlightNumber(rawFlightNum, code);
        const stops = Math.max(0, (f.flights?.length || 1) - 1);

        return {
          airline: code,
          airlineName: firstLeg.airline || getAirlineName(code),
          flightNumber: flightNum,
          price: f.price,
          departureTime: firstLeg.departure_airport?.time,
          arrivalTime: lastLeg.arrival_airport?.time,
          duration: f.total_duration ? `${Math.floor(f.total_duration / 60)}h ${f.total_duration % 60}m` : undefined,
          stops,
          isNonstop: stops === 0,
        };
      });

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
        const targetCode = normalizeAirlineCode(flight.airline || '', flight.flightNumber);
        return {
          price: targetFlight.price,
          status: 'Success',
          leadingAirline: targetCode,
          leadingFlightNumber: flight.flightNumber,
          itineraries: parsedItineraries,
        };
      }

      return { price: null, status: 'SoldOut' };
    }

    // Route Mode: filter candidates according to airline inclusion/exclusion criteria
    let candidates: RouteItinerary[] = parsedItineraries;
    if (flight.airline) {
      const target = flight.airline.toLowerCase();
      candidates = candidates.filter((it: RouteItinerary) => it.airline.toLowerCase() === target || (it.airlineName?.toLowerCase().includes(target) ?? false));
    }
    if (flight.includedAirlines) {
      const included = flight.includedAirlines.split(',').map(s => s.trim().toUpperCase());
      candidates = candidates.filter((it: RouteItinerary) => included.includes(it.airline));
    }
    if (flight.excludedAirlines) {
      const excluded = flight.excludedAirlines.split(',').map(s => s.trim().toUpperCase());
      candidates = candidates.filter((it: RouteItinerary) => !excluded.includes(it.airline));
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.price - b.price);
      const lowest = candidates[0];
      return {
        price: lowest.price,
        status: 'Success',
        leadingAirline: lowest.airline,
        leadingFlightNumber: lowest.flightNumber,
        itineraries: parsedItineraries,
      };
    }

    return { price: null, status: 'SoldOut', errorMessage: 'No flight itineraries found for this route and date' };
  } catch (error: any) {
    const msg = error?.message || 'Network exception calling SearchApi.io';
    console.error("[SearchApi] Exception during request:", msg);
    return { price: null, status: 'Error', errorMessage: `SearchApi exception: ${msg}` };
  }
};