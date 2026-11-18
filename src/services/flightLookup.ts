import packageInfo from '../../package.json';
import { normalizeAirlineCode, isValidAirlineCode, getIcaoAirlineCode } from '../utils/airline';
import { isMetroCode } from '../utils/coLocations';

const USER_AGENT = `FlightSentry/${packageInfo.version}`;

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

const NON_AIRPORT_TOKENS = new Set([
  'THE', 'AND', 'FOR', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT',
  'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'ITS', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE',
  'TWO', 'WAY', 'WHO', 'DID', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'FLY', 'AIR',
  'JET', 'NON', 'VIA', 'UTC', 'GMT', 'EST', 'PST', 'CST', 'MST', 'EDT', 'PDT', 'CDT',
  'MDT', 'API', 'APP', 'WEB', 'COM', 'ORG', 'NET', 'GOV', 'EDU', 'PDF', 'XML', 'CSS',
  'DIV', 'IMG', 'URL', 'FAQ', 'MAP', 'TOP', 'END', 'MIN', 'MAX', 'AVG', 'PER', 'HRS',
  'SEC', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'JAN', 'FEB', 'MAR', 'APR',
  'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'ETA', 'ETD', 'STD', 'STA', 'ATD',
  'ATA', 'PNR', 'PAX', 'USA', 'USD', 'EUR', 'GBP', 'CAD', 'AUD',
]);

function normalizeFlightDesignator(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, '');
  const match = cleaned.match(/^([A-Z0-9]{2,3})0*(\d+)$/);
  if (match) {
    return `${match[1]}${match[2]}`;
  }
  return cleaned;
}

export const lookupFlightRoute = async (
  airline: string,
  flightNumber: string,
  departureDate?: string | null
): Promise<RouteLookupResult> => {
  const normalizedCarrier = normalizeAirlineCode(airline, flightNumber);
  const cleanAirline =
    normalizedCarrier !== 'UN' && isValidAirlineCode(normalizedCarrier)
      ? normalizedCarrier
      : airline.trim().toUpperCase();
  const rawDigits = flightNumber.trim().replace(/\D/g, '');
  const cleanFlightNumber = rawDigits.replace(/^0+(?=\d)/, '') || rawDigits;
  const flightKey = `${cleanAirline}${cleanFlightNumber}`;
  const icaoCode = getIcaoAirlineCode(cleanAirline);
  const icaoKey = `${icaoCode}${cleanFlightNumber}`;

  console.log(`[FlightLookup] Zero-quota route detection started: Key="${flightKey}", ICAO="${icaoKey}"`);

  const candidates: DetectedRouteCandidate[] = [];
  const addCandidate = (candidate: DetectedRouteCandidate) => {
    const origin = candidate.origin.trim().toUpperCase();
    const destination = candidate.destination.trim().toUpperCase();
    if (
      !/^[A-Z]{3}$/.test(origin) ||
      !/^[A-Z]{3}$/.test(destination) ||
      origin === destination ||
      isMetroCode(origin) ||
      isMetroCode(destination) ||
      NON_AIRPORT_TOKENS.has(origin) ||
      NON_AIRPORT_TOKENS.has(destination)
    ) {
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
          headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
          signal: AbortSignal.timeout(4000),
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
          headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
          signal: AbortSignal.timeout(4000),
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

  // 3. Flightradar24 Schedule & Live Search (matches IATA and ICAO designators)
  const fetchFr24LiveRoutes = async (): Promise<DetectedRouteCandidate[]> => {
    const found: DetectedRouteCandidate[] = [];
    const expectedKeys = new Set([
      normalizeFlightDesignator(flightKey),
      normalizeFlightDesignator(icaoKey),
    ]);
    try {
      const fr24Url = `https://www.flightradar24.com/v1/search/web/find?query=${encodeURIComponent(flightKey)}&limit=15`;
      const res = await fetch(fr24Url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data = await res.json();
        const results: any[] = Array.isArray(data?.results) ? data.results : [];
        for (const item of results) {
          if (item?.detail?.schd_from && item?.detail?.schd_to) {
            const candidateDesignators = [
              item.detail?.flight,
              item.detail?.callsign,
              item.id,
            ]
              .filter(Boolean)
              .map((val: unknown) => normalizeFlightDesignator(String(val)));

            const matchesDesignator =
              candidateDesignators.length === 0 ||
              candidateDesignators.some(d => expectedKeys.has(d));

            if (!matchesDesignator) {
              continue;
            }

            const origin = String(item.detail.schd_from).trim().toUpperCase();
            const destination = String(item.detail.schd_to).trim().toUpperCase();
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

  const [hexDbRoutes, adsbRoutes, fr24Routes] = await Promise.all([
    fetchHexDbRoutes(),
    fetchAdsbRoutes(),
    fetchFr24LiveRoutes(),
  ]);

  hexDbRoutes.forEach(addCandidate);
  adsbRoutes.forEach(addCandidate);
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

  // 4. Zero-Quota Public Web Search Scraper (DuckDuckGo HTML, strictly uppercase IATA pairs)
  try {
    const dateQueryPart = departureDate ? ` ${departureDate}` : '';
    const ddgQuery = `"${cleanAirline} ${cleanFlightNumber}" OR "${flightKey}"${dateQueryPart} flight route`;
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(ddgQuery)}`;
    console.log(`[FlightLookup] Querying DuckDuckGo HTML: ${ddgUrl}`);
    const ddgRes = await fetch(ddgUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (ddgRes.ok) {
      const html = await ddgRes.text();
      const plainText = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&rarr;|&#8594;|&#x2192;/gi, ' → ')
        .replace(/&ndash;|&#8211;|&mdash;|&#8212;/gi, ' - ')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ');

      const flightContextRegex = new RegExp(
        `\\b(?:${cleanAirline}\\s*0*${cleanFlightNumber}|${icaoCode}\\s*0*${cleanFlightNumber})\\b`,
        'i'
      );

      const patterns = [
        /\(([A-Z]{3})\)\s*(?:to|→|-)\s*\(([A-Z]{3})\)/g,
        /\bfrom\s+([A-Z]{3})\s+to\s+([A-Z]{3})\b/g,
        /\b([A-Z]{3})\s*(?:→|-)\s*([A-Z]{3})\b/g,
      ];

      for (const pattern of patterns) {
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(plainText)) !== null) {
          const origin = match[1].toUpperCase();
          const destination = match[2].toUpperCase();
          if (origin === destination) continue;
          const windowStart = Math.max(0, match.index - 140);
          const windowEnd = Math.min(plainText.length, match.index + match[0].length + 140);
          const surrounding = plainText.slice(windowStart, windowEnd);
          if (!flightContextRegex.test(surrounding)) {
            continue;
          }
          addCandidate({ origin, destination, source: 'web_search' });
        }
        if (candidates.length > 0) {
          const primary = candidates[0];
          console.log(
            `[FlightLookup] Resolved via search scraper: ${candidates
              .map(c => `${c.origin} -> ${c.destination}`)
              .join(', ')}`
          );
          return {
            success: true,
            origin: primary.origin,
            destination: primary.destination,
            airlineCode: cleanAirline,
            flightNumber: cleanFlightNumber,
            source: 'web_search',
            routes: candidates,
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