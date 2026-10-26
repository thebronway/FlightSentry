import db from './index';
import { Settings } from '../types';

export const settingsDb = {
  get: (): Settings => {
    return db.prepare('SELECT * FROM settings WHERE id = 1').get() as Settings;
  },
  update: (settings: Partial<Omit<Settings, 'id' | 'serpApiUsed' | 'searchApiUsed' | 'hasdataUsed' | 'fastFlightsUsed'>>): void => {
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
        hasdataApiKey = @hasdataApiKey,
        dataSourceStrategy = @dataSourceStrategy,
        fallbackStrategyMode = @fallbackStrategyMode,
        roundRobinIndex = @roundRobinIndex,
        serpApiEnabled = @serpApiEnabled,
        searchApiEnabled = @searchApiEnabled,
        hasdataEnabled = @hasdataEnabled,
        fastFlightsEnabled = @fastFlightsEnabled,
        fliEnabled = @fliEnabled,
        serpApiQuota = @serpApiQuota,
        searchApiQuota = @searchApiQuota,
        hasdataQuota = @hasdataQuota,
        fastFlightsQuota = @fastFlightsQuota,
        serpApiPaused = @serpApiPaused,
        searchApiPaused = @searchApiPaused,
        hasdataPaused = @hasdataPaused,
        fastFlightsPaused = @fastFlightsPaused,
        fliPaused = @fliPaused,
        notificationsEnabled = @notificationsEnabled,
        discordEnabled = @discordEnabled,
        discordWebhookUrl = @discordWebhookUrl,
        slackEnabled = @slackEnabled,
        slackWebhookUrl = @slackWebhookUrl,
        genericWebhookEnabled = @genericWebhookEnabled,
        genericWebhookUrl = @genericWebhookUrl,
        smtpEnabled = @smtpEnabled,
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
  getNextRoundRobinIndex: (activeCount: number): number => {
    if (activeCount <= 0) return 0;
    const atomicTx = db.transaction(() => {
      const row = db.prepare('SELECT roundRobinIndex FROM settings WHERE id = 1').get() as { roundRobinIndex: number } | undefined;
      const currentIndex = row?.roundRobinIndex ?? 0;
      const nextIndex = (currentIndex + 1) % activeCount;
      db.prepare('UPDATE settings SET roundRobinIndex = ? WHERE id = 1').run(nextIndex);
      return currentIndex % activeCount;
    });
    return atomicTx();
  },
  incrementApiUsage: (source: 'serpapi' | 'searchapi' | 'hasdata' | 'fastflights'): void => {
    if (source === 'serpapi') db.prepare('UPDATE settings SET serpApiUsed = serpApiUsed + 1 WHERE id = 1').run();
    if (source === 'searchapi') db.prepare('UPDATE settings SET searchApiUsed = searchApiUsed + 1 WHERE id = 1').run();
    if (source === 'hasdata') db.prepare('UPDATE settings SET hasdataUsed = hasdataUsed + 1 WHERE id = 1').run();
    if (source === 'fastflights') db.prepare('UPDATE settings SET fastFlightsUsed = fastFlightsUsed + 1 WHERE id = 1').run();
  },
  resetApiUsage: (newResetDate: string): void => {
    const stmt = db.prepare('UPDATE settings SET serpApiUsed = 0, searchApiUsed = 0, hasdataUsed = 0, fastFlightsUsed = 0, quotaResetDate = @newResetDate WHERE id = 1');
    stmt.run({ newResetDate });
  }
};