import { Flight, RouteItinerary } from '../types';
import { DataSourceResult } from './datasource';
import { normalizeAirlineCode, getAirlineName, cleanFlightNumber } from '../utils/airline';

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

    // Parse and retain all structured competitor itineraries
    const parsedItineraries: RouteItinerary[] = allFlights
      .filter((f: any) => typeof f.price === 'number' && f.price > 0)
      .map((f: any): RouteItinerary => {
        const firstLeg = f.flights?.[0] || {};
        const lastLeg = f.flights?.[f.flights.length - 1] || firstLeg;
        const rawAirline = firstLeg.airline || firstLeg.airlineName || f.airline || '';
        const rawFlightNum = (firstLeg.flightNumber || firstLeg.flight_number || f.flightNumber || '').toString();
        const code = normalizeAirlineCode(rawAirline, rawFlightNum);
        const flightNum = cleanFlightNumber(rawFlightNum, code);
        const stops = Math.max(0, (f.flights?.length || 1) - 1);

        const depTime = firstLeg.departure_airport?.time || 
                        firstLeg.departureAirport?.time || 
                        firstLeg.departureTime || 
                        (typeof firstLeg.departure === 'string' ? firstLeg.departure : firstLeg.departure?.time);

        const arrTime = lastLeg.arrival_airport?.time || 
                        lastLeg.arrivalAirport?.time || 
                        lastLeg.arrivalTime || 
                        (typeof lastLeg.arrival === 'string' ? lastLeg.arrival : lastLeg.arrival?.time);

        return {
          airline: code,
          airlineName: rawAirline || getAirlineName(code),
          flightNumber: flightNum || undefined,
          price: f.price,
          departureTime: depTime,
          arrivalTime: arrTime,
          duration: f.duration ? `${Math.floor(f.duration / 60)}h ${f.duration % 60}m` : (f.total_duration ? `${Math.floor(f.total_duration / 60)}h ${f.total_duration % 60}m` : undefined),
          stops,
          isNonstop: stops === 0,
        };
      });

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

    return { price: null, status: 'SoldOut' };
  } catch (error) {
    console.error('[HasData] Request exception:', error);
    return { price: null, status: 'Error' };
  }
};