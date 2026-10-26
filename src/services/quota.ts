import { settingsDb } from '../db/settings';
import { getNextMonthString } from '../utils/date';
import { Settings } from '../types';

export const checkAndResetQuota = (settings: Settings): Settings => {
  const today = new Date().toISOString().split('T')[0];
  
  if (today >= settings.quotaResetDate) {
    console.log("Monthly quota reset triggered.");
    const nextReset = getNextMonthString();
    settingsDb.resetApiUsage(nextReset);
    return settingsDb.get(); // Fetch updated settings
  }
  
  return settings;
};

export const canMakeApiCall = (settings: Settings): boolean => {
  if (settings.globalPause === 1) return false;
  const hasSerp = settings.serpApiEnabled === 1 && settings.serpApiPaused !== 1 && (settings.serpApiQuota === 0 || settings.serpApiUsed < settings.serpApiQuota);
  const hasSearch = settings.searchApiEnabled === 1 && settings.searchApiPaused !== 1 && (settings.searchApiQuota === 0 || settings.searchApiUsed < settings.searchApiQuota);
  const hasHasdata = settings.hasdataEnabled === 1 && settings.hasdataPaused !== 1 && (settings.hasdataQuota === 0 || settings.hasdataUsed < settings.hasdataQuota);
  const hasFast = settings.fastFlightsEnabled === 1 && settings.fastFlightsPaused !== 1;
  return hasSerp || hasSearch || hasHasdata || hasFast;
};