import db from './index';
import { Settings } from '../types';

export const settingsDb = {
  get: (): Settings => {
    return db.prepare('SELECT * FROM settings WHERE id = 1').get() as Settings;
  },
  update: (settings: Partial<Omit<Settings, 'id' | 'serpApiUsed' | 'searchApiUsed' | 'flightsentryScraperUsed'>>): void => {
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
        roundRobinIndex = @roundRobinIndex,
        serpApiEnabled = @serpApiEnabled,
        searchApiEnabled = @searchApiEnabled,
        flightsentryScraperEnabled = @flightsentryScraperEnabled,
        flightsentryScraperPrioritizeFirst = @flightsentryScraperPrioritizeFirst,
        flightsentryScraperUrl = @flightsentryScraperUrl,
        flightsentryScraperApiKey = @flightsentryScraperApiKey,
        fliEnabled = @fliEnabled,
        serpApiQuota = @serpApiQuota,
        searchApiQuota = @searchApiQuota,
        serpApiQuotaMode = @serpApiQuotaMode,
        searchApiQuotaMode = @searchApiQuotaMode,
        serpApiResetDate = @serpApiResetDate,
        searchApiResetDate = @searchApiResetDate,
        quotaResetDay = @quotaResetDay,
        serpApiResetDay = @serpApiResetDay,
        searchApiResetDay = @searchApiResetDay,
        serpApiPaused = @serpApiPaused,
        searchApiPaused = @searchApiPaused,
        flightsentryScraperPaused = @flightsentryScraperPaused,
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
        checkStartTime = @checkStartTime,
        operatingHoursStart = @operatingHoursStart,
        operatingHoursEnd = @operatingHoursEnd,
        minDropDollar = @minDropDollar,
        minDropPercent = @minDropPercent,
        currency = @currency,
        minIncreaseDollar = @minIncreaseDollar,
        minIncreasePercent = @minIncreasePercent,
        pointsCurrencies = @pointsCurrencies,
        globalPause = @globalPause,
        defaultCabinClass = @defaultCabinClass,
        defaultFareTier = @defaultFareTier,
        defaultNoRedeye = @defaultNoRedeye,
        defaultMaxStops = @defaultMaxStops,
        defaultIncludedAirlines = @defaultIncludedAirlines,
        defaultExcludedAirlines = @defaultExcludedAirlines,
        maxStoredItineraries = @maxStoredItineraries,
        carrierDiversityEnabled = @carrierDiversityEnabled,
        defaultMaxLayoverMinutes = @defaultMaxLayoverMinutes,
        defaultExcludedConnectingAirports = @defaultExcludedConnectingAirports,
        defaultMaxTotalDurationMinutes = @defaultMaxTotalDurationMinutes,
        githubSyncEnabled = @githubSyncEnabled
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
  incrementApiUsage: (source: 'serpapi' | 'searchapi' | 'flightsentry-scraper'): void => {
    if (source === 'serpapi') db.prepare('UPDATE settings SET serpApiUsed = serpApiUsed + 1 WHERE id = 1').run();
    if (source === 'searchapi') db.prepare('UPDATE settings SET searchApiUsed = searchApiUsed + 1 WHERE id = 1').run();
    if (source === 'flightsentry-scraper') db.prepare('UPDATE settings SET flightsentryScraperUsed = flightsentryScraperUsed + 1 WHERE id = 1').run();
  },
  adjustProviderUsage: (
    source: 'serpapi' | 'searchapi',
    mode: 'increment' | 'set',
    value: number
  ): { previousUsed: number; newUsed: number } => {
    const columnMap: Record<'serpapi' | 'searchapi', 'serpApiUsed' | 'searchApiUsed'> = {
      serpapi: 'serpApiUsed',
      searchapi: 'searchApiUsed',
    };
    const column = columnMap[source];
    const adjustTx = db.transaction(() => {
      const row = db.prepare(`SELECT ${column} as used FROM settings WHERE id = 1`).get() as { used: number } | undefined;
      const previousUsed = row?.used ?? 0;
      const sanitizedValue = Math.max(0, Math.round(value));
      const newUsed = mode === 'increment'
        ? Math.max(0, previousUsed + sanitizedValue)
        : sanitizedValue;
      db.prepare(`UPDATE settings SET ${column} = ? WHERE id = 1`).run(newUsed);
      return { previousUsed, newUsed };
    });
    return adjustTx();
  },
  resetApiUsage: (newResetDate: string): void => {
    const stmt = db.prepare(`
      UPDATE settings SET
        serpApiUsed = CASE WHEN COALESCE(serpApiQuotaMode, 'monthly') = 'one-time' THEN serpApiUsed ELSE 0 END,
        searchApiUsed = CASE WHEN COALESCE(searchApiQuotaMode, 'monthly') = 'one-time' THEN searchApiUsed ELSE 0 END,
        flightsentryScraperUsed = 0,
        quotaResetDate = @newResetDate
      WHERE id = 1
    `);
    stmt.run({ newResetDate });
  },
  resetProviderUsage: (source: 'serpapi' | 'searchapi', newResetDate: string): void => {
    if (source === 'serpapi') {
      db.prepare('UPDATE settings SET serpApiUsed = 0, serpApiResetDate = ? WHERE id = 1').run(newResetDate);
    } else if (source === 'searchapi') {
      db.prepare('UPDATE settings SET searchApiUsed = 0, searchApiResetDate = ? WHERE id = 1').run(newResetDate);
    }
  }
};