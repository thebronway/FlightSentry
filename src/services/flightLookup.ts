import { settingsDb } from '../db/settings';

export interface RouteLookupResult {
  success: boolean;
  origin?: string;
  destination?: string;
  airlineName?: string;
  airlineCode?: string;
  flightNumber?: string;
  source?: 'schedule_api' | 'serpapi' | 'catalog';
  error?: string;
}

// Common commercial transcontinental and flagship routes catalog for instant zero-latency resolution
const COMMON_ROUTES_CATALOG: Record<string, { origin: string; destination: string; airlineName: string }> = {
  'AS6': { origin: 'SEA', destination: 'DCA', airlineName: 'Alaska Airlines' },
  'AS1': { origin: 'DCA', destination: 'SEA', airlineName: 'Alaska Airlines' },
  'AS4': { origin: 'SEA', destination: 'DCA', airlineName: 'Alaska Airlines' },
  'AA1': { origin: 'JFK', destination: 'LAX', airlineName: 'American Airlines' },
  'AA2': { origin: 'LAX', destination: 'JFK', airlineName: 'American Airlines' },
  'AA3': { origin: 'JFK', destination: 'LAX', airlineName: 'American Airlines' },
  'AA4': { origin: 'LAX', destination: 'JFK', airlineName: 'American Airlines' },
  'UA1': { origin: 'SFO', destination: 'SIN', airlineName: 'United Airlines' },
  'UA2': { origin: 'SIN', destination: 'SFO', airlineName: 'United Airlines' },
  'DL1': { origin: 'JFK', destination: 'LHR', airlineName: 'Delta Air Lines' },
  'DL2': { origin: 'LHR', destination: 'JFK', airlineName: 'Delta Air Lines' },
  'B61': { origin: 'JFK', destination: 'FLL', airlineName: 'JetBlue' },
  'B62': { origin: 'FLL', destination: 'JFK', airlineName: 'JetBlue' },
  'WN1': { origin: 'DAL', destination: 'HOU', airlineName: 'Southwest Airlines' },
  'WN2': { origin: 'HOU', destination: 'DAL', airlineName: 'Southwest Airlines' },
};

export const lookupFlightRoute = async (
  airline: string,
  flightNumber: string
): Promise<RouteLookupResult> => {
  const cleanAirline = airline.trim().toUpperCase();
  const cleanFlightNumber = flightNumber.trim().replace(/\D/g, '');
  const flightKey = `${cleanAirline}${cleanFlightNumber}`;

  // 1. Check instant common schedule catalog
  if (COMMON_ROUTES_CATALOG[flightKey]) {
    const entry = COMMON_ROUTES_CATALOG[flightKey];
    return {
      success: true,
      origin: entry.origin,
      destination: entry.destination,
      airlineName: entry.airlineName,
      airlineCode: cleanAirline,
      flightNumber: cleanFlightNumber,
      source: 'catalog',
    };
  }

  // 2. Query Public Flight Schedule API
  try {
    const res = await fetch(
      `https://www.flightradar24.com/v1/search/web/find?query=${encodeURIComponent(flightKey)}&limit=5`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(4000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const results: any[] = data.results || [];

      for (const item of results) {
        // Detailed schedule item
        if (item.detail?.schd_from && item.detail?.schd_to) {
          return {
            success: true,
            origin: item.detail.schd_from.toUpperCase(),
            destination: item.detail.schd_to.toUpperCase(),
            airlineName: item.label?.split('-')?.[1]?.trim(),
            airlineCode: cleanAirline,
            flightNumber: cleanFlightNumber,
            source: 'schedule_api',
          };
        }

        // Check if route format is in detail.route or label
        const routeMatch = (item.detail?.route || item.label || '').match(/\b([A-Z]{3})\s*[-→]\s*([A-Z]{3})\b/i);
        if (routeMatch) {
          return {
            success: true,
            origin: routeMatch[1].toUpperCase(),
            destination: routeMatch[2].toUpperCase(),
            airlineName: item.label?.split('-')?.[1]?.trim(),
            airlineCode: cleanAirline,
            flightNumber: cleanFlightNumber,
            source: 'schedule_api',
          };
        }
      }
    }
  } catch (error: any) {
    console.warn(`[FlightLookup] Schedule lookup failed for ${flightKey}:`, error.message);
  }

  // 3. SerpAPI Knowledge Graph Fallback (if configured)
  const settings = settingsDb.get();
  if (settings.serpApiKey && settings.serpApiEnabled === 1) {
    try {
      const serpUrl = new URL('https://serpapi.com/search.json');
      serpUrl.searchParams.append('engine', 'google');
      serpUrl.searchParams.append('q', `Flight ${cleanAirline} ${cleanFlightNumber}`);
      serpUrl.searchParams.append('api_key', settings.serpApiKey);

      const serpRes = await fetch(serpUrl.toString(), { signal: AbortSignal.timeout(5000) });
      if (serpRes.ok) {
        const serpData = await serpRes.json();
        const flightResult = serpData.flights_results?.[0] || serpData.answer_box;

        const depIata =
          flightResult?.departure_airport?.id ||
          flightResult?.snippet?.match(/\bfrom\s+([A-Z]{3})\b/i)?.[1];
        const arrIata =
          flightResult?.arrival_airport?.id ||
          flightResult?.snippet?.match(/\bto\s+([A-Z]{3})\b/i)?.[1];

        if (depIata && arrIata && depIata.length === 3 && arrIata.length === 3) {
          return {
            success: true,
            origin: depIata.toUpperCase(),
            destination: arrIata.toUpperCase(),
            airlineCode: cleanAirline,
            flightNumber: cleanFlightNumber,
            source: 'serpapi',
          };
        }
      }
    } catch (serpErr: any) {
      console.warn(`[FlightLookup] SerpAPI schedule lookup failed:`, serpErr.message);
    }
  }

  return {
    success: false,
    airlineCode: cleanAirline,
    flightNumber: cleanFlightNumber,
    error: `Could not auto-detect route for ${cleanAirline} ${cleanFlightNumber}. Please enter Origin and Destination manually.`,
  };
};