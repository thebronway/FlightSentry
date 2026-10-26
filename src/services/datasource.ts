import { Flight, Settings } from '../types';
import { checkFlightPrice as querySerpApi } from './serpapi';
import { checkSearchApiPrice as querySearchApi } from './searchapi';
import { checkFastFlightsPrice as queryFastFlights } from './fastflights';

export interface DataSourceResult {
  price: number | null;
  status: 'Success' | 'SoldOut' | 'Error' | 'RateLimited';
  sourceUsed?: 'serpapi' | 'searchapi' | 'fastflights';
}

let roundRobinIndex = 0;

export const executeSearchStrategy = async (flight: Flight, settings: Settings): Promise<DataSourceResult> => {
  const isEnabled = (val: any) => val === 1 || val === true || val === '1' || val === 'true';

  console.log(`[Router] --- Check Flight #${flight.id} (${flight.origin} -> ${flight.destination}) ---`);
  console.log(`[Router] Settings: serpApiEnabled=${settings.serpApiEnabled} (parsed: ${isEnabled(settings.serpApiEnabled)}), searchApiEnabled=${settings.searchApiEnabled} (parsed: ${isEnabled(settings.searchApiEnabled)}), fastFlightsEnabled=${settings.fastFlightsEnabled} (parsed: ${isEnabled(settings.fastFlightsEnabled)})`);
  console.log(`[Router] Configured Order: "${settings.dataSourceStrategy}" | Mode: "${settings.fallbackStrategyMode}"`);

  const order = (settings.dataSourceStrategy || '').split(',').filter(Boolean);
  if (order.length === 0) {
    console.warn(`[Router] Aborting: dataSourceStrategy order is empty.`);
    return { price: null, status: 'Error' };
  }

  const isPaused = (val: any) => val === 1 || val === true || val === '1' || val === 'true';

  const availableApis = order.filter(api => {
    if (api === 'serpapi') return isEnabled(settings.serpApiEnabled) && !isPaused(settings.serpApiPaused) && (settings.serpApiQuota === 0 || settings.serpApiUsed < settings.serpApiQuota);
    if (api === 'searchapi') return isEnabled(settings.searchApiEnabled) && !isPaused(settings.searchApiPaused) && (settings.searchApiQuota === 0 || settings.searchApiUsed < settings.searchApiQuota);
    if (api === 'fastflights') return isEnabled(settings.fastFlightsEnabled) && !isPaused(settings.fastFlightsPaused) && (settings.fastFlightsQuota === 0 || settings.fastFlightsUsed < settings.fastFlightsQuota);
    return false;
  }) as ('serpapi' | 'searchapi' | 'fastflights')[];

  console.log(`[Router] Filtered active strategies: [${availableApis.join(', ')}]`);

  if (availableApis.length === 0) {
    console.warn(`[Router] No strategies eligible to run.`);
    return { price: null, status: 'Error' };
  }

  const execute = async (strategy: 'serpapi' | 'searchapi' | 'fastflights'): Promise<DataSourceResult> => {
    console.log(`[Router] -> Executing: ${strategy}`);
    let result: DataSourceResult = { price: null, status: 'Error', sourceUsed: strategy };
    try {
      if (strategy === 'serpapi' && settings.serpApiKey) {
        result = { ...(await querySerpApi(flight, settings.serpApiKey)), sourceUsed: strategy };
      } else if (strategy === 'searchapi' && settings.searchApiKey) {
        result = { ...(await querySearchApi(flight, settings.searchApiKey)), sourceUsed: strategy };
      } else if (strategy === 'fastflights') {
        result = { ...(await queryFastFlights(flight)), sourceUsed: strategy };
      }
    } catch (error) {
      console.error(`[Router] Strategy ${strategy} threw an exception:`, error);
    }
    console.log(`[Router] Result from ${strategy}: Status=${result.status}, Price=${result.price}`);
    return result;
  };

  if (settings.fallbackStrategyMode === 'exhaust-quota') {
    const result = await execute(availableApis[0]);
    if (result.status === 'RateLimited') console.warn(`Rate limit / CAPTCHA detected on ${availableApis[0]}.`);
    return result;
  } else {
    // Dynamic round-robin across all active data sources
    const startIndex = roundRobinIndex % availableApis.length;
    roundRobinIndex = (roundRobinIndex + 1) % availableApis.length;
    const rotatedApis = [
      ...availableApis.slice(startIndex),
      ...availableApis.slice(0, startIndex),
    ];

    console.log(`[Router] Round-robin order: [${rotatedApis.join(', ')}] (Selected primary: ${rotatedApis[0]})`);

    for (const strategy of rotatedApis) {
      const result = await execute(strategy);
      if (result.status === 'Success' || result.status === 'SoldOut') return result;
      if (result.status === 'RateLimited') {
        console.warn(`Rate limit / CAPTCHA detected on ${strategy}. Falling back...`);
      }
    }
    return { price: null, status: 'Error' };
  }
};