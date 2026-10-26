import { Flight, Settings } from '../types';
import { settingsDb } from '../db/settings';
import { checkFlightPrice as querySerpApi } from './serpapi';
import { checkSearchApiPrice as querySearchApi } from './searchapi';
import { checkHasDataPrice as queryHasData } from './hasdata';
import { checkFastFlightsPrice as queryFastFlights } from './fastflights';

export type DataSourceProvider = 'serpapi' | 'searchapi' | 'hasdata' | 'fastflights';

export interface DataSourceResult {
  price: number | null;
  status: 'Success' | 'SoldOut' | 'Error' | 'RateLimited';
  sourceUsed?: DataSourceProvider;
}

export const executeSearchStrategy = async (flight: Flight, settings: Settings): Promise<DataSourceResult> => {
  const isEnabled = (val: any) => val === 1 || val === true || val === '1' || val === 'true';
  const isPaused = (val: any) => val === 1 || val === true || val === '1' || val === 'true';

  console.log(`[Router] --- Check Flight #${flight.id} (${flight.origin} -> ${flight.destination}) ---`);
  console.log(`[Router] Configured Order: "${settings.dataSourceStrategy}" | Mode: "${settings.fallbackStrategyMode}"`);

  const ALL_PROVIDERS: DataSourceProvider[] = ['serpapi', 'searchapi', 'hasdata', 'fastflights'];
  const rawOrder = (settings.dataSourceStrategy || '').split(',').map(s => s.trim()).filter(Boolean) as DataSourceProvider[];
  const configuredOrder: DataSourceProvider[] = [
    ...rawOrder.filter(p => ALL_PROVIDERS.includes(p)),
    ...ALL_PROVIDERS.filter(p => !rawOrder.includes(p)),
  ];

  // 1. Separate Unmetered / Scrapers from Metered APIs
  const activeUnmetered = configuredOrder.filter(api => {
    if (api === 'fastflights') return isEnabled(settings.fastFlightsEnabled) && !isPaused(settings.fastFlightsPaused);
    return false;
  }) as ('fastflights')[];

  const activeMetered = configuredOrder.filter(api => {
    if (api === 'serpapi') {
      return isEnabled(settings.serpApiEnabled) && !isPaused(settings.serpApiPaused) && Boolean(settings.serpApiKey) &&
        (settings.serpApiQuota === 0 || settings.serpApiUsed < settings.serpApiQuota);
    }
    if (api === 'searchapi') {
      return isEnabled(settings.searchApiEnabled) && !isPaused(settings.searchApiPaused) && Boolean(settings.searchApiKey) &&
        (settings.searchApiQuota === 0 || settings.searchApiUsed < settings.searchApiQuota);
    }
    if (api === 'hasdata') {
      return isEnabled(settings.hasdataEnabled) && !isPaused(settings.hasdataPaused) && Boolean(settings.hasdataApiKey) &&
        (settings.hasdataQuota === 0 || settings.hasdataUsed < settings.hasdataQuota);
    }
    return false;
  }) as ('serpapi' | 'searchapi' | 'hasdata')[];

  console.log(`[Router] Active Unmetered/Scrapers: [${activeUnmetered.join(', ')}] | Active Metered: [${activeMetered.join(', ')}]`);
  if (activeMetered.length === 0) {
    console.log(`[Router] Metered breakdown: SerpAPI(enabled=${isEnabled(settings.serpApiEnabled)}, hasKey=${Boolean(settings.serpApiKey)}), SearchApi(enabled=${isEnabled(settings.searchApiEnabled)}, hasKey=${Boolean(settings.searchApiKey)}), HasData(enabled=${isEnabled(settings.hasdataEnabled)}, hasKey=${Boolean(settings.hasdataApiKey)})`);
  }

  const executeProvider = async (strategy: DataSourceProvider): Promise<DataSourceResult> => {
    const isScraper = strategy === 'fastflights';
    if (isScraper) {
      // Randomized Jitter for scrapers (2,000ms - 4,500ms) to avoid bot tripping
      const jitterMs = Math.floor(Math.random() * (4500 - 2000 + 1)) + 2000;
      console.log(`[Router] Scraper provider ${strategy} selected. Applying ${jitterMs}ms jitter delay...`);
      await new Promise(r => setTimeout(r, jitterMs));
    }

    console.log(`[Router] -> Executing: ${strategy}`);
    let result: DataSourceResult = { price: null, status: 'Error', sourceUsed: strategy };

    try {
      if (strategy === 'serpapi' && settings.serpApiKey) {
        result = { ...(await querySerpApi(flight, settings.serpApiKey)), sourceUsed: strategy };
      } else if (strategy === 'searchapi' && settings.searchApiKey) {
        result = { ...(await querySearchApi(flight, settings.searchApiKey)), sourceUsed: strategy };
      } else if (strategy === 'hasdata' && settings.hasdataApiKey) {
        result = { ...(await queryHasData(flight, settings.hasdataApiKey)), sourceUsed: strategy };
      } else if (strategy === 'fastflights') {
        result = { ...(await queryFastFlights(flight)), sourceUsed: strategy };
      }
    } catch (error) {
      console.error(`[Router] Strategy ${strategy} threw an exception:`, error);
    }

    if (result.status === 'RateLimited') {
      console.warn(`[Router] RATE LIMIT / BOT BLOCK DETECTED on provider: ${strategy}. Logged for tracking.`);
    }

    console.log(`[Router] Result from ${strategy}: Status=${result.status}, Price=${result.price}`);
    return result;
  };

  // 2. UNMETERED FIRST: Run unmetered/scraper sources first if enabled, regardless of strategy mode
  if (activeUnmetered.length > 0) {
    let unmeteredExecutionList = [...activeUnmetered];
    if (settings.fallbackStrategyMode === 'sequential-query' && activeUnmetered.length > 1) {
      const scraperStartIndex = settingsDb.getNextRoundRobinIndex(activeUnmetered.length);
      unmeteredExecutionList = [
        ...activeUnmetered.slice(scraperStartIndex),
        ...activeUnmetered.slice(0, scraperStartIndex),
      ];
      console.log(`[Router] Unmetered round-robin rotation: [${unmeteredExecutionList.join(', ')}] (Selected primary: ${unmeteredExecutionList[0]})`);
    } else {
      console.log(`[Router] Unmetered providers active: [${unmeteredExecutionList.join(', ')}]. Prioritizing before metered APIs.`);
    }

    for (const scraper of unmeteredExecutionList) {
      const result = await executeProvider(scraper);
      if (result.status === 'Success' || result.status === 'SoldOut') {
        return result;
      }
      if (result.status === 'RateLimited') {
        console.warn(`[Router] Unmetered provider ${scraper} hit rate limit / CAPTCHA. Falling back to next provider.`);
      }
    }
  }

  // 3. Fall back to Metered APIs if unmetered failed or none were active
  if (activeMetered.length === 0) {
    console.warn(`[Router] No metered strategies eligible or available to run.`);
    return { price: null, status: 'Error' };
  }

  // Determine execution order across metered providers
  let orderedMetered: ('serpapi' | 'searchapi' | 'hasdata')[] = [];

  if (settings.fallbackStrategyMode === 'balanced-usage') {
    // Balanced Usage: Route to the active provider with the lowest percentage of monthly quota consumed
    const getUsageRatio = (api: 'serpapi' | 'searchapi' | 'hasdata') => {
      const quota = api === 'serpapi' ? settings.serpApiQuota : api === 'searchapi' ? settings.searchApiQuota : settings.hasdataQuota;
      const used = api === 'serpapi' ? settings.serpApiUsed : api === 'searchapi' ? settings.searchApiUsed : settings.hasdataUsed;
      if (quota <= 0) return 0;
      return used / quota;
    };

    orderedMetered = [...activeMetered].sort((a, b) => getUsageRatio(a) - getUsageRatio(b));
    console.log(`[Router] Balanced usage order: [${orderedMetered.map(a => `${a} (${(getUsageRatio(a) * 100).toFixed(1)}%)`).join(', ')}]`);
  } else if (settings.fallbackStrategyMode === 'exhaust-quota') {
    // Exhaust Quota: Stick to strict priority ranking order
    orderedMetered = [...activeMetered];
    console.log(`[Router] Exhaust quota order: [${orderedMetered.join(', ')}]`);
  } else {
    // Round-Robin (sequential-query): Persistent SQLite atomic rotation
    const startIndex = settingsDb.getNextRoundRobinIndex(activeMetered.length);
    orderedMetered = [
      ...activeMetered.slice(startIndex),
      ...activeMetered.slice(0, startIndex),
    ];
    console.log(`[Router] Persistent atomic round-robin primary: ${orderedMetered[0]} (Rotation: [${orderedMetered.join(', ')}])`);
  }

  // 4. Execute Metered Providers with Failover
  for (const strategy of orderedMetered) {
    const result = await executeProvider(strategy);
    if (result.status === 'Success' || result.status === 'SoldOut') {
      return result;
    }
    if (result.status === 'RateLimited') {
      console.warn(`[Router] Rate limit detected on ${strategy}. Failing over to next provider.`);
    }
  }

  return { price: null, status: 'Error' };
};