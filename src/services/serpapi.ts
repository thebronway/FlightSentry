import { Flight, RouteItinerary } from '../types';
import { DataSourceResult } from './datasource';
import { normalizeAirlineCode, getAirlineName, cleanFlightNumber, expandAlliancesToAirlines } from '../utils/airline';
import { filterItinerariesBySearchPreferences } from '../utils/routeIntelligence';
import { resolveToApiAirportCodes } from '../utils/coLocations';

export const checkFlightPrice = async (
  flight: Flight,
  apiKey: string,
  currency: string = 'USD'
): Promise<DataSourceResult> => {
  if (!apiKey) {
    console.error("SerpApi key is missing or not configured.");
    return { price: null, status: 'Error' };
  }

  if (!flight.origin || !flight.destination) {
    console.error(`SerpApi validation failed: Origin and Destination are required. (Flight ID: ${flight.id})`);
    return { price: null, status: 'Error' };
  }

  try {
    const departureId = resolveToApiAirportCodes(flight.origin);
    const arrivalId = resolveToApiAirportCodes(flight.destination);

    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.append('engine', 'google_flights');
    url.searchParams.append('departure_id', departureId);
    url.searchParams.append('arrival_id', arrivalId);
    url.searchParams.append('outbound_date', flight.departureDate);
    url.searchParams.append('type', '2'); // 2 = One-way in SerpAPI
    url.searchParams.append('currency', currency || 'USD');
    url.searchParams.append('hl', 'en');
    url.searchParams.append('api_key', apiKey);

    const serpCabinMap: Record<string, string> = {
      economy: '1',
      premium_economy: '2',
      business: '3',
      first: '4',
    };
    url.searchParams.append('travel_class', serpCabinMap[flight.cabinClass || 'economy'] || '1');

    if (flight.searchMode === 'Route') {
      if (flight.maxStops !== undefined && flight.maxStops !== null) {
        // SerpAPI stops: 1 = Nonstop only, 2 = 1 stop or fewer, 3 = 2 stops or fewer
        const serpStopsMap: Record<number, string> = { 0: '1', 1: '2', 2: '3' };
        if (serpStopsMap[flight.maxStops]) {
          url.searchParams.append('stops', serpStopsMap[flight.maxStops]);
        }
      }

      if (flight.includedAirlines) {
        const expandedIncluded = expandAlliancesToAirlines(flight.includedAirlines);
        if (expandedIncluded.length > 0) {
          url.searchParams.append('include_airlines', expandedIncluded.join(','));
        }
      }
      if (flight.excludedAirlines) {
        const expandedExcluded = expandAlliancesToAirlines(flight.excludedAirlines);
        if (expandedExcluded.length > 0) {
          url.searchParams.append('exclude_airlines', expandedExcluded.join(','));
        }
      }
      if (flight.excludedConnectingAirports) {
        url.searchParams.append('exclude_conns', flight.excludedConnectingAirports.replace(/\s+/g, ''));
      }
      if (flight.maxTotalDurationMinutes) {
        url.searchParams.append('max_duration', String(flight.maxTotalDurationMinutes));
      }
    } else if (flight.searchMode === 'FlightNumber' && flight.monitorRouteAlternatives !== 1 && flight.airline) {
      url.searchParams.append('include_airlines', flight.airline.replace(/\s+/g, ''));
    }

    console.log(`[SerpAPI] Querying ${flight.origin} -> ${flight.destination} on ${flight.departureDate}`);
    const response = await fetch(url.toString());

    if (response.status === 429) {
      console.warn("[SerpAPI] Rate limit (HTTP 429)");
      return { price: null, status: 'RateLimited', errorMessage: 'SerpAPI rate limit (HTTP 429)' };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SerpAPI] HTTP ${response.status} ${response.statusText}: ${errorText}`);
      let parsedMessage = errorText;
      try {
        const json = JSON.parse(errorText);
        parsedMessage = json.error || json.message || errorText;
      } catch {}
      return { price: null, status: 'Error', errorMessage: `SerpAPI HTTP ${response.status}: ${parsedMessage}` };
    }

    const data = await response.json();
    const bestFlights = data.best_flights || [];
    const otherFlights = data.other_flights || [];
    const allFlights = [...bestFlights, ...otherFlights];

    console.log(`[SerpAPI] Returned ${allFlights.length} itineraries (${bestFlights.length} best, ${otherFlights.length} other)`);

    if (allFlights.length === 0) {
      return { price: null, status: 'SoldOut', errorMessage: 'SerpAPI returned 0 flight itineraries for this route and date' };
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

        const rawDep = firstLeg.departure_airport?.id || firstLeg.departure_airport?.code;
        const rawArr = lastLeg.arrival_airport?.id || lastLeg.arrival_airport?.code;
        const legOrigin = typeof rawDep === 'string' && rawDep.trim().length === 3 ? rawDep.trim().toUpperCase() : undefined;
        const legDestination = typeof rawArr === 'string' && rawArr.trim().length === 3 ? rawArr.trim().toUpperCase() : undefined;

        const layoverAirports = (f.flights && f.flights.length > 1)
          ? f.flights.slice(0, -1).map((leg: any) => (leg.arrival_airport?.id || leg.arrival_airport?.code || '').trim().toUpperCase()).filter((c: string) => c.length === 3)
          : undefined;

        let maxLayoverMinutes: number | undefined = undefined;
        if (Array.isArray(f.layovers) && f.layovers.length > 0) {
          const durations = f.layovers.map((l: any) => Number(l.duration)).filter((d: number) => !isNaN(d) && d > 0);
          if (durations.length > 0) maxLayoverMinutes = Math.max(...durations);
        }

        return {
          airline: code,
          airlineName: firstLeg.airline || getAirlineName(code),
          flightNumber: flightNum,
          origin: legOrigin,
          destination: legDestination,
          price: f.price,
          departureTime: firstLeg.departure_airport?.time,
          arrivalTime: lastLeg.arrival_airport?.time,
          duration: f.total_duration ? `${Math.floor(f.total_duration / 60)}h ${f.total_duration % 60}m` : undefined,
          durationMinutes: typeof f.total_duration === 'number' ? f.total_duration : undefined,
          stops,
          isNonstop: stops === 0,
          layoverAirports,
          maxLayoverMinutes,
        };
      });

    // Specific Flight Number matching
    if (flight.searchMode === 'FlightNumber' && flight.flightNumber) {
      const targetCode = normalizeAirlineCode(flight.airline || '', flight.flightNumber);
      const targetNum = cleanFlightNumber(flight.flightNumber, targetCode);

      const targetFlight = allFlights.find((f: any) => {
        const legs = f.flights || [];
        return legs.some((leg: any) => {
          const rawFlightNum = (leg.flight_number || '').toString();
          const legCode = normalizeAirlineCode(leg.airline || '', rawFlightNum);
          const legNum = cleanFlightNumber(rawFlightNum, legCode);

          const matchesAirline = targetCode ? legCode === targetCode : true;
          const matchesNumber = legNum === targetNum;
          return matchesAirline && matchesNumber;
        });
      });

      if (targetFlight && typeof targetFlight.price === 'number') {
        let alternatives: RouteItinerary[] | undefined = undefined;
        if (flight.monitorRouteAlternatives === 1) {
          alternatives = filterItinerariesBySearchPreferences(parsedItineraries, flight);
          if (flight.includedAirlines) {
            const included = flight.includedAirlines.split(',').map(s => s.trim().toUpperCase());
            alternatives = alternatives.filter((it: RouteItinerary) => included.includes(it.airline));
          }
          if (flight.excludedAirlines) {
            const excluded = flight.excludedAirlines.split(',').map(s => s.trim().toUpperCase());
            alternatives = alternatives.filter((it: RouteItinerary) => !excluded.includes(it.airline));
          }
        }
        return {
          price: targetFlight.price,
          status: 'Success',
          leadingAirline: targetCode,
          leadingFlightNumber: flight.flightNumber,
          itineraries: alternatives,
        };
      }

      return { price: null, status: 'SoldOut' };
    }

    // Route Mode: filter candidates according to airline inclusion/exclusion criteria
    let candidates: RouteItinerary[] = parsedItineraries;
    if (flight.airline && flight.airline.toUpperCase() !== 'ALL') {
      const target = flight.airline.toLowerCase();
      candidates = candidates.filter((it: RouteItinerary) => it.airline.toLowerCase() === target || (it.airlineName?.toLowerCase().includes(target) ?? false));
    }
    if (flight.includedAirlines) {
      const included = expandAlliancesToAirlines(flight.includedAirlines);
      candidates = candidates.filter((it: RouteItinerary) => included.includes(it.airline));
    }
    if (flight.excludedAirlines) {
      const excluded = expandAlliancesToAirlines(flight.excludedAirlines);
      candidates = candidates.filter((it: RouteItinerary) => !excluded.includes(it.airline));
    }

    // Apply time-of-day and redeye search preferences
    candidates = filterItinerariesBySearchPreferences(candidates, flight);
    const eligibleItineraries = filterItinerariesBySearchPreferences(parsedItineraries, flight);

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.price - b.price);
      const lowest = candidates[0];
      return {
        price: lowest.price,
        status: 'Success',
        leadingAirline: lowest.airline,
        leadingFlightNumber: lowest.flightNumber,
        itineraries: eligibleItineraries,
      };
    }

    return { price: null, status: 'SoldOut' };
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.error("Error fetching from SerpApi:", msg);
    return { price: null, status: 'Error', errorMessage: `SerpAPI exception: ${msg}` };
  }
};