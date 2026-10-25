import { Flight, Settings } from '../types';

export interface DataSourceResult {
  price: number | null;
  status: 'Success' | 'SoldOut' | 'Error' | 'RateLimited';
  sourceUsed?: 'serpapi' | 'searchapi' | 'fastflights';
}

export const executeSearchStrategy = async (flight: Flight, settings: Settings): Promise<DataSourceResult> => {
  const order = (settings.dataSourceStrategy || '').split(',').filter(Boolean);
  if (order.length === 0) return { price: null, status: 'Error' };

  const availableApis = order.filter(api => {
    if (api === 'serpapi') return settings.serpApiEnabled === 1 && (settings.serpApiQuota === 0 || settings.serpApiUsed < settings.serpApiQuota);
    if (api === 'searchapi') return settings.searchApiEnabled === 1 && (settings.searchApiQuota === 0 || settings.searchApiUsed < settings.searchApiQuota);
    if (api === 'fastflights') return settings.fastFlightsEnabled === 1 && (settings.fastFlightsQuota === 0 || settings.fastFlightsUsed < settings.fastFlightsQuota);
    return false;
  }) as ('serpapi' | 'searchapi' | 'fastflights')[];

  if (availableApis.length === 0) return { price: null, status: 'Error' };

  const execute = async (strategy: 'serpapi' | 'searchapi' | 'fastflights'): Promise<DataSourceResult> => {
    console.log(`Attempting search with strategy: ${strategy} for Flight ${flight.id}`);
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
      console.error(`Strategy ${strategy} failed:`, error);
    }
    return result;
  };

  if (settings.fallbackStrategyMode === 'exhaust-quota') {
    const result = await execute(availableApis[0]);
    if (result.status === 'RateLimited') console.warn(`Rate limit / CAPTCHA detected on ${availableApis[0]}.`);
    return result;
  } else {
    for (const strategy of availableApis) {
      const result = await execute(strategy);
      if (result.status === 'Success' || result.status === 'SoldOut') return result;
      if (result.status === 'RateLimited') {
        console.warn(`Rate limit / CAPTCHA detected on ${strategy}. Falling back...`);
      }
    }
    return { price: null, status: 'Error' };
  }
};

const querySerpApi = async (flight: Flight, apiKey: string): Promise<DataSourceResult> => {
  // Migration from previous serpapi.ts logic
  // Simplified for phase 3 implementation
  return { price: null, status: 'Error' }; // Placeholder for actual fetch logic
};

const querySearchApi = async (flight: Flight, apiKey: string): Promise<DataSourceResult> => {
  return { price: null, status: 'Error' }; 
};

const queryFastFlights = async (flight: Flight): Promise<DataSourceResult> => {
  // fast-flights scraping logic goes here.
  // If HTTP 429 or CAPTCHA redirect detected:
  // return { price: null, status: 'RateLimited' };
  return { price: null, status: 'Error' }; 
};