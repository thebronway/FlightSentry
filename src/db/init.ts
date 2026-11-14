import db from './index';
import { schema } from './schema';

export function initDb() {
    db.exec(schema);

    // Schema migration checks for existing databases
    const migrations = [
        "ALTER TABLE flights ADD COLUMN cabinClass TEXT NOT NULL DEFAULT 'economy'",
        "ALTER TABLE flights ADD COLUMN purchasePrice REAL",
        "ALTER TABLE flights ADD COLUMN minDropDollar REAL",
        "ALTER TABLE flights ADD COLUMN minDropPercent REAL",
        "ALTER TABLE settings ADD COLUMN roundRobinIndex INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE settings ADD COLUMN fliEnabled INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE settings ADD COLUMN fliPaused INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE settings ADD COLUMN discordEnabled INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE settings ADD COLUMN discordWebhookUrl TEXT",
        "ALTER TABLE settings ADD COLUMN slackEnabled INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE settings ADD COLUMN slackWebhookUrl TEXT",
        "ALTER TABLE settings ADD COLUMN genericWebhookEnabled INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE settings ADD COLUMN genericWebhookUrl TEXT",
        "ALTER TABLE settings ADD COLUMN smtpEnabled INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE price_history ADD COLUMN airline TEXT",
        "ALTER TABLE price_history ADD COLUMN flightNumber TEXT",
        "ALTER TABLE price_history ADD COLUMN metadata TEXT",
        "ALTER TABLE price_history ADD COLUMN sourceUsed TEXT",
        "ALTER TABLE settings ADD COLUMN serpApiResetDate TEXT",
        "ALTER TABLE settings ADD COLUMN searchApiResetDate TEXT",
        "ALTER TABLE settings ADD COLUMN checkStartTime TEXT DEFAULT '06:00'",
        "ALTER TABLE flights ADD COLUMN earliestDeparture TEXT",
        "ALTER TABLE flights ADD COLUMN latestDeparture TEXT",
        "ALTER TABLE flights ADD COLUMN noRedeye INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE flights ADD COLUMN priceTrackingDirection TEXT NOT NULL DEFAULT 'drop'",
        "ALTER TABLE flights ADD COLUMN minIncreaseDollar REAL",
        "ALTER TABLE flights ADD COLUMN minIncreasePercent REAL",
        "ALTER TABLE flights ADD COLUMN maxStops INTEGER",
        "ALTER TABLE settings ADD COLUMN quotaResetDay INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE settings ADD COLUMN serpApiResetDay INTEGER DEFAULT 1",
        "ALTER TABLE settings ADD COLUMN searchApiResetDay INTEGER DEFAULT 1",
        "ALTER TABLE settings ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD'",
        "ALTER TABLE settings ADD COLUMN minIncreaseDollar REAL NOT NULL DEFAULT 50.0",
        "ALTER TABLE settings ADD COLUMN minIncreasePercent REAL NOT NULL DEFAULT 10.0",
        "ALTER TABLE flights ADD COLUMN currency TEXT",
        "ALTER TABLE settings ADD COLUMN pointsCurrencies TEXT NOT NULL DEFAULT '[]'",
        "ALTER TABLE settings ADD COLUMN defaultCabinClass TEXT NOT NULL DEFAULT 'economy'",
        "ALTER TABLE settings ADD COLUMN defaultFareTier TEXT NOT NULL DEFAULT 'Standard'",
        "ALTER TABLE settings ADD COLUMN defaultNoRedeye INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE settings ADD COLUMN defaultMaxStops INTEGER",
        "ALTER TABLE settings ADD COLUMN defaultIncludedAirlines TEXT",
        "ALTER TABLE settings ADD COLUMN defaultExcludedAirlines TEXT",
        "ALTER TABLE settings ADD COLUMN maxStoredItineraries INTEGER NOT NULL DEFAULT 12",
        "ALTER TABLE settings ADD COLUMN carrierDiversityEnabled INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE flights ADD COLUMN monitorRouteAlternatives INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE flights ADD COLUMN originalPurchasePrice REAL",
        "ALTER TABLE flights ADD COLUMN bookingDate TEXT",
        "ALTER TABLE flights ADD COLUMN isManual INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE flights ADD COLUMN maxLayoverMinutes INTEGER",
        "ALTER TABLE flights ADD COLUMN excludedConnectingAirports TEXT",
        "ALTER TABLE flights ADD COLUMN maxTotalDurationMinutes INTEGER",
        "ALTER TABLE flights ADD COLUMN includedAlliances TEXT",
        "ALTER TABLE flights ADD COLUMN excludedAlliances TEXT",
        "ALTER TABLE settings ADD COLUMN defaultMaxLayoverMinutes INTEGER",
        "ALTER TABLE settings ADD COLUMN defaultExcludedConnectingAirports TEXT",
        "ALTER TABLE settings ADD COLUMN defaultMaxTotalDurationMinutes INTEGER",
        "ALTER TABLE settings ADD COLUMN githubSyncEnabled INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE settings ADD COLUMN flightsentryScraperEnabled INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE settings ADD COLUMN flightsentryScraperPrioritizeFirst INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE settings ADD COLUMN flightsentryScraperUrl TEXT",
        "ALTER TABLE settings ADD COLUMN flightsentryScraperApiKey TEXT",
        "ALTER TABLE settings ADD COLUMN flightsentryScraperPaused INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE settings ADD COLUMN flightsentryScraperUsed INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE settings ADD COLUMN serpApiQuotaMode TEXT NOT NULL DEFAULT 'monthly'",
        "ALTER TABLE settings ADD COLUMN searchApiQuotaMode TEXT NOT NULL DEFAULT 'monthly'",
        "ALTER TABLE settings ADD COLUMN pastFlightRetentionDays INTEGER",
    ];
    for (const migration of migrations) {
        try {
            db.exec(migration);
        } catch {
            // Column already exists
        }
    }

    // Ensure composite index exists for price_history lookups on existing databases
    try {
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_price_history_flight_status_checked
                ON price_history(flightId, status, checkedAt DESC)
        `);
    } catch {
        // Ignored
    }

    // Migrate legacy flight statuses to standardized domain vocabulary
    try {
        db.exec(`
            UPDATE flights 
            SET status = 'Booked' 
            WHERE status IN ('Upcoming', 'Active') 
              AND ((purchasePrice IS NOT NULL AND purchasePrice > 0) OR (pnr IS NOT NULL AND TRIM(pnr) != ''));

            UPDATE flights 
            SET status = 'Watching' 
            WHERE status IN ('Upcoming', 'Active');
        `);
    } catch {
        // Ignored
    }

    // Ensure datasource_logs table exists for existing databases
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS datasource_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider TEXT NOT NULL,
                route TEXT,
                flightNumber TEXT,
                departureDate TEXT,
                status TEXT NOT NULL,
                statusCode INTEGER,
                errorMessage TEXT,
                durationMs INTEGER,
                queriedAt TEXT NOT NULL
            )
        `);
    } catch {
        // Ignored
    }

    // Ensure release_sync_state table and singleton row exist
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS release_sync_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                latestVersion TEXT,
                announcementsJson TEXT NOT NULL DEFAULT '[]',
                lastCheckedAt TEXT,
                lastSyncStatus TEXT NOT NULL DEFAULT 'never',
                dismissedUpdateVersion TEXT,
                dismissedUpdateUntil TEXT,
                dismissedAnnouncementIds TEXT NOT NULL DEFAULT '[]'
            )
        `);
        db.prepare(`
            INSERT OR IGNORE INTO release_sync_state (
                id, latestVersion, announcementsJson, lastCheckedAt, lastSyncStatus,
                dismissedUpdateVersion, dismissedUpdateUntil, dismissedAnnouncementIds
            ) VALUES (1, NULL, '[]', NULL, 'never', NULL, NULL, '[]')
        `).run();
    } catch {
        // Ignored
    }

    // Initialize per-provider reset dates and recurring days from quotaResetDate if unset
    try {
        const row = db.prepare('SELECT quotaResetDate, serpApiResetDate, searchApiResetDate, quotaResetDay, serpApiResetDay, searchApiResetDay FROM settings WHERE id = 1').get() as any;
        if (row) {
            const fallbackReset = row.quotaResetDate || new Date().toISOString().split('T')[0];
            if (!row.serpApiResetDate) db.prepare('UPDATE settings SET serpApiResetDate = ? WHERE id = 1').run(fallbackReset);
            if (!row.searchApiResetDate) db.prepare('UPDATE settings SET searchApiResetDate = ? WHERE id = 1').run(fallbackReset);

            const parseDay = (dateStr?: string | null): number => {
                if (!dateStr) return 1;
                const parts = dateStr.split('-');
                const d = parseInt(parts[2], 10);
                return (!isNaN(d) && d >= 1 && d <= 31) ? d : 1;
            };

            const globalDay = row.quotaResetDay || parseDay(row.quotaResetDate);
            const serpDay = row.serpApiResetDay || parseDay(row.serpApiResetDate || row.quotaResetDate);
            const searchDay = row.searchApiResetDay || parseDay(row.searchApiResetDate || row.quotaResetDate);

            db.prepare(`
                UPDATE settings SET 
                    quotaResetDay = COALESCE(quotaResetDay, ?),
                    serpApiResetDay = COALESCE(serpApiResetDay, ?),
                    searchApiResetDay = COALESCE(searchApiResetDay, ?)
                WHERE id = 1
            `).run(globalDay, serpDay, searchDay);
        }
    } catch {
        // Ignored
    }

    // Ensure container environment TZ is synced if settings row is default 'UTC'
    try {
        const containerTz = process.env.TZ;
        if (containerTz && containerTz !== 'UTC') {
            const row = db.prepare('SELECT timezone FROM settings WHERE id = 1').get() as any;
            if (row && (!row.timezone || row.timezone === 'UTC')) {
                db.prepare('UPDATE settings SET timezone = ? WHERE id = 1').run(containerTz);
            }
        }
    } catch {
        // Ignored
    }

    // Migrate legacy fastflights / fli / hasdata entries and ensure all current providers exist in dataSourceStrategy
    try {
        const row = db.prepare('SELECT dataSourceStrategy FROM settings WHERE id = 1').get() as { dataSourceStrategy?: string } | undefined;
        if (row && row.dataSourceStrategy) {
            const rawList = row.dataSourceStrategy
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
                .map(s => (s === 'fastflights' ? 'flightsentry-scraper' : s))
                .filter(s => s !== 'fli' && s !== 'hasdata');
            const list: string[] = [];
            for (const item of rawList) {
                if (!list.includes(item)) {
                    list.push(item);
                }
            }
            const allProviders = ['serpapi', 'searchapi', 'flightsentry-scraper'];
            for (const p of allProviders) {
                if (!list.includes(p)) {
                    list.push(p);
                }
            }
            const nextStrategy = list.join(',');
            if (nextStrategy !== row.dataSourceStrategy) {
                db.prepare('UPDATE settings SET dataSourceStrategy = ? WHERE id = 1').run(nextStrategy);
            }
        }
    } catch {
        // Ignored
    }
            
    // Seed the single settings row if it doesn't exist (APIs disabled by default)
    const getSettings = db.prepare('SELECT id FROM settings WHERE id = 1');
    if (!getSettings.get()) {
        const insertSettings = db.prepare(`
            INSERT INTO settings (
                id, timezone, quotaResetDate, quotaResetDay, serpApiResetDay, searchApiResetDay,
                scheduleFarOut, scheduleStandard, 
                scheduleFinalStretch, operatingHoursStart, operatingHoursEnd, dataSourceStrategy,
                fallbackStrategyMode, roundRobinIndex, serpApiEnabled, searchApiEnabled,
                flightsentryScraperEnabled, fliEnabled, serpApiQuota, searchApiQuota,
                serpApiQuotaMode, searchApiQuotaMode,
                notificationsEnabled, discordEnabled, slackEnabled,
                genericWebhookEnabled, smtpEnabled, currency, minIncreaseDollar, minIncreasePercent,
                pointsCurrencies, defaultCabinClass, defaultFareTier, defaultNoRedeye,
                defaultMaxStops, defaultIncludedAirlines, defaultExcludedAirlines,
                maxStoredItineraries, carrierDiversityEnabled, githubSyncEnabled
            ) 
            VALUES (
                1, 'UTC', date('now', 'start of month', '+1 month'), 1, 1, 1, 
                48, 24, 12, 7, 23, 'serpapi,searchapi,flightsentry-scraper',
                'sequential-query', 0, 0, 0, 0, 0, 100, 100, 'monthly', 'monthly', 1, 0, 0, 0, 0,
                'USD', 50.0, 10.0, '[]', 'economy', 'Standard', 0, NULL, NULL, NULL, 12, 1, 1
            )
        `);
        insertSettings.run();
    }
}