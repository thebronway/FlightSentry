import { Flight, RouteItinerary, CheckResultStatus, Settings } from '@/types';
import { settingsDb } from '@/db/settings';
import { logsDb } from '@/db/logs';
import { checkAndResetQuota } from './quota';
import { DataSourceProvider, DataSourceResult } from './datasource';
import { checkFlightPrice as querySerpApi } from './serpapi';
import { checkSearchApiPrice as querySearchApi } from './searchapi';
import {
  checkFlightSentryScraperPrice as queryFlightSentryScraper,
  redactScraperSecrets,
} from './flightsentryScraper';
import { DevProviderTestInput } from '@/utils/validation';
import { normalizeAirlineCode, cleanFlightNumber } from '@/utils/airline';
import { evaluateProviderParity, ProviderParityReport } from './providerParity';

export interface DevProviderTestItemResult {
  provider: DataSourceProvider;
  label: string;
  status: CheckResultStatus;
  credentialSource: 'saved' | 'temporary';
  quotaIncremented: boolean;
  durationMs: number;
  lowestPrice: number | null;
  leadingAirline: string | null;
  leadingFlightNumber: string | null;
  parsedFlightCount: number;
  itineraries: RouteItinerary[];
  errorMessage: string | null;
  rawPayload: unknown;
}

export interface DevProviderTestResponse {
  executedAt: string;
  currency: string;
  query: {
    origin: string;
    destination: string;
    departureDate: string;
    cabinClass: Flight['cabinClass'];
    fareTier: Flight['fareTier'];
    airline: string | null;
    flightNumber: string | null;
    searchMode: Flight['searchMode'];
  };
  results: DevProviderTestItemResult[];
  parity: ProviderParityReport;
}

const PROVIDER_LABELS: Record<DataSourceProvider, string> = {
  serpapi: 'SerpAPI',
  searchapi: 'SearchApi.io',
  'flightsentry-scraper': 'FlightSentry-Scraper',
};

const SENSITIVE_KEY_PATTERN = /api[_-]?key|token|secret|authorization|password/i;

function scrubStringSecrets(value: string, secretValues: string[]): string {
  let scrubbed = redactScraperSecrets(value);
  scrubbed = scrubbed.replace(/([?&](?:api_key|apikey|token|key)=)[^&\s"']+/gi, '$1[REDACTED]');
  scrubbed = scrubbed.replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED]');

  for (const secret of secretValues) {
    if (secret && secret.length >= 6 && scrubbed.includes(secret)) {
      scrubbed = scrubbed.split(secret).join('[REDACTED]');
    }
  }
  return scrubbed;
}

export function redactSecretsFromUnknown(
  payload: unknown,
  secretValues: string[],
  depth: number = 0
): unknown {
  if (depth > 25 || payload === null || payload === undefined) {
    return payload;
  }

  if (typeof payload === 'string') {
    return scrubStringSecrets(payload, secretValues);
  }

  if (typeof payload === 'number' || typeof payload === 'boolean') {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => redactSecretsFromUnknown(item, secretValues, depth + 1));
  }

  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(record)) {
      if (SENSITIVE_KEY_PATTERN.test(key) && typeof val === 'string' && val.trim().length > 0) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = redactSecretsFromUnknown(val, secretValues, depth + 1);
      }
    }
    return sanitized;
  }

  return String(payload);
}

function resolveNormalizedQuery(input: DevProviderTestInput): {
  airline: string | null;
  flightNumber: string | null;
  searchMode: Flight['searchMode'];
  hasCarrierFilter: boolean;
} {
  const rawAirline = (input.airline || '').trim();
  const rawFlightNum = (input.flightNumber || '').trim();

  let resolvedAirline = '';
  if (rawAirline && rawAirline.toUpperCase() !== 'ALL') {
    const code = normalizeAirlineCode(rawAirline, rawFlightNum || undefined);
    resolvedAirline = code && code !== 'UN' ? code : rawAirline.toUpperCase();
  } else if (rawFlightNum) {
    const extracted = normalizeAirlineCode('', rawFlightNum);
    if (extracted && extracted !== 'UN') {
      resolvedAirline = extracted;
    }
  }

  const cleanedFlightNum = rawFlightNum
    ? cleanFlightNumber(rawFlightNum, resolvedAirline || undefined)
    : '';

  if (cleanedFlightNum && resolvedAirline) {
    return {
      airline: resolvedAirline,
      flightNumber: cleanedFlightNum,
      searchMode: 'FlightNumber',
      hasCarrierFilter: true,
    };
  }

  if (cleanedFlightNum && !resolvedAirline) {
    return {
      airline: null,
      flightNumber: cleanedFlightNum,
      searchMode: 'Route',
      hasCarrierFilter: false,
    };
  }

  return {
    airline: resolvedAirline || null,
    flightNumber: null,
    searchMode: 'Route',
    hasCarrierFilter: Boolean(resolvedAirline),
  };
}

function buildSyntheticFlight(
  input: DevProviderTestInput,
  normalizedQuery: ReturnType<typeof resolveNormalizedQuery>,
  currency: string
): Flight {
  const nowIso = new Date().toISOString();
  return {
    id: 0,
    searchMode: normalizedQuery.searchMode,
    origin: input.origin,
    destination: input.destination,
    departureDate: input.departureDate,
    airline: normalizedQuery.airline || 'ALL',
    flightNumber:
      normalizedQuery.searchMode === 'FlightNumber' ? normalizedQuery.flightNumber : null,
    includedAirlines: null,
    excludedAirlines: null,
    pnr: null,
    fareTier: input.fareTier,
    cabinClass: input.cabinClass,
    baselinePrice: 1,
    purchasePrice: null,
    originalPurchasePrice: null,
    targetPrice: null,
    currentPrice: 1,
    minDropDollar: null,
    minDropPercent: null,
    notes: null,
    scheduleOverride: null,
    disableNotifications: 1,
    nextCheckAt: nowIso,
    status: 'Watching',
    createdAt: nowIso,
    updatedAt: nowIso,
    allTimeLow: null,
    allTimeHigh: null,
    latestMetadata: null,
    earliestDeparture: null,
    latestDeparture: null,
    noRedeye: 0,
    priceTrackingDirection: 'drop',
    minIncreaseDollar: null,
    minIncreasePercent: null,
    maxStops: null,
    currency,
    monitorRouteAlternatives: normalizedQuery.searchMode === 'FlightNumber' ? 1 : 0,
    bookingDate: null,
    isManual: 0,
    maxLayoverMinutes: null,
    excludedConnectingAirports: null,
    maxTotalDurationMinutes: null,
    includedAlliances: null,
    excludedAlliances: null,
  };
}

interface ResolvedCredentials {
  credentialSource: 'saved' | 'temporary';
  apiKey: string;
  scraperUrl?: string;
  missingReason?: string;
}

function resolveProviderCredentials(
  provider: DataSourceProvider,
  stored: Settings,
  overrides: DevProviderTestInput['overrides']
): ResolvedCredentials {
  if (provider === 'flightsentry-scraper') {
    const tempKey = (overrides?.['flightsentry-scraper']?.apiKey || '').trim();
    const tempUrl = (overrides?.['flightsentry-scraper']?.scraperUrl || '').trim();
    const hasTempOverride = Boolean(tempKey || tempUrl);

    const effectiveKey = tempKey || (stored.flightsentryScraperApiKey || '').trim();
    const effectiveUrl = tempUrl || (stored.flightsentryScraperUrl || '').trim();

    if (!effectiveUrl || !effectiveKey) {
      return {
        credentialSource: hasTempOverride ? 'temporary' : 'saved',
        apiKey: effectiveKey,
        scraperUrl: effectiveUrl,
        missingReason: hasTempOverride
          ? 'Both Scraper Base URL and Scraper API Key are required (provide both in overrides or save the missing value in Settings).'
          : 'No saved FlightSentry-Scraper URL or API key configured in Settings.',
      };
    }

    return {
      credentialSource: hasTempOverride ? 'temporary' : 'saved',
      apiKey: effectiveKey,
      scraperUrl: effectiveUrl,
    };
  }

  const tempApiKey = (overrides?.[provider]?.apiKey || '').trim();
  if (tempApiKey) {
    return {
      credentialSource: 'temporary',
      apiKey: tempApiKey,
    };
  }

  const savedMap: Record<'serpapi' | 'searchapi', string> = {
    serpapi: (stored.serpApiKey || '').trim(),
    searchapi: (stored.searchApiKey || '').trim(),
  };

  const savedKey = savedMap[provider];
  if (!savedKey) {
    return {
      credentialSource: 'saved',
      apiKey: '',
      missingReason: `No saved API key configured in Settings for ${PROVIDER_LABELS[provider]}.`,
    };
  }

  return {
    credentialSource: 'saved',
    apiKey: savedKey,
  };
}

export async function runDevProviderComparison(
  input: DevProviderTestInput
): Promise<DevProviderTestResponse> {
  const initialSettings = settingsDb.get();
  const settings = checkAndResetQuota(initialSettings);
  const currency = (settings.currency || 'USD').trim().toUpperCase();
  const normalizedQuery = resolveNormalizedQuery(input);
  const syntheticFlight = buildSyntheticFlight(input, normalizedQuery, currency);

  // Collect all active secret values (stored + temporary) for guaranteed output scrubbing
  const secretPool = [
    settings.serpApiKey || '',
    settings.searchApiKey || '',
    settings.flightsentryScraperApiKey || '',
    input.overrides?.serpapi?.apiKey || '',
    input.overrides?.searchapi?.apiKey || '',
    input.overrides?.['flightsentry-scraper']?.apiKey || '',
  ]
    .map((s) => s.trim())
    .filter((s) => s.length >= 6);

  const results = await Promise.all(
    input.providers.map(async (provider): Promise<DevProviderTestItemResult> => {
      const label = PROVIDER_LABELS[provider];
      const creds = resolveProviderCredentials(provider, settings, input.overrides);

      if (creds.missingReason) {
        return {
          provider,
          label,
          status: 'Error',
          credentialSource: creds.credentialSource,
          quotaIncremented: false,
          durationMs: 0,
          lowestPrice: null,
          leadingAirline: null,
          leadingFlightNumber: null,
          parsedFlightCount: 0,
          itineraries: [],
          errorMessage: creds.missingReason,
          rawPayload: null,
        };
      }

      let capturedRaw: unknown = null;
      const adapterOptions = {
        onRawPayload: (raw: unknown) => {
          capturedRaw = raw;
        },
      };

      const startTime = Date.now();
      let adapterResult: DataSourceResult;

      try {
        if (provider === 'serpapi') {
          adapterResult = await querySerpApi(
            syntheticFlight,
            creds.apiKey,
            currency,
            adapterOptions
          );
        } else if (provider === 'searchapi') {
          adapterResult = await querySearchApi(
            syntheticFlight,
            creds.apiKey,
            currency,
            adapterOptions
          );
        } else {
          adapterResult = await queryFlightSentryScraper(
            syntheticFlight,
            creds.scraperUrl,
            creds.apiKey,
            currency,
            adapterOptions
          );
        }
      } catch (err: any) {
        adapterResult = {
          price: null,
          status: 'Error',
          errorMessage: err?.message || `Unhandled exception testing ${label}`,
        };
      }

      const durationMs = Date.now() - startTime;

      // Increment saved key quota counter only when using saved SQLite credentials
      let quotaIncremented = false;
      const shouldCountUsage =
        creds.credentialSource === 'saved' &&
        adapterResult.status !== 'Error' &&
        adapterResult.status !== 'Paused' &&
        !(provider === 'flightsentry-scraper' && adapterResult.status === 'RateLimited');

      if (shouldCountUsage) {
        settingsDb.incrementApiUsage(provider);
        quotaIncremented = true;
      }

      // Normalize itinerary list for parity inspection
      let itineraries: RouteItinerary[] = Array.isArray(adapterResult.itineraries)
        ? [...adapterResult.itineraries]
        : [];

      // When a specific flight number was requested, focus itineraries on matching flight(s)
      if (normalizedQuery.flightNumber) {
        const targetNum = normalizedQuery.flightNumber;
        const targetAirline = normalizedQuery.airline;

        const matchingItins = itineraries.filter((it) => {
          const itNum = cleanFlightNumber(it.flightNumber || '', it.airline);
          const numMatches = itNum === targetNum;
          const airlineMatches = targetAirline ? it.airline === targetAirline : true;
          return numMatches && airlineMatches;
        });

        if (matchingItins.length > 0) {
          itineraries = matchingItins;
        } else if (
          adapterResult.status === 'Success' &&
          adapterResult.price !== null &&
          adapterResult.price > 0
        ) {
          itineraries = [
            {
              airline: adapterResult.leadingAirline || targetAirline || 'UN',
              flightNumber: targetNum,
              origin: input.origin,
              destination: input.destination,
              price: adapterResult.price,
            },
          ];
        } else if (
          normalizedQuery.searchMode === 'Route' &&
          adapterResult.status === 'Success'
        ) {
          // Bare flightNumber without carrier was requested, and 0 route itineraries matched
          adapterResult = {
            price: null,
            status: 'SoldOut',
            errorMessage: `${label} returned ${itineraries.length} itineraries, but flight #${targetNum} was not found`,
          };
          itineraries = [];
        }
      }

      itineraries.sort((a, b) => a.price - b.price);

      const lowestPrice =
        adapterResult.status === 'Success' && adapterResult.price !== null
          ? adapterResult.price
          : itineraries.length > 0
          ? itineraries[0].price
          : null;

      const safeError = adapterResult.errorMessage
        ? scrubStringSecrets(adapterResult.errorMessage, secretPool)
        : null;
      const safeRawPayload = redactSecretsFromUnknown(capturedRaw, secretPool);

      // Record diagnostic audit log entry
      try {
        const statusCode =
          adapterResult.status === 'Success' || adapterResult.status === 'SoldOut'
            ? 200
            : adapterResult.status === 'RateLimited'
            ? 429
            : adapterResult.status === 'Paused'
            ? 503
            : 500;

        const flightLabel =
          normalizedQuery.airline && normalizedQuery.flightNumber
            ? `${normalizedQuery.airline} ${normalizedQuery.flightNumber}`
            : normalizedQuery.flightNumber
            ? `#${normalizedQuery.flightNumber}`
            : normalizedQuery.airline || null;

        const modeTag =
          creds.credentialSource === 'temporary'
            ? '[Dev API Test • Temp Key]'
            : '[Dev API Test • Saved Key]';

        logsDb.insert({
          provider,
          route: `${input.origin} → ${input.destination}`,
          flightNumber: flightLabel,
          departureDate: input.departureDate,
          status: adapterResult.status,
          statusCode,
          errorMessage: safeError ? `${modeTag} ${safeError}` : `${modeTag} Status=${adapterResult.status}`,
          durationMs,
        });
      } catch (logErr) {
        console.error('[DevApiTester] Failed to record diagnostic log:', logErr);
      }

      return {
        provider,
        label,
        status: adapterResult.status,
        credentialSource: creds.credentialSource,
        quotaIncremented,
        durationMs,
        lowestPrice,
        leadingAirline: adapterResult.leadingAirline || itineraries[0]?.airline || null,
        leadingFlightNumber:
          adapterResult.leadingFlightNumber || itineraries[0]?.flightNumber || null,
        parsedFlightCount: itineraries.length,
        itineraries,
        errorMessage: safeError,
        rawPayload: safeRawPayload,
      };
    })
  );

  const parity = evaluateProviderParity(
    results.map((r) => ({
      provider: r.provider,
      label: r.label,
      status: r.status,
      price: r.lowestPrice,
      itineraries: r.itineraries,
    }))
  );

  return {
    executedAt: new Date().toISOString(),
    currency,
    query: {
      origin: input.origin,
      destination: input.destination,
      departureDate: input.departureDate,
      cabinClass: input.cabinClass,
      fareTier: input.fareTier,
      airline: normalizedQuery.airline,
      flightNumber: normalizedQuery.flightNumber,
      searchMode: normalizedQuery.searchMode,
    },
    results,
    parity,
  };
}