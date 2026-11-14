import { Flight, Settings, RouteItinerary, CheckResultStatus } from '../types';
import { settingsDb } from '../db/settings';
import { logsDb } from '../db/logs';
import { checkFlightPrice as querySerpApi } from './serpapi';
import { checkSearchApiPrice as querySearchApi } from './searchapi';
import {
  checkFlightSentryScraperPrice as queryFlightSentryScraper,
  checkScraperHealth,
  redactScraperSecrets,
} from './flightsentryScraper';
import { selectDiverseItineraries } from '../utils/routeIntelligence';

export type DataSourceProvider = 'serpapi' | 'searchapi' | 'flightsentry-scraper';

export interface DataSourceResult {
  price: number | null;
  status: CheckResultStatus;
  sourceUsed?: DataSourceProvider;
  leadingAirline?: string | null;
  leadingFlightNumber?: string | null;
  itineraries?: RouteItinerary[];
  errorMessage?: string | null;
}

export const executeSearchStrategy = async (flight: Flight, settings: Settings): Promise<DataSourceResult> => {
  const isEnabled = (val: any) => val === 1 || val === true || val === '1' || val === 'true';
  const isPaused = (val: any) => val === 1 || val === true || val === '1' || val === 'true';

  console.log(`[Router] --- Check Flight #${flight.id} (${flight.origin} -> ${flight.destination}) ---`);
  console.log(`[Router] Configured Order: "${settings.dataSourceStrategy}" | Mode: "${settings.fallbackStrategyMode}"`);

  const ALL_PROVIDERS: DataSourceProvider[] = ['serpapi', 'searchapi', 'flightsentry-scraper'];
  const rawOrder = (settings.dataSourceStrategy || '').split(',').map(s => s.trim()).filter(Boolean) as DataSourceProvider[];
  const configuredOrder: DataSourceProvider[] = [
    ...rawOrder.filter(p => ALL_PROVIDERS.includes(p)),
    ...ALL_PROVIDERS.filter(p => !rawOrder.includes(p)),
  ];

  const scraperUrl = (settings.flightsentryScraperUrl || '').trim();
  const scraperKey = (settings.flightsentryScraperApiKey || '').trim();

  const scraperActive =
    isEnabled(settings.flightsentryScraperEnabled) &&
    !isPaused(settings.flightsentryScraperPaused) &&
    Boolean(scraperUrl) &&
    Boolean(scraperKey);

  const prioritizeScraperFirst = settings.flightsentryScraperPrioritizeFirst !== 0;

  const serpKey = (settings.serpApiKey || '').trim();
  const searchKey = (settings.searchApiKey || '').trim();

  const isProviderActive = (api: DataSourceProvider): boolean => {
    if (api === 'flightsentry-scraper') {
      return scraperActive;
    }
    if (api === 'serpapi') {
      return isEnabled(settings.serpApiEnabled) && !isPaused(settings.serpApiPaused) && Boolean(serpKey) &&
        (settings.serpApiQuota === 0 || settings.serpApiUsed < settings.serpApiQuota);
    }
    if (api === 'searchapi') {
      return isEnabled(settings.searchApiEnabled) && !isPaused(settings.searchApiPaused) && Boolean(searchKey) &&
        (settings.searchApiQuota === 0 || settings.searchApiUsed < settings.searchApiQuota);
    }
    return false;
  };

  const activeAll = configuredOrder.filter(isProviderActive);
  const activeMetered = activeAll.filter((api): api is 'serpapi' | 'searchapi' => api !== 'flightsentry-scraper');

  console.log(`[Router] Active Providers: [${activeAll.join(', ')}] | ScraperFirst=${prioritizeScraperFirst}`);
  if (activeMetered.length === 0) {
    console.log(`[Router] Metered breakdown: SerpAPI(enabled=${isEnabled(settings.serpApiEnabled)}, paused=${isPaused(settings.serpApiPaused)}, hasKey=${Boolean(serpKey)}, used=${settings.serpApiUsed}/${settings.serpApiQuota}), SearchApi(enabled=${isEnabled(settings.searchApiEnabled)}, paused=${isPaused(settings.searchApiPaused)}, hasKey=${Boolean(searchKey)}, used=${settings.searchApiUsed}/${settings.searchApiQuota})`);
  }

  const executeProvider = async (strategy: DataSourceProvider): Promise<DataSourceResult> => {
    console.log(`[Router] -> Executing: ${strategy}`);
    let result: DataSourceResult = { price: null, status: 'Error', sourceUsed: strategy };
    let failureReason: string | null = null;
    const startTime = Date.now();

    try {
      const activeCurrency = settings.currency || 'USD';
      if (strategy === 'serpapi' && serpKey) {
        result = { ...(await querySerpApi(flight, serpKey, activeCurrency)), sourceUsed: strategy };
      } else if (strategy === 'searchapi' && searchKey) {
        result = { ...(await querySearchApi(flight, searchKey, activeCurrency)), sourceUsed: strategy };
      } else if (strategy === 'flightsentry-scraper' && scraperUrl && scraperKey) {
        result = {
          ...(await queryFlightSentryScraper(flight, scraperUrl, scraperKey, activeCurrency)),
          sourceUsed: strategy,
        };
      }
    } catch (error: any) {
      failureReason = redactScraperSecrets(error?.message || 'Unhandled provider exception');
      console.error(`[Router] Strategy ${strategy} threw an exception:`, failureReason);
    }

    const durationMs = Date.now() - startTime;

    if (result.status === 'Success' && result.itineraries && result.itineraries.length > 0) {
      const maxStored = settings.maxStoredItineraries ?? 12;
      const diversityActive = settings.carrierDiversityEnabled !== 0;
      result.itineraries = selectDiverseItineraries(result.itineraries, maxStored, diversityActive);
    }

    if (result.status === 'Success') {
      const count = result.itineraries?.length || 0;
      const winner = result.leadingAirline || flight.airline || 'Carrier';
      const flightNumStr = result.leadingFlightNumber ? ` #${result.leadingFlightNumber}` : '';
      failureReason = `Retrieved fare: $${result.price} (${winner}${flightNumStr}, ${count} ${count === 1 ? 'itinerary' : 'itineraries'} captured)`;
    } else if (result.status === 'Paused') {
      failureReason = result.errorMessage || failureReason || 'Scraper is globally paused';
      console.warn(`[Router] PAUSED state detected on provider: ${strategy}. Failing over to next provider.`);
    } else if (result.status === 'RateLimited') {
      failureReason = result.errorMessage || failureReason || 'Rate limit or anti-bot challenge (HTTP 429 / CAPTCHA) detected';
      console.warn(`[Router] RATE LIMIT / BOT BLOCK DETECTED on provider: ${strategy}. Logged for tracking.`);
    } else if (result.status === 'SoldOut') {
      failureReason = result.errorMessage || 'Upstream provider confirmed 0 matching flight itineraries for this route and date';
    } else if (result.status === 'Error' && !failureReason) {
      failureReason = result.errorMessage || `${strategy} query failed or returned an unparseable response`;
    }

    const safeFailureReason = failureReason ? redactScraperSecrets(failureReason) : null;

    // Persist execution log for diagnostics
    try {
      const flightNumLabel = flight.airline && flight.flightNumber
        ? `${flight.airline} ${flight.flightNumber}`
        : flight.airline || null;

      const statusCode =
        result.status === 'Success' || result.status === 'SoldOut'
          ? 200
          : result.status === 'RateLimited'
          ? 429
          : result.status === 'Paused'
          ? 503
          : 500;

      logsDb.insert({
        provider: strategy,
        route: flight.origin && flight.destination ? `${flight.origin} → ${flight.destination}` : null,
        flightNumber: flightNumLabel,
        departureDate: flight.departureDate,
        status: result.status,
        statusCode,
        errorMessage: safeFailureReason,
        durationMs,
      });
    } catch (logErr) {
      console.error('[Router] Failed to record query log:', logErr);
    }

    console.log(`[Router] Result from ${strategy}: Status=${result.status}, Price=${result.price}`);
    return result;
  };

  if (activeAll.length === 0) {
    console.warn(`[Router] No data source strategies eligible or available to run.`);
    return {
      price: null,
      status: 'Error',
      errorMessage: 'No eligible data source providers available (check enabled state, pause status, credentials, and quota)',
    };
  }

  // Helper to sort a candidate pool according to fallbackStrategyMode
  const orderPool = async (pool: DataSourceProvider[]): Promise<DataSourceProvider[]> => {
    if (pool.length <= 1) return [...pool];

    if (settings.fallbackStrategyMode === 'balanced-usage') {
      let scraperRatio = 0;
      if (pool.includes('flightsentry-scraper')) {
        try {
          const health = await checkScraperHealth(scraperUrl, scraperKey);
          if (health.paused || health.circuitBreakerActive || health.rateLimited) {
            scraperRatio = 1;
          } else {
            const hRatio = health.usage.hourlyLimit > 0 ? health.usage.hourlyUsed / health.usage.hourlyLimit : 0;
            const dRatio = health.usage.dailyLimit > 0 ? health.usage.dailyUsed / health.usage.dailyLimit : 0;
            scraperRatio = Math.max(hRatio, dRatio);
          }
        } catch {
          scraperRatio = 0;
        }
      }

      const getUsageRatio = (api: DataSourceProvider): number => {
        if (api === 'flightsentry-scraper') return scraperRatio;
        const quota = api === 'serpapi' ? settings.serpApiQuota : settings.searchApiQuota;
        const used = api === 'serpapi' ? settings.serpApiUsed : settings.searchApiUsed;
        if (quota <= 0) return 0;
        return used / quota;
      };

      const sorted = [...pool].sort((a, b) => getUsageRatio(a) - getUsageRatio(b));
      console.log(`[Router] Balanced usage order: [${sorted.map(a => `${a} (${(getUsageRatio(a) * 100).toFixed(1)}%)`).join(', ')}]`);
      return sorted;
    }

    if (settings.fallbackStrategyMode === 'exhaust-quota') {
      console.log(`[Router] Exhaust quota order: [${pool.join(', ')}]`);
      return [...pool];
    }

    // Round-Robin (sequential-query): Persistent SQLite atomic rotation
    const startIndex = settingsDb.getNextRoundRobinIndex(pool.length);
    const rotated = [
      ...pool.slice(startIndex),
      ...pool.slice(0, startIndex),
    ];
    console.log(`[Router] Persistent atomic round-robin primary: ${rotated[0]} (Rotation: [${rotated.join(', ')}])`);
    return rotated;
  };

  let executionQueue: DataSourceProvider[] = [];
  if (prioritizeScraperFirst && scraperActive) {
    const orderedMetered = await orderPool(activeMetered);
    executionQueue = ['flightsentry-scraper', ...orderedMetered];
    console.log(`[Router] Scraper-first priority active. Execution queue: [${executionQueue.join(', ')}]`);
  } else {
    executionQueue = await orderPool(activeAll);
  }

  let lastResult: DataSourceResult | null = null;
  let lastErrorMessage: string | null = null;

  for (let i = 0; i < executionQueue.length; i++) {
    const strategy = executionQueue[i];
    const remainingMetered = executionQueue.slice(i + 1).some(p => p !== 'flightsentry-scraper');
    const result = await executeProvider(strategy);
    lastResult = result;

    if (result.status === 'Success') {
      return result;
    }

    if (result.status === 'SoldOut') {
      if (strategy === 'flightsentry-scraper' && remainingMetered) {
        console.warn(`[Router] Self-hosted scraper reported SoldOut. Verifying with metered provider failover.`);
        continue;
      }
      return result;
    }

    if (result.errorMessage) {
      lastErrorMessage = result.errorMessage;
    }

    if (result.status === 'Paused') {
      console.warn(`[Router] Provider ${strategy} is paused. Failing over to next provider.`);
    } else if (result.status === 'RateLimited') {
      console.warn(`[Router] Rate limit detected on ${strategy}. Failing over to next provider.`);
    }
  }

  if (lastResult && (lastResult.status === 'Paused' || lastResult.status === 'RateLimited') && activeMetered.length === 0) {
    return lastResult;
  }

  return { price: null, status: 'Error', errorMessage: lastErrorMessage || 'All active data source providers failed' };
};