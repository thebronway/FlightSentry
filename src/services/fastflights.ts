import { Flight, RouteItinerary } from '../types';
import { DataSourceResult } from './datasource';
import { getFlights, createQuery, Passengers } from 'fast-flights-ts';
import { normalizeAirlineCode, getAirlineName, cleanFlightNumber } from '../utils/airline';

const formatSimpleDatetime = (dt: any): string | undefined => {
  if (!dt) return undefined;
  if (typeof dt === 'string') {
    const trimmed = dt.trim();
    return trimmed && !trimmed.includes('undefined') ? trimmed : undefined;
  }
  if (typeof dt === 'object') {
    let timeStr = '';
    // fast-flights-ts returns time as [hour, minute]
    if (Array.isArray(dt.time) && dt.time.length >= 2) {
      const h = Number(dt.time[0]);
      const m = Number(dt.time[1]);
      if (!isNaN(h) && !isNaN(m)) {
        timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      }
    } else if (typeof dt.time === 'string' && dt.time.trim() && !dt.time.includes('undefined')) {
      timeStr = dt.time.trim();
    } else if (dt.hours !== undefined || dt.hour !== undefined) {
      const h = Number(dt.hours ?? dt.hour);
      const m = Number(dt.minutes ?? dt.minute ?? 0);
      if (!isNaN(h)) {
        timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      }
    }

    let dateStr = '';
    if (Array.isArray(dt.date) && dt.date.length >= 3) {
      dateStr = `${dt.date[0]}-${String(dt.date[1]).padStart(2, '0')}-${String(dt.date[2]).padStart(2, '0')}`;
    } else if (typeof dt.date === 'string' && dt.date.trim() && !dt.date.includes('undefined')) {
      dateStr = dt.date.trim();
    }

    const combined = [dateStr, timeStr].filter(Boolean).join(' ');
    return combined || undefined;
  }
  return undefined;
};

export const checkFastFlightsPrice = async (flight: Flight): Promise<DataSourceResult> => {
  try {
    const fastFlightsSeatMap: Record<string, 'economy' | 'premium-economy' | 'business' | 'first'> = {
      economy: 'economy',
      premium_economy: 'premium-economy',
      business: 'business',
      first: 'first',
    };
    const seat = fastFlightsSeatMap[flight.cabinClass || 'economy'] || 'economy';

    const query = createQuery({
      flights: [
        { 
          date: flight.departureDate, 
          from_airport: flight.origin || '', 
          to_airport: flight.destination || '' 
        }
      ],
      seat,
      trip: 'one-way',
      passengers: new Passengers({ adults: 1 }),
    });

    const results = await getFlights(query);
    if (!results || results.length === 0) {
      return { price: null, status: 'SoldOut' };
    }

    const parsedItineraries: RouteItinerary[] = results
      .filter((f: any) => typeof f.price === 'number' && f.price > 0)
      .map((f: any) => {
        const firstLeg = f.flights?.[0] || {};
        const lastLeg = f.flights?.[f.flights.length - 1] || firstLeg;
        const rawAirline = (Array.isArray(f.airlines) && f.airlines[0]) ? f.airlines[0] : (firstLeg.airline || '');
        const rawFlightNum = (firstLeg.flight_number || firstLeg.flightNumber || '').toString();
        const code = normalizeAirlineCode(rawAirline, rawFlightNum);
        const flightNum = cleanFlightNumber(rawFlightNum, code);
        const stops = Math.max(0, (f.flights?.length || 1) - 1);

        const departureTime = formatSimpleDatetime(firstLeg.departure) || firstLeg.departure_time;
        const arrivalTime = formatSimpleDatetime(lastLeg.arrival) || lastLeg.arrival_time;

        return {
          airline: code,
          airlineName: rawAirline || getAirlineName(code),
          flightNumber: flightNum || undefined,
          price: f.price,
          departureTime,
          arrivalTime,
          duration: f.total_duration ? `${Math.floor(f.total_duration / 60)}h ${f.total_duration % 60}m` : undefined,
          stops,
          isNonstop: stops === 0,
        };
      });

    // 1. Specific Flight Number matching
    if (flight.searchMode === 'FlightNumber' && flight.flightNumber) {
      const targetFlight = results.find((f: any) => {
        const apiAirlines = f.airlines?.map((a: string) => a.toLowerCase()) || [];
        const hasAirline = flight.airline ? apiAirlines.some((a: string) => a.includes(flight.airline.toLowerCase())) : true;
        const apiFlightNumbers = f.flights?.map((leg: any) => 
          (leg.flight_number || leg.flightNumber || '').toString().toLowerCase()
        ) || [];
        const hasFlightNumber = apiFlightNumbers.includes(flight.flightNumber!.toLowerCase());
        return hasAirline && (apiFlightNumbers.length === 0 || hasFlightNumber);
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

    // 2. Route Mode: candidate filtering
    let candidates: RouteItinerary[] = parsedItineraries;
    if (flight.airline) {
      const target = flight.airline.toLowerCase();
      candidates = candidates.filter((it: RouteItinerary) => it.airline.toLowerCase() === target || (it.airlineName?.toLowerCase().includes(target) ?? false));
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
  } catch (error: any) {
    console.error("Error fetching from Fast-Flights:", error.message);
    
    // Detect CAPTCHA or HTTP 429 Rate Limits from the scraper
    if (error.message?.includes('429') || error.message?.toLowerCase().includes('captcha')) {
      return { price: null, status: 'RateLimited' };
    }
    
    return { price: null, status: 'Error' };
  }
};