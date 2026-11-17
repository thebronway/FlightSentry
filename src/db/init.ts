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
        "ALTER TABLE flights ADD COLUMN taxesAmount REAL",
        "ALTER TABLE flights ADD COLUMN taxesCurrency TEXT",
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
        "ALTER TABLE settings ADD COLUMN openfareScraperEnabled INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE settings ADD COLUMN openfareScraperPrioritizeFirst INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE settings ADD COLUMN openfareScraperUrl TEXT",
        "ALTER TABLE settings ADD COLUMN openfareScraperApiKey TEXT",
        "ALTER TABLE settings ADD COLUMN openfareScraperPaused INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE settings ADD COLUMN openfareScraperUsed INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE settings ADD COLUMN serpApiQuotaMode TEXT NOT NULL DEFAULT 'monthly'",
        "ALTER TABLE settings ADD COLUMN searchApiQuotaMode TEXT NOT NULL DEFAULT 'monthly'",
        "ALTER TABLE settings ADD COLUMN pastFlightRetentionDays INTEGER",
        "ALTER TABLE flights ADD COLUMN bookingAirline TEXT",
        "ALTER TABLE settings ADD COLUMN emailScannerEnabled INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE settings ADD COLUMN emailScannerPollIntervalMinutes INTEGER NOT NULL DEFAULT 15",
        "ALTER TABLE settings ADD COLUMN emailScannerNotifyEnabled INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE settings ADD COLUMN appBaseUrl TEXT",
        "ALTER TABLE email_queue ADD COLUMN isPoints INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE email_queue ADD COLUMN taxesAmount REAL",
        "ALTER TABLE email_queue ADD COLUMN taxesCurrency TEXT",
        "ALTER TABLE settings ADD COLUMN onboardingCompleted INTEGER NOT NULL DEFAULT 0",
    ];
    for (const migration of migrations) {
        try {
            db.exec(migration);
            if (migration.includes('onboardingCompleted')) {
                // Existing installations with tracked flights or enabled data sources have already been set up
                db.exec(`
                    UPDATE settings
                    SET onboardingCompleted = 1
                    WHERE id = 1
                      AND (
                        serpApiEnabled = 1
                        OR searchApiEnabled = 1
                        OR openfareScraperEnabled = 1
                        OR EXISTS (SELECT 1 FROM flights LIMIT 1)
                      )
                `);
            }
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

    // Ensure IMAP email scanner tables and indexes exist for existing databases
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS imap_accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                label TEXT NOT NULL,
                host TEXT NOT NULL,
                port INTEGER NOT NULL DEFAULT 993,
                tls INTEGER NOT NULL DEFAULT 1,
                username TEXT NOT NULL,
                encryptedPassword TEXT NOT NULL,
                folder TEXT NOT NULL DEFAULT 'INBOX',
                enabled INTEGER NOT NULL DEFAULT 1,
                lastUid INTEGER NOT NULL DEFAULT 0,
                uidValidity INTEGER,
                baselineTimestamp TEXT NOT NULL,
                lastCheckedAt TEXT,
                lastError TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS email_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                accountId INTEGER,
                accountLabel TEXT NOT NULL,
                messageId TEXT,
                emailSubject TEXT,
                emailFrom TEXT,
                emailDate TEXT,
                eventType TEXT NOT NULL,
                dedupeKey TEXT NOT NULL,
                pnr TEXT,
                airline TEXT,
                flightNumber TEXT,
                origin TEXT,
                destination TEXT,
                departureDate TEXT,
                departureTime TEXT,
                arrivalTime TEXT,
                cabinClass TEXT,
                fareTier TEXT,
                price REAL,
                currency TEXT,
                isPoints INTEGER NOT NULL DEFAULT 0,
                taxesAmount REAL,
                taxesCurrency TEXT,
                matchedFlightId INTEGER,
                confidence TEXT NOT NULL DEFAULT 'medium',
                parserSource TEXT NOT NULL DEFAULT 'heuristic',
                status TEXT NOT NULL DEFAULT 'pending',
                createdAt TEXT NOT NULL,
                resolvedAt TEXT,
                FOREIGN KEY (accountId) REFERENCES imap_accounts(id) ON DELETE CASCADE,
                FOREIGN KEY (matchedFlightId) REFERENCES flights(id) ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS idx_email_queue_status_created
                ON email_queue(status, createdAt DESC);

            CREATE INDEX IF NOT EXISTS idx_email_queue_dedupe
                ON email_queue(dedupeKey, status);

            CREATE TABLE IF NOT EXISTS email_seen_messages (
                messageId TEXT PRIMARY KEY,
                accountId INTEGER,
                processedAt TEXT NOT NULL
            );
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

    // Ensure all current providers exist in dataSourceStrategy
    try {
        const row = db.prepare('SELECT dataSourceStrategy FROM settings WHERE id = 1').get() as { dataSourceStrategy?: string } | undefined;
        if (row && row.dataSourceStrategy) {
            const allProviders = ['serpapi', 'searchapi', 'openfarescraper'];
            const list: string[] = [];
            for (const item of row.dataSourceStrategy.split(',').map(s => s.trim()).filter(Boolean)) {
                if (allProviders.includes(item) && !list.includes(item)) {
                    list.push(item);
                }
            }
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
            
    // Ensure authentication tables and default disabled singleton row exist
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS auth_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                enabled INTEGER NOT NULL DEFAULT 0,
                username TEXT NOT NULL DEFAULT 'admin',
                passwordHash TEXT,
                passwordSalt TEXT,
                sessionDurationDays INTEGER NOT NULL DEFAULT 30,
                updatedAt TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS auth_sessions (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                userAgent TEXT,
                ipAddress TEXT,
                createdAt TEXT NOT NULL,
                lastActiveAt TEXT NOT NULL,
                expiresAt TEXT NOT NULL,
                revokedAt TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_auth_sessions_active
                ON auth_sessions(revokedAt, expiresAt);

            CREATE TABLE IF NOT EXISTS auth_passkeys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                credentialId TEXT NOT NULL UNIQUE,
                publicKey TEXT NOT NULL,
                counter INTEGER NOT NULL DEFAULT 0,
                transports TEXT,
                deviceType TEXT,
                backedUp INTEGER NOT NULL DEFAULT 0,
                name TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                lastUsedAt TEXT
            );

            CREATE TABLE IF NOT EXISTS auth_webauthn_challenges (
                challenge TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                expiresAt TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS auth_login_attempts (
                ipAddress TEXT PRIMARY KEY,
                failedCount INTEGER NOT NULL DEFAULT 0,
                lockedUntil TEXT,
                lastAttemptAt TEXT NOT NULL
            );
        `);
        try {
            db.exec("ALTER TABLE auth_config ADD COLUMN sessionDurationDays INTEGER NOT NULL DEFAULT 30");
        } catch {
            // Column already exists
        }
        db.prepare(`
            INSERT OR IGNORE INTO auth_config (id, enabled, username, passwordHash, passwordSalt, sessionDurationDays, updatedAt)
            VALUES (1, 0, 'admin', NULL, NULL, 30, ?)
        `).run(new Date().toISOString());
    } catch {
        // Ignored
    }

    // Ensure Public API keys and request audit log tables exist
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS api_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                keyPrefix TEXT NOT NULL,
                keyHash TEXT NOT NULL UNIQUE,
                scopes TEXT NOT NULL DEFAULT '["read"]',
                expiresAt TEXT,
                lastUsedAt TEXT,
                revokedAt TEXT,
                createdAt TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_api_keys_hash
                ON api_keys(keyHash);

            CREATE INDEX IF NOT EXISTS idx_api_keys_revoked_expires
                ON api_keys(revokedAt, expiresAt);

            CREATE TABLE IF NOT EXISTS api_request_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                apiKeyId INTEGER,
                keyPrefix TEXT,
                method TEXT NOT NULL,
                path TEXT NOT NULL,
                statusCode INTEGER NOT NULL,
                ipAddress TEXT,
                durationMs INTEGER,
                createdAt TEXT NOT NULL,
                FOREIGN KEY (apiKeyId) REFERENCES api_keys(id) ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS idx_api_request_logs_created
                ON api_request_logs(createdAt DESC);
        `);
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
                openfareScraperEnabled, fliEnabled, serpApiQuota, searchApiQuota,
                serpApiQuotaMode, searchApiQuotaMode,
                notificationsEnabled, discordEnabled, slackEnabled,
                genericWebhookEnabled, smtpEnabled, currency, minIncreaseDollar, minIncreasePercent,
                pointsCurrencies, defaultCabinClass, defaultFareTier, defaultNoRedeye,
                defaultMaxStops, defaultIncludedAirlines, defaultExcludedAirlines,
                maxStoredItineraries, carrierDiversityEnabled, githubSyncEnabled,
                emailScannerEnabled, emailScannerPollIntervalMinutes, emailScannerNotifyEnabled, appBaseUrl,
                onboardingCompleted
            ) 
            VALUES (
                1, 'UTC', date('now', 'start of month', '+1 month'), 1, 1, 1, 
                48, 24, 12, 7, 23, 'serpapi,searchapi,openfarescraper',
                'sequential-query', 0, 0, 0, 0, 0, 100, 100, 'monthly', 'monthly', 1, 0, 0, 0, 0,
                'USD', 50.0, 10.0, '[]', 'economy', 'Standard', 0, NULL, NULL, NULL, 12, 1, 1,
                0, 15, 1, NULL, 0
            )
        `);
        insertSettings.run();
    }
}