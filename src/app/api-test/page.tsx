import { notFound } from 'next/navigation';
import { isApiTesterEnabled } from '@/utils/devGate';
import { settingsDb } from '@/db/settings';
import { getTodayDateString } from '@/utils/date';
import { DataSourceProvider } from '@/services/datasource';
import ApiTestWorkspace from '@/components/apiTest/ApiTestWorkspace';

export const dynamic = 'force-dynamic';

export interface ProviderReadinessInfo {
  configured: boolean;
  enabled: boolean;
}

export type ProviderReadinessMap = Record<DataSourceProvider, ProviderReadinessInfo>;

function computeDefaultDepartureDate(timezone?: string | null): string {
  const todayStr = getTodayDateString(timezone);
  const [yearStr, monthStr, dayStr] = todayStr.split('-');
  const baseUtc = new Date(
    Date.UTC(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10) + 14)
  );
  return baseUtc.toISOString().split('T')[0];
}

export default function ApiTestPage() {
  if (!isApiTesterEnabled()) {
    notFound();
  }

  const settings = settingsDb.get();
  const currency = (settings.currency || 'USD').trim().toUpperCase();
  const defaultDepartureDate = computeDefaultDepartureDate(settings.timezone);

  // Only expose boolean readiness flags to the client — never expose stored keys or URLs
  const providerReadiness: ProviderReadinessMap = {
    serpapi: {
      configured: Boolean((settings.serpApiKey || '').trim()),
      enabled: settings.serpApiEnabled === 1,
    },
    searchapi: {
      configured: Boolean((settings.searchApiKey || '').trim()),
      enabled: settings.searchApiEnabled === 1,
    },
    'flightsentry-scraper': {
      configured: Boolean(
        (settings.flightsentryScraperUrl || '').trim() &&
          (settings.flightsentryScraperApiKey || '').trim()
      ),
      enabled: settings.flightsentryScraperEnabled === 1,
    },
  };

  return (
    <ApiTestWorkspace
      currency={currency}
      defaultDepartureDate={defaultDepartureDate}
      providerReadiness={providerReadiness}
    />
  );
}