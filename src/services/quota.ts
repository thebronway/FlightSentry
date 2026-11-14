import { settingsDb } from '../db/settings';
import { calculateNextResetDate, getTodayDateString } from '../utils/date';
import { Settings } from '../types';

export const checkAndResetQuota = (settings: Settings): Settings => {
  const today = getTodayDateString(settings.timezone);
  let changed = false;

  const checkProvider = (
    provider: 'serpapi' | 'searchapi',
    quotaMode?: 'monthly' | 'one-time' | null,
    resetDay?: number | null,
    resetDate?: string | null
  ) => {
    if (quotaMode === 'one-time') {
      return;
    }
    const effectiveDay = (resetDay !== undefined && resetDay !== null && resetDay >= 1 && resetDay <= 31)
      ? resetDay
      : settings.quotaResetDay || 1;
    const effectiveDate = resetDate || settings.quotaResetDate;

    if (effectiveDate && today >= effectiveDate) {
      console.log(`[Quota] Resetting ${provider} monthly quota usage (reached ${effectiveDate}).`);
      const nextReset = calculateNextResetDate(effectiveDay, settings.timezone);
      settingsDb.resetProviderUsage(provider, nextReset);
      changed = true;
    }
  };

  checkProvider('serpapi', settings.serpApiQuotaMode, settings.serpApiResetDay, settings.serpApiResetDate);
  checkProvider('searchapi', settings.searchApiQuotaMode, settings.searchApiResetDay, settings.searchApiResetDate);

  if (settings.quotaResetDate && today >= settings.quotaResetDate) {
    const nextReset = calculateNextResetDate(settings.quotaResetDay || 1, settings.timezone);
    settingsDb.resetApiUsage(nextReset);
    changed = true;
  }

  return changed ? settingsDb.get() : settings;
};

export const canMakeApiCall = (settings: Settings): boolean => {
  if (settings.globalPause === 1) return false;
  const hasSerp = settings.serpApiEnabled === 1 && settings.serpApiPaused !== 1 && (settings.serpApiQuota === 0 || settings.serpApiUsed < settings.serpApiQuota);
  const hasSearch = settings.searchApiEnabled === 1 && settings.searchApiPaused !== 1 && (settings.searchApiQuota === 0 || settings.searchApiUsed < settings.searchApiQuota);
  const hasScraper =
    settings.flightsentryScraperEnabled === 1 &&
    settings.flightsentryScraperPaused !== 1 &&
    Boolean((settings.flightsentryScraperUrl || '').trim()) &&
    Boolean((settings.flightsentryScraperApiKey || '').trim());
  return hasSerp || hasSearch || hasScraper;
};