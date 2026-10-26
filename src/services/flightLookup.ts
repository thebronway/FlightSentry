export interface RouteLookupResult {
  success: boolean;
  origin?: string;
  destination?: string;
  airlineName?: string;
  airlineCode?: string;
  flightNumber?: string;
  source?: 'adsbdb' | 'schedule_api' | 'web_search';
  error?: string;
}

// IATA carrier code to ICAO mapping for open aviation database callsign resolution
const IATA_TO_ICAO: Record<string, string> = {
  AS: 'ASA',
  AA: 'AAL',
  DL: 'DAL',
  UA: 'UAL',
  WN: 'SWA',
  B6: 'JBU',
  NK: 'NKS',
  F9: 'FFT',
  HA: 'HAL',
  AC: 'ACA',
  BA: 'BAW',
  AF: 'AFR',
  LH: 'DLH',
  KL: 'KLM',
};

export const lookupFlightRoute = async (
  airline: string,
  flightNumber: string
): Promise<RouteLookupResult> => {
  const cleanAirline = airline.trim().toUpperCase();
  const cleanFlightNumber = flightNumber.trim().replace(/\D/g, '');
  const flightKey = `${cleanAirline}${cleanFlightNumber}`;
  const icaoCode = IATA_TO_ICAO[cleanAirline] || cleanAirline;
  const icaoKey = `${icaoCode}${cleanFlightNumber}`;

  console.log(`[FlightLookup] Zero-quota route detection started: Key="${flightKey}", ICAO="${icaoKey}"`);

  // 1. Keyless Open Aviation API (api.adsbdb.com)
  const candidateKeys = [icaoKey, flightKey];
  for (const key of candidateKeys) {
    try {
      const url = `https://api.adsbdb.com/v0/callsign/${encodeURIComponent(key)}`;
      console.log(`[FlightLookup] Querying ADS-B: ${url}`);
      const res = await fetch(url, {
        headers: { 'User-Agent': 'FlightSentry/0.4.0', Accept: 'application/json' },
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const data = await res.json();
        const route = data.response?.flightroute;
        const originIata = route?.origin?.iata_code?.toUpperCase();
        const destIata = route?.destination?.iata_code?.toUpperCase();

        if (originIata && destIata && originIata.length === 3 && destIata.length === 3) {
          console.log(`[FlightLookup] Resolved via ADS-B: ${originIata} -> ${destIata}`);
          return {
            success: true,
            origin: originIata,
            destination: destIata,
            airlineName: route?.airline?.name,
            airlineCode: cleanAirline,
            flightNumber: cleanFlightNumber,
            source: 'adsbdb',
          };
        }
      }
    } catch (err: any) {
      console.warn(`[FlightLookup] ADS-B lookup error for ${key}:`, err.message);
    }
  }

  // 2. Flightradar24 Public Search
  try {
    const fr24Url = `https://www.flightradar24.com/v1/search/web/find?query=${encodeURIComponent(flightKey)}&limit=5`;
    const res = await fetch(fr24Url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(3500),
    });

    if (res.ok) {
      const data = await res.json();
      const results: any[] = data.results || [];
      for (const item of results) {
        if (item.detail?.schd_from && item.detail?.schd_to) {
          const origin = item.detail.schd_from.toUpperCase();
          const destination = item.detail.schd_to.toUpperCase();
          console.log(`[FlightLookup] Resolved via Flightradar24: ${origin} -> ${destination}`);
          return {
            success: true,
            origin,
            destination,
            airlineName: item.label?.split('-')?.[1]?.trim(),
            airlineCode: cleanAirline,
            flightNumber: cleanFlightNumber,
            source: 'schedule_api',
          };
        }
      }
    }
  } catch (error: any) {
    console.warn(`[FlightLookup] Flightradar24 lookup error for ${flightKey}:`, error.message);
  }

  // 3. Zero-Quota Public Web Search Scraper (DuckDuckGo HTML)
  try {
    const ddgQuery = `flight ${cleanAirline} ${cleanFlightNumber} route departure arrival`;
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(ddgQuery)}`;
    console.log(`[FlightLookup] Querying DuckDuckGo HTML: ${ddgUrl}`);
    const ddgRes = await fetch(ddgUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (ddgRes.ok) {
      const html = await ddgRes.text();
      const patterns = [
        /\(([A-Z]{3})\)\s*(?:to|→|-)\s*\(([A-Z]{3})\)/i,
        /\bfrom\s+([A-Z]{3})\s+to\s+([A-Z]{3})\b/i,
        /\b([A-Z]{3})\s*(?:to|→|-)\s*([A-Z]{3})\b/i,
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1].toUpperCase() !== match[2].toUpperCase()) {
          const origin = match[1].toUpperCase();
          const destination = match[2].toUpperCase();
          console.log(`[FlightLookup] Resolved via search scraper: ${origin} -> ${destination}`);
          return {
            success: true,
            origin,
            destination,
            airlineCode: cleanAirline,
            flightNumber: cleanFlightNumber,
            source: 'web_search',
          };
        }
      }
    }
  } catch (ddgErr: any) {
    console.warn(`[FlightLookup] Search scraper fallback error:`, ddgErr.message);
  }

  console.warn(`[FlightLookup] Route could not be resolved automatically for ${cleanAirline} ${cleanFlightNumber}.`);
  return {
    success: false,
    airlineCode: cleanAirline,
    flightNumber: cleanFlightNumber,
    error: `Could not auto-detect route for ${cleanAirline} ${cleanFlightNumber}. Please enter Origin and Destination manually.`,
  };
};