import { settingsDb } from '../db/settings';
import { getNextMonthResetDate } from '../utils/date';
import { Settings } from '../types';

export const checkAndResetQuota = (settings: Settings): Settings => {
  const today = new Date().toISOString().split('T')[0];
  let changed = false;

  const checkProvider = (
    provider: 'serpapi' | 'searchapi' | 'hasdata',
    resetDate?: string | null
  ) => {
    const effectiveDate = resetDate || settings.quotaResetDate;
    if (effectiveDate && today >= effectiveDate) {
      console.log(`[Quota] Resetting ${provider} monthly quota usage (reached ${effectiveDate}).`);
      const nextReset = getNextMonthResetDate(effectiveDate);
      settingsDb.resetProviderUsage(provider, nextReset);
      changed = true;
    }
  };

  checkProvider('serpapi', settings.serpApiResetDate);
  checkProvider('searchapi', settings.searchApiResetDate);
  checkProvider('hasdata', settings.hasdataResetDate);

  if (today >= settings.quotaResetDate) {
    const nextReset = getNextMonthResetDate(settings.quotaResetDate);
    settingsDb.resetApiUsage(nextReset);
    changed = true;
  }

  return changed ? settingsDb.get() : settings;
};

export const canMakeApiCall = (settings: Settings): boolean => {
  if (settings.globalPause === 1) return false;
  const hasSerp = settings.serpApiEnabled === 1 && settings.serpApiPaused !== 1 && (settings.serpApiQuota === 0 || settings.serpApiUsed < settings.serpApiQuota);
  const hasSearch = settings.searchApiEnabled === 1 && settings.searchApiPaused !== 1 && (settings.searchApiQuota === 0 || settings.searchApiUsed < settings.searchApiQuota);
  const hasHasdata = settings.hasdataEnabled === 1 && settings.hasdataPaused !== 1 && (settings.hasdataQuota === 0 || settings.hasdataUsed < settings.hasdataQuota);
  const hasFast = settings.fastFlightsEnabled === 1 && settings.fastFlightsPaused !== 1;
  return hasSerp || hasSearch || hasHasdata || hasFast;
};