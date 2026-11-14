export interface DetectedRouteCandidate {
  origin: string;
  destination: string;
  airlineName?: string;
  source?: 'adsbdb' | 'schedule_api' | 'web_search';
}

export interface RouteLookupResult {
  success: boolean;
  origin?: string;
  destination?: string;
  airlineName?: string;
  airlineCode?: string;
  flightNumber?: string;
  source?: 'adsbdb' | 'schedule_api' | 'web_search';
  routes?: DetectedRouteCandidate[];
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
  G4: 'AAY',
  SY: 'SCX',
  MX: 'MXY',
  AC: 'ACA',
  WS: 'WJA',
  BA: 'BAW',
  AF: 'AFR',
  LH: 'DLH',
  KL: 'KLM',
  IB: 'IBE',
  EI: 'EIN',
  AZ: 'ITY',
  LX: 'SWR',
  OS: 'AUA',
  SK: 'SAS',
  TP: 'TAP',
  TK: 'THY',
  VS: 'VIR',
  AY: 'FIN',
  SQ: 'SIA',
  QF: 'QFA',
  NZ: 'ANZ',
  EK: 'UAE',
  QR: 'QTR',
  EY: 'ETD',
  CX: 'CPA',
  NH: 'ANA',
  JL: 'JAL',
  KE: 'KAL',
  BR: 'EVA',
  CI: 'CAL',
  AM: 'AMX',
  AV: 'AVA',
  CM: 'CMP',
  LA: 'LAN',
};

export const lookupFlightRoute = async (
  airline: string,
  flightNumber: string,
  departureDate?: string | null
): Promise<RouteLookupResult> => {
  const cleanAirline = airline.trim().toUpperCase();
  const cleanFlightNumber = flightNumber.trim().replace(/\D/g, '');
  const flightKey = `${cleanAirline}${cleanFlightNumber}`;
  const icaoCode = IATA_TO_ICAO[cleanAirline] || cleanAirline;
  const icaoKey = `${icaoCode}${cleanFlightNumber}`;

  console.log(`[FlightLookup] Zero-quota route detection started: Key="${flightKey}", ICAO="${icaoKey}"`);

  const candidates: DetectedRouteCandidate[] = [];
  const addCandidate = (candidate: DetectedRouteCandidate) => {
    const origin = candidate.origin.trim().toUpperCase();
    const destination = candidate.destination.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination) || origin === destination) {
      return;
    }
    const existing = candidates.find(c => c.origin === origin && c.destination === destination);
    if (existing) {
      if (!existing.airlineName && candidate.airlineName) {
        existing.airlineName = candidate.airlineName;
      }
      return;
    }
    candidates.push({
      origin,
      destination,
      airlineName: candidate.airlineName,
      source: candidate.source,
    });
  };

  const expandStopSequence = (
    stops: string[],
    airlineName: string | undefined,
    source: DetectedRouteCandidate['source']
  ): DetectedRouteCandidate[] => {
    const cleanStops = stops
      .map(s => s.trim().toUpperCase())
      .filter(s => /^[A-Z]{3}$/.test(s));
    const legs: DetectedRouteCandidate[] = [];
    for (let i = 0; i < cleanStops.length - 1; i++) {
      if (cleanStops[i] !== cleanStops[i + 1]) {
        legs.push({
          origin: cleanStops[i],
          destination: cleanStops[i + 1],
          airlineName,
          source,
        });
      }
    }
    return legs;
  };

  // 1. HexDB v2 Callsign Routes API (returns ordered `airports` stop list for multi-leg routes)
  const fetchHexDbRoutes = async (): Promise<DetectedRouteCandidate[]> => {
    const found: DetectedRouteCandidate[] = [];
    const callsigns = Array.from(new Set([icaoKey, flightKey]));
    for (const cs of callsigns) {
      try {
        const url = `https://hexdb.io/api/v2/routes/${encodeURIComponent(cs)}`;
        console.log(`[FlightLookup] Querying HexDB v2: ${url}`);
        const res = await fetch(url, {
          headers: { 'User-Agent': 'FlightSentry/0.8.5', Accept: 'application/json' },
          signal: AbortSignal.timeout(3500),
        });

        if (res.ok) {
          const data = await res.json();
          const airportsList: any[] = Array.isArray(data?.airports) ? data.airports : [];
          if (airportsList.length >= 2) {
            const iataStops = airportsList
              .map((ap: any) => String(ap?.iata || '').trim().toUpperCase())
              .filter((code: string) => code.length === 3);
            const legs = expandStopSequence(iataStops, undefined, 'schedule_api');
            if (legs.length > 0) {
              found.push(...legs);
              break;
            }
          }

          const origIata = String(data?.origin?.iata || '').trim().toUpperCase();
          const destIata = String(data?.destination?.iata || '').trim().toUpperCase();
          if (origIata.length === 3 && destIata.length === 3 && origIata !== destIata) {
            found.push({
              origin: origIata,
              destination: destIata,
              source: 'schedule_api',
            });
            break;
          }
        }
      } catch (err: any) {
        console.warn(`[FlightLookup] HexDB lookup error for ${cs}:`, err.message);
      }
    }
    return found;
  };

  // 2. Keyless Open Aviation API (api.adsbdb.com - supports origin, optional midpoint, destination)
  const fetchAdsbRoutes = async (): Promise<DetectedRouteCandidate[]> => {
    const found: DetectedRouteCandidate[] = [];
    const candidateKeys = Array.from(new Set([icaoKey, flightKey]));
    for (const key of candidateKeys) {
      try {
        const url = `https://api.adsbdb.com/v0/callsign/${encodeURIComponent(key)}`;
        console.log(`[FlightLookup] Querying ADS-B: ${url}`);
        const res = await fetch(url, {
          headers: { 'User-Agent': 'FlightSentry/0.8.5', Accept: 'application/json' },
          signal: AbortSignal.timeout(3500),
        });

        if (res.ok) {
          const data = await res.json();
          const route = data.response?.flightroute;
          const originIata = route?.origin?.iata_code?.toUpperCase();
          const midpointIata = route?.midpoint?.iata_code?.toUpperCase();
          const destIata = route?.destination?.iata_code?.toUpperCase();
          const airlineName = route?.airline?.name;

          if (originIata && destIata && originIata.length === 3 && destIata.length === 3) {
            if (midpointIata && midpointIata.length === 3) {
              found.push(
                ...expandStopSequence([originIata, midpointIata, destIata], airlineName, 'adsbdb')
              );
            } else {
              found.push({
                origin: originIata,
                destination: destIata,
                airlineName,
                source: 'adsbdb',
              });
            }
            break;
          }
        }
      } catch (err: any) {
        console.warn(`[FlightLookup] ADS-B lookup error for ${key}:`, err.message);
      }
    }
    return found;
  };

  // 3. adsb.lol Routeset API (returns multi-stop `_airports` array for scheduled callsigns)
  const fetchAdsbLolRoutes = async (): Promise<DetectedRouteCandidate[]> => {
    const found: DetectedRouteCandidate[] = [];
    try {
      const res = await fetch('https://api.adsb.lol/api/0/routeset', {
        method: 'POST',
        headers: {
          'User-Agent': 'FlightSentry/0.8.5',
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          planes: [{ callsign: icaoKey, lat: 0.1, lng: 0.1 }],
        }),
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const data = await res.json();
        const entries: any[] = Array.isArray(data) ? data : [];
        for (const entry of entries) {
          const airportsList: any[] = Array.isArray(entry?._airports) ? entry._airports : [];
          if (airportsList.length >= 2) {
            const iataStops = airportsList
              .map((ap: any) => String(ap?.iata || '').trim().toUpperCase())
              .filter((code: string) => code.length === 3);
            found.push(...expandStopSequence(iataStops, undefined, 'schedule_api'));
          }
        }
      }
    } catch (err: any) {
      console.warn(`[FlightLookup] adsb.lol routeset lookup error for ${icaoKey}:`, err.message);
    }
    return found;
  };

  // 4. Flightradar24 Live Search (supplements with any currently airborne legs)
  const fetchFr24LiveRoutes = async (): Promise<DetectedRouteCandidate[]> => {
    const found: DetectedRouteCandidate[] = [];
    try {
      const fr24Url = `https://www.flightradar24.com/v1/search/web/find?query=${encodeURIComponent(flightKey)}&limit=10`;
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
            const itemFlight = String(item.detail?.flight || '').trim().toUpperCase();
            if (itemFlight && itemFlight !== flightKey && itemFlight !== icaoKey) {
              continue;
            }
            const origin = String(item.detail.schd_from).toUpperCase();
            const destination = String(item.detail.schd_to).toUpperCase();
            found.push({
              origin,
              destination,
              airlineName: item.label?.split('-')?.[1]?.trim(),
              source: 'schedule_api',
            });
          }
        }
      }
    } catch (error: any) {
      console.warn(`[FlightLookup] Flightradar24 search error for ${flightKey}:`, error.message);
    }
    return found;
  };

  const [hexDbRoutes, adsbRoutes, adsbLolRoutes, fr24Routes] = await Promise.all([
    fetchHexDbRoutes(),
    fetchAdsbRoutes(),
    fetchAdsbLolRoutes(),
    fetchFr24LiveRoutes(),
  ]);

  hexDbRoutes.forEach(addCandidate);
  adsbRoutes.forEach(addCandidate);
  adsbLolRoutes.forEach(addCandidate);
  fr24Routes.forEach(addCandidate);

  if (candidates.length > 0) {
    const primary = candidates[0];
    console.log(
      `[FlightLookup] Resolved ${candidates.length} route(s) for ${flightKey}: ${candidates
        .map(c => `${c.origin} -> ${c.destination}`)
        .join(', ')}`
    );
    return {
      success: true,
      origin: primary.origin,
      destination: primary.destination,
      airlineName: primary.airlineName,
      airlineCode: cleanAirline,
      flightNumber: cleanFlightNumber,
      source: primary.source,
      routes: candidates,
    };
  }

  // 3. Zero-Quota Public Web Search Scraper (DuckDuckGo HTML)
  try {
    const dateQueryPart = departureDate ? ` ${departureDate}` : '';
    const ddgQuery = `flight ${cleanAirline} ${cleanFlightNumber}${dateQueryPart} route departure arrival`;
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
          addCandidate({ origin, destination, source: 'web_search' });
          if (candidates.length > 0) {
            console.log(`[FlightLookup] Resolved via search scraper: ${origin} -> ${destination}`);
            return {
              success: true,
              origin,
              destination,
              airlineCode: cleanAirline,
              flightNumber: cleanFlightNumber,
              source: 'web_search',
              routes: candidates,
            };
          }
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