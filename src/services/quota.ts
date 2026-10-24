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
  return settings.apiSearchesUsed < settings.monthlyQuota;
};