import { CabinClass, FareTier } from '@/types';
import { DataSourceProvider } from '@/services/datasource';

export interface ProviderOverrideDraft {
  apiKey: string;
  scraperUrl?: string;
}

export type ProviderOverridesState = Record<DataSourceProvider, ProviderOverrideDraft>;

export interface ApiTestFormState {
  origin: string;
  destination: string;
  departureDate: string;
  cabinClass: CabinClass;
  fareTier: FareTier;
  airline: string;
  flightNumber: string;
}

export interface ProviderMetadata {
  id: DataSourceProvider;
  label: string;
  badge: string;
  badgeClass: string;
  keyPlaceholder: string;
  supportsScraperUrl?: boolean;
}

export const ALL_TEST_PROVIDERS: ProviderMetadata[] = [
  {
    id: 'serpapi',
    label: 'SerpAPI',
    badge: 'Metered API',
    badgeClass: 'bg-sky-950/40 text-sky-400 border-sky-800/40',
    keyPlaceholder: 'Temporary SerpAPI key override...',
  },
  {
    id: 'searchapi',
    label: 'SearchApi.io',
    badge: 'Metered API',
    badgeClass: 'bg-sky-950/40 text-sky-400 border-sky-800/40',
    keyPlaceholder: 'Temporary SearchApi.io key override...',
  },
  {
    id: 'hasdata',
    label: 'HasData',
    badge: 'Metered API',
    badgeClass: 'bg-sky-950/40 text-sky-400 border-sky-800/40',
    keyPlaceholder: 'Temporary HasData key override...',
  },
  {
    id: 'flightsentry-scraper',
    label: 'FlightSentry-Scraper',
    badge: 'Self-Hosted Scraper',
    badgeClass: 'bg-amber-950/40 text-amber-400 border-amber-800/40',
    keyPlaceholder: 'fss_... temporary key override',
    supportsScraperUrl: true,
  },
];