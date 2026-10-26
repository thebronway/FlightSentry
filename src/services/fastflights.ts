import { Flight } from '../types';
import { DataSourceResult } from './datasource';
import { getFlights, createQuery, Passengers } from 'fast-flights-ts';

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

    const targetFlight = results.find((f: any) => {
      // The fast-flights-ts library returns an array of airlines for the itinerary
      const apiAirlines = f.airlines?.map((a: string) => a.toLowerCase()) || [];
      const hasAirline = apiAirlines.some((a: string) => a.includes(flight.airline.toLowerCase()));
      
      // We check the nested legs for the specific flight number
      const apiFlightNumbers = f.flights?.map((leg: any) => leg.flight_number?.toString().toLowerCase()) || [];
      const hasFlightNumber = flight.flightNumber ? apiFlightNumbers.includes(flight.flightNumber.toLowerCase()) : true;

      return hasAirline && hasFlightNumber;
    });

    if (targetFlight && targetFlight.price) {
      return { price: targetFlight.price, status: 'Success' };
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