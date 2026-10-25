import db from './index';
import { Settings } from '../types';

export const settingsDb = {
  get: (): Settings => {
    return db.prepare('SELECT * FROM settings WHERE id = 1').get() as Settings;
  },

  update: (settings: Partial<Omit<Settings, 'id' | 'serpApiUsed' | 'searchApiUsed' | 'fastFlightsUsed'>>): void => {
    const current = settingsDb.get();
    const updated = { ...current, ...settings };
    
    // Safeguard: SQLite crashes if any bind parameter is explicitly undefined.
    // This converts any missing/undefined fields to null.
    Object.keys(updated).forEach(key => {
      if ((updated as any)[key] === undefined) {
        (updated as any)[key] = null;
      }
    });
    
    const stmt = db.prepare(`
      UPDATE settings SET 
        serpApiKey = @serpApiKey,
        searchApiKey = @searchApiKey,
        dataSourceStrategy = @dataSourceStrategy,
        fallbackStrategyMode = @fallbackStrategyMode,
        serpApiEnabled = @serpApiEnabled,
        searchApiEnabled = @searchApiEnabled,
        fastFlightsEnabled = @fastFlightsEnabled,
        serpApiQuota = @serpApiQuota,
        searchApiQuota = @searchApiQuota,
        fastFlightsQuota = @fastFlightsQuota,
        serpApiPaused = @serpApiPaused,
        searchApiPaused = @searchApiPaused,
        fastFlightsPaused = @fastFlightsPaused,
        notificationsEnabled = @notificationsEnabled,
        appriseUrl = @appriseUrl,
        smtpHost = @smtpHost,
        smtpPort = @smtpPort,
        smtpUser = @smtpUser,
        smtpPass = @smtpPass,
        smtpFrom = @smtpFrom,
        smtpTo = @smtpTo,
        timezone = @timezone,
        circuitBreakerUntil = @circuitBreakerUntil,
        scheduleFarOut = @scheduleFarOut,
        scheduleStandard = @scheduleStandard,
        scheduleFinalStretch = @scheduleFinalStretch,
        operatingHoursStart = @operatingHoursStart,
        operatingHoursEnd = @operatingHoursEnd,
        minDropDollar = @minDropDollar,
        minDropPercent = @minDropPercent,
        globalPause = @globalPause
      WHERE id = 1
    `);
    stmt.run(updated);
  },

  incrementApiUsage: (source: 'serpapi' | 'searchapi' | 'fastflights'): void => {
    if (source === 'serpapi') db.prepare('UPDATE settings SET serpApiUsed = serpApiUsed + 1 WHERE id = 1').run();
    if (source === 'searchapi') db.prepare('UPDATE settings SET searchApiUsed = searchApiUsed + 1 WHERE id = 1').run();
    if (source === 'fastflights') db.prepare('UPDATE settings SET fastFlightsUsed = fastFlightsUsed + 1 WHERE id = 1').run();
  },

  resetApiUsage: (newResetDate: string): void => {
    const stmt = db.prepare('UPDATE settings SET serpApiUsed = 0, searchApiUsed = 0, fastFlightsUsed = 0, quotaResetDate = @newResetDate WHERE id = 1');
    stmt.run({ newResetDate });
  }
};