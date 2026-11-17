import { Flight, RouteItinerary, RouteSegment, AdapterExecutionOptions } from '../types';
import { DataSourceResult } from './datasource';
import {
  normalizeAirlineCode,
  getAirlineName,
  cleanFlightNumber,
  expandAlliancesToAirlines,
} from '../utils/airline';
import { filterItinerariesBySearchPreferences } from '../utils/routeIntelligence';
import { resolveToAirportList } from '../utils/coLocations';
import { evaluateOpenFareScraperVersion } from '../utils/openFareScraperVersion';
import { parseFlightLegs, getLegUniqueCarriers, matchesTrackedFlightLegs } from '../utils/flightLegs';

export interface ScraperHealthResponse {
  status: 'ok' | 'rate_limited' | 'cooldown' | 'paused';
  state: 'ready' | 'rate_limited' | 'cooldown' | 'paused';
  version: string;
  apiVersion: string;
  paused: boolean;
  circuitBreakerActive: boolean;
  rateLimited: boolean;
  statusReason: string | null;
  retryAfter: string | null;
  queueDepth: number;
  usage: {
    hourlyUsed: number;
    hourlyLimit: number;
    dailyUsed: number;
    dailyLimit: number;
  };
}

export interface ScraperQueryRequest {
  origin: string | string[];
  destination: string | string[];
  departureDate: string;
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
  fareTier?: 'Basic' | 'Standard';
  currency?: string;
  maxStops?: number;
  airline?: string;
  flightNumber?: string;
  includedAirlines?: string[];
  excludedAirlines?: string[];
  includeRaw?: boolean;
}

export interface ScraperSegment {
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
}

export interface ScraperItinerary {
  airline: string;
  airlineName: string;
  flightNumber: string;
  origin: string;
  destination: string;
  price: number;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  durationMinutes: number;
  stops: number;
  isNonstop: boolean;
  layoverAirports: string[];
  maxLayoverMinutes?: number | null;
  legs?: ScraperSegment[];
}

export interface ScraperQueryResponse {
  status: 'Success' | 'SoldOut' | 'RateLimited' | 'Paused' | 'Error';
  provider: 'openfarescraper';
  currency: string;
  lowestPrice: number | null;
  itineraries: ScraperItinerary[];
  meta: {
    durationMs: number;
    source: 'structured' | 'dom' | 'none';
    queryUrl: string;
    itineraryCount: number;
    rawPayload?: string;
  };
  error?: string;
  retryAfter?: string;
}

export class ScraperHttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ScraperHttpError';
    this.statusCode = statusCode;
  }
}

export function redactScraperSecrets(value: string): string {
  return value
    .replace(/ofs_[a-fA-F0-9]+/g, 'ofs_[REDACTED]')
    .replace(/ofs_admin_session=[^;\s"']+/gi, 'ofs_admin_session=[REDACTED]');
}

function normalizeScraperBaseUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl.trim());
  if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.username || parsed.password) {
    throw new Error('Invalid OpenFareScraper URL: must use http or https without credentials');
  }
  return rawUrl.trim().replace(/\/+$/, '');
}

export async function checkScraperHealth(
  baseUrl: string,
  apiKey: string
): Promise<ScraperHealthResponse> {
  const normalizedBaseUrl = normalizeScraperBaseUrl(baseUrl);
  const cleanKey = apiKey.trim();

  let res: Response;
  try {
    res = await fetch(`${normalizedBaseUrl}/api/v1/health`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cleanKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
  } catch (err: any) {
    const rawMsg = err?.message || String(err);
    throw new Error(redactScraperSecrets(`Health check request failed: ${rawMsg}`));
  }

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    // Non-JSON response
  }

  if (!res.ok) {
    const detail = payload?.error || payload?.message || `HTTP ${res.status}`;
    throw new ScraperHttpError(
      res.status,
      redactScraperSecrets(`Health check failed (HTTP ${res.status}): ${detail}`)
    );
  }

  if (!payload || typeof payload !== 'object' || typeof payload.state !== 'string') {
    throw new Error('Invalid health telemetry response from OpenFareScraper');
  }

  return payload as ScraperHealthResponse;
}

export const checkOpenFareScraperPrice = async (
  flight: Flight,
  baseUrl?: string | null,
  apiKey?: string | null,
  currency: string = 'USD',
  options?: AdapterExecutionOptions
): Promise<DataSourceResult> => {
  const trimmedUrl = (baseUrl || '').trim();
  const trimmedKey = (apiKey || '').trim();

  if (!trimmedUrl || !trimmedKey) {
    console.error('[OpenFareScraper] Base URL or API key is missing or not configured.');
    return {
      price: null,
      status: 'Error',
      errorMessage: 'OpenFareScraper URL or API key is missing or not configured.',
    };
  }

  if (!flight.origin || !flight.destination) {
    console.error(
      `[OpenFareScraper] Validation failed: Origin and Destination are required. (Flight ID: ${flight.id})`
    );
    return {
      price: null,
      status: 'Error',
      errorMessage: 'Origin and Destination are required.',
    };
  }

  let normalizedBaseUrl: string;
  try {
    normalizedBaseUrl = normalizeScraperBaseUrl(trimmedUrl);
  } catch (urlErr: any) {
    return {
      price: null,
      status: 'Error',
      errorMessage: redactScraperSecrets(urlErr?.message || 'Invalid OpenFareScraper URL'),
    };
  }

  // 1. Pre-flight health, version & quota gate (5,000 ms timeout)
  let health: ScraperHealthResponse;
  try {
    health = await checkScraperHealth(normalizedBaseUrl, trimmedKey);
  } catch (healthErr: any) {
    const safeMsg = redactScraperSecrets(healthErr?.message || 'OpenFareScraper health check failed');
    console.warn(`[OpenFareScraper] Pre-flight health check failed: ${safeMsg}`);
    return {
      price: null,
      status: 'Error',
      errorMessage: safeMsg,
    };
  }

  const versionEval = evaluateOpenFareScraperVersion(health.version);
  if (versionEval.isBlocked) {
    const blockMsg =
      versionEval.message ||
      `OpenFareScraper version is below minimum required v${versionEval.minVersion}.`;
    console.error(`[OpenFareScraper] Blocking scrape due to unsupported version: ${blockMsg}`);
    return {
      price: null,
      status: 'Error',
      errorMessage: blockMsg,
    };
  }

  if (versionEval.status === 'outdated' && versionEval.message) {
    console.warn(`[OpenFareScraper] ${versionEval.message}`);
  }

  if (health.paused === true || health.state === 'paused' || health.status === 'paused') {
    const reason = health.statusReason
      ? `OpenFareScraper is paused: ${redactScraperSecrets(health.statusReason)}`
      : 'OpenFareScraper is globally paused';
    console.log(`[OpenFareScraper] Skipping scrape because remote service is paused.`);
    return {
      price: null,
      status: 'Paused',
      errorMessage: reason,
    };
  }

  if (
    health.circuitBreakerActive === true ||
    health.state === 'cooldown' ||
    health.status === 'cooldown'
  ) {
    const reasonSuffix = health.statusReason ? `: ${redactScraperSecrets(health.statusReason)}` : '';
    const retrySuffix = health.retryAfter ? ` (retry after ${health.retryAfter})` : '';
    return {
      price: null,
      status: 'RateLimited',
      errorMessage: `OpenFareScraper cooldown active${reasonSuffix}${retrySuffix}`,
    };
  }

  const hourlyExhausted =
    typeof health.usage?.hourlyLimit === 'number' &&
    health.usage.hourlyLimit > 0 &&
    health.usage.hourlyUsed >= health.usage.hourlyLimit;
  const dailyExhausted =
    typeof health.usage?.dailyLimit === 'number' &&
    health.usage.dailyLimit > 0 &&
    health.usage.dailyUsed >= health.usage.dailyLimit;

  if (
    health.rateLimited === true ||
    health.state === 'rate_limited' ||
    health.status === 'rate_limited' ||
    hourlyExhausted ||
    dailyExhausted
  ) {
    const reasonSuffix = health.statusReason ? `: ${redactScraperSecrets(health.statusReason)}` : '';
    const retrySuffix = health.retryAfter ? ` (retry after ${health.retryAfter})` : '';
    return {
      price: null,
      status: 'RateLimited',
      errorMessage: `OpenFareScraper rate limit / rolling quota reached${reasonSuffix}${retrySuffix}`,
    };
  }

  // 2. Build /api/v1/scrape request payload
  const origins = resolveToAirportList(flight.origin).slice(0, 8);
  const destinations = resolveToAirportList(flight.destination).slice(0, 8);

  if (origins.length === 0 || destinations.length === 0) {
    return {
      price: null,
      status: 'Error',
      errorMessage: 'Unable to resolve valid IATA airport codes for origin or destination.',
    };
  }

  const activeCurrency = (currency || flight.currency || 'USD').trim().toUpperCase();
  const payload: ScraperQueryRequest = {
    origin: origins,
    destination: destinations,
    departureDate: flight.departureDate,
    cabinClass: flight.cabinClass || 'economy',
    fareTier: flight.fareTier === 'Basic Economy' ? 'Basic' : 'Standard',
    currency: activeCurrency,
    includeRaw: Boolean(options?.onRawPayload),
  };

  if (flight.searchMode === 'Route') {
    if (flight.maxStops !== undefined && flight.maxStops !== null && flight.maxStops > 0 && flight.maxStops <= 2) {
      payload.maxStops = flight.maxStops;
    }

    const includeSet = new Set<string>([
      ...expandAlliancesToAirlines(flight.includedAirlines),
      ...expandAlliancesToAirlines(flight.includedAlliances),
    ]);
    if (flight.airline && flight.airline.toUpperCase() !== 'ALL') {
      const normalizedTarget = normalizeAirlineCode(flight.airline);
      if (normalizedTarget && normalizedTarget !== 'UN') {
        includeSet.add(normalizedTarget);
      }
    }
    if (includeSet.size > 0) {
      payload.includedAirlines = Array.from(includeSet);
    }

    const excludeSet = new Set<string>([
      ...expandAlliancesToAirlines(flight.excludedAirlines),
      ...expandAlliancesToAirlines(flight.excludedAlliances),
    ]);
    if (excludeSet.size > 0) {
      payload.excludedAirlines = Array.from(excludeSet);
    }
  } else if (flight.searchMode === 'FlightNumber' && flight.monitorRouteAlternatives !== 1) {
    const trackedLegs = parseFlightLegs(flight.legs);
    if (trackedLegs.length >= 2) {
      const legCarriers = getLegUniqueCarriers(trackedLegs);
      if (legCarriers.length > 0) {
        payload.includedAirlines = legCarriers;
      }
    } else {
      const targetCode = flight.airline
        ? normalizeAirlineCode(flight.airline, flight.flightNumber || undefined)
        : '';
      if (targetCode && targetCode !== 'UN') {
        payload.airline = targetCode;
      }
      if (flight.flightNumber) {
        const cleanedNum = cleanFlightNumber(flight.flightNumber, targetCode || undefined);
        if (cleanedNum) {
          payload.flightNumber = cleanedNum;
        }
      }
    }
  }

  // 3. Execute POST /api/v1/scrape (90,000 ms timeout)
  console.log(
    `[OpenFareScraper] Querying [${origins.join(',')}] -> [${destinations.join(',')}] on ${flight.departureDate}`
  );

  let res: Response;
  try {
    res = await fetch(`${normalizedBaseUrl}/api/v1/scrape`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${trimmedKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(90_000),
    });
  } catch (err: any) {
    const safeMsg = redactScraperSecrets(err?.message || String(err));
    console.error(`[OpenFareScraper] Scrape request exception: ${safeMsg}`);
    return {
      price: null,
      status: 'Error',
      errorMessage: `OpenFareScraper request failed: ${safeMsg}`,
    };
  }

  let body: ScraperQueryResponse | null = null;
  try {
    body = (await res.json()) as ScraperQueryResponse;
    if (body) {
      options?.onRawPayload?.(body);
    }
  } catch {
    // Non-JSON upstream error
  }

  // Handle HTTP 503 / Paused cleanly without tripping circuit breaker
  if (res.status === 503 || body?.status === 'Paused') {
    const safeMsg = redactScraperSecrets(
      body?.error || 'OpenFareScraper is globally paused (HTTP 503)'
    );
    return {
      price: null,
      status: 'Paused',
      errorMessage: safeMsg,
    };
  }

  // Handle HTTP 429 / RateLimited cleanly without tripping FlightSentry's global circuit breaker
  if (res.status === 429 || body?.status === 'RateLimited') {
    const retryAfter = body?.retryAfter || res.headers.get('Retry-After');
    const baseMsg = redactScraperSecrets(
      body?.error || 'OpenFareScraper rate limit or cooldown active (HTTP 429)'
    );
    const retrySuffix = retryAfter && !baseMsg.includes(retryAfter) ? ` (retry after ${retryAfter})` : '';
    return {
      price: null,
      status: 'RateLimited',
      errorMessage: `${baseMsg}${retrySuffix}`,
    };
  }

  if (!res.ok || body?.status === 'Error') {
    const safeMsg = redactScraperSecrets(
      body?.error || `OpenFareScraper HTTP ${res.status}`
    );
    console.error(`[OpenFareScraper] Error response: ${safeMsg}`);
    return {
      price: null,
      status: 'Error',
      errorMessage: safeMsg,
    };
  }

  const rawItineraries = Array.isArray(body?.itineraries) ? body.itineraries : [];
  console.log(`[OpenFareScraper] Returned ${rawItineraries.length} itineraries`);

  if (body?.status === 'SoldOut' || rawItineraries.length === 0) {
    return {
      price: null,
      status: 'SoldOut',
      errorMessage: redactScraperSecrets(
        body?.error || 'OpenFareScraper returned 0 matching flight itineraries for this route and date'
      ),
    };
  }

  // 4. Map ScraperItinerary[] to RouteItinerary[] preserving maxLayoverMinutes and legs
  const parsedItineraries: RouteItinerary[] = rawItineraries
    .filter((it) => typeof it.price === 'number' && it.price > 0)
    .map((it): RouteItinerary => {
      const code = normalizeAirlineCode(it.airline || it.airlineName || '', it.flightNumber);
      const resolvedCode = code !== 'UN' ? code : (it.airline || 'UN').trim().toUpperCase();
      const flightNum = cleanFlightNumber(it.flightNumber || '', resolvedCode);
      const stops =
        typeof it.stops === 'number' ? it.stops : Math.max(0, (it.legs?.length || 1) - 1);

      const mappedLegs: RouteSegment[] | undefined = Array.isArray(it.legs)
        ? it.legs.map((leg) => {
            const legCode = normalizeAirlineCode(leg.airline || '', leg.flightNumber);
            const resolvedLegCode =
              legCode !== 'UN' ? legCode : (leg.airline || '').trim().toUpperCase();
            return {
              airline: resolvedLegCode,
              flightNumber:
                cleanFlightNumber(leg.flightNumber || '', resolvedLegCode) ||
                (leg.flightNumber || '').trim(),
              origin: (leg.origin || '').trim().toUpperCase(),
              destination: (leg.destination || '').trim().toUpperCase(),
              departureTime: leg.departureTime,
              arrivalTime: leg.arrivalTime,
              durationMinutes: leg.durationMinutes,
            };
          })
        : undefined;

      const durationMins =
        typeof it.durationMinutes === 'number' ? it.durationMinutes : undefined;

      return {
        airline: resolvedCode,
        airlineName: (it.airlineName || '').trim() || getAirlineName(resolvedCode),
        flightNumber: flightNum || undefined,
        origin: it.origin ? it.origin.trim().toUpperCase() : undefined,
        destination: it.destination ? it.destination.trim().toUpperCase() : undefined,
        price: it.price,
        departureTime: it.departureTime,
        arrivalTime: it.arrivalTime,
        duration:
          it.duration ||
          (durationMins !== undefined
            ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`
            : undefined),
        durationMinutes: durationMins,
        stops,
        isNonstop: typeof it.isNonstop === 'boolean' ? it.isNonstop : stops === 0,
        layoverAirports:
          Array.isArray(it.layoverAirports) && it.layoverAirports.length > 0
            ? it.layoverAirports
                .map((c) => c.trim().toUpperCase())
                .filter((c) => c.length === 3)
            : undefined,
        maxLayoverMinutes: it.maxLayoverMinutes ?? null,
        legs: mappedLegs,
      };
    });

  // 5. Specific Flight Number (or Multi-Leg Layover Itinerary) matching across top-level flightNumber and legs[]
  const trackedLegs = parseFlightLegs(flight.legs);
  if (flight.searchMode === 'FlightNumber' && (flight.flightNumber || trackedLegs.length >= 2)) {
    const targetCode = normalizeAirlineCode(flight.airline || '', flight.flightNumber || undefined);
    const targetNum = cleanFlightNumber(flight.flightNumber || '', targetCode);

    const sortedByPrice = [...parsedItineraries].sort((a, b) => a.price - b.price);
    const targetItinerary = sortedByPrice.find((it) => {
      if (trackedLegs.length >= 2) {
        if (!Array.isArray(it.legs) || it.legs.length !== trackedLegs.length) {
          return false;
        }
        return matchesTrackedFlightLegs(it.legs, trackedLegs);
      }

      const topMatchesAirline = targetCode && targetCode !== 'UN' ? it.airline === targetCode : true;
      const topMatchesNum = Boolean(it.flightNumber) && it.flightNumber === targetNum;
      if (topMatchesAirline && topMatchesNum) {
        return true;
      }

      if (Array.isArray(it.legs) && it.legs.length > 0) {
        return it.legs.some((leg) => {
          const legCode = normalizeAirlineCode(leg.airline || '', leg.flightNumber);
          const legNum = cleanFlightNumber(leg.flightNumber || '', legCode);
          const legMatchesAirline =
            targetCode && targetCode !== 'UN' ? legCode === targetCode : true;
          return legMatchesAirline && legNum === targetNum;
        });
      }

      return false;
    });

    if (targetItinerary && targetItinerary.price > 0) {
      let alternatives: RouteItinerary[] | undefined = undefined;
      if (flight.monitorRouteAlternatives === 1) {
        const metadataPreferences = flight.maxStops === 0 ? { ...flight, maxStops: null } : flight;
        alternatives = filterItinerariesBySearchPreferences(parsedItineraries, metadataPreferences);
        if (flight.includedAirlines) {
          const included = expandAlliancesToAirlines(flight.includedAirlines);
          alternatives = alternatives.filter((it) => included.includes(it.airline));
        }
        if (flight.excludedAirlines) {
          const excluded = expandAlliancesToAirlines(flight.excludedAirlines);
          alternatives = alternatives.filter((it) => !excluded.includes(it.airline));
        }
      }
      return {
        price: targetItinerary.price,
        status: 'Success',
        leadingAirline: targetCode && targetCode !== 'UN' ? targetCode : targetItinerary.airline,
        leadingFlightNumber: flight.flightNumber,
        itineraries: alternatives,
      };
    }

    const legSummary = trackedLegs.length >= 2
      ? trackedLegs.map((l) => `${l.airline} ${l.flightNumber} (${l.origin}->${l.destination})`).join(' + ')
      : `${targetCode} ${targetNum}`;
    return {
      price: null,
      status: 'SoldOut',
      errorMessage: `OpenFareScraper returned ${parsedItineraries.length} itineraries, but flight ${legSummary} was not found`,
    };
  }

  // 6. Route Mode: apply carrier filters and search preferences
  let candidates: RouteItinerary[] = parsedItineraries;
  if (flight.airline && flight.airline.toUpperCase() !== 'ALL') {
    const targetCode = normalizeAirlineCode(flight.airline);
    const target = flight.airline.toLowerCase();
    candidates = candidates.filter(
      (it) =>
        it.airline === targetCode ||
        it.airline.toLowerCase() === target ||
        (it.airlineName?.toLowerCase().includes(target) ?? false)
    );
  }
  if (flight.includedAirlines) {
    const included = expandAlliancesToAirlines(flight.includedAirlines);
    candidates = candidates.filter((it) => included.includes(it.airline));
  }
  if (flight.excludedAirlines) {
    const excluded = expandAlliancesToAirlines(flight.excludedAirlines);
    candidates = candidates.filter((it) => !excluded.includes(it.airline));
  }

  candidates = filterItinerariesBySearchPreferences(candidates, flight);
  const metadataPreferences = flight.maxStops === 0 ? { ...flight, maxStops: null } : flight;
  const eligibleItineraries = filterItinerariesBySearchPreferences(parsedItineraries, metadataPreferences);

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

  return {
    price: null,
    status: 'SoldOut',
    errorMessage: `OpenFareScraper returned ${parsedItineraries.length} priced itineraries, but 0 matched filters`,
  };
};