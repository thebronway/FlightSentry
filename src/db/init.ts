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
        "ALTER TABLE settings ADD COLUMN hasdataApiKey TEXT",
        "ALTER TABLE settings ADD COLUMN hasdataEnabled INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE settings ADD COLUMN hasdataQuota INTEGER NOT NULL DEFAULT 100",
        "ALTER TABLE settings ADD COLUMN hasdataUsed INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE settings ADD COLUMN hasdataPaused INTEGER NOT NULL DEFAULT 0",
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
    ];
    for (const migration of migrations) {
        try {
            db.exec(migration);
        } catch {
            // Column already exists
        }
    }

    // Ensure all 5 providers exist in dataSourceStrategy for existing databases
    try {
        const row = db.prepare('SELECT dataSourceStrategy FROM settings WHERE id = 1').get() as { dataSourceStrategy?: string } | undefined;
        if (row && row.dataSourceStrategy) {
            const list = row.dataSourceStrategy.split(',').map(s => s.trim()).filter(Boolean);
            const allProviders = ['serpapi', 'searchapi', 'hasdata', 'fastflights'];
            let modified = false;
            for (const p of allProviders) {
                if (!list.includes(p)) {
                    list.push(p);
                    modified = true;
                }
            }
            if (modified) {
                db.prepare('UPDATE settings SET dataSourceStrategy = ? WHERE id = 1').run(list.join(','));
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
                id, timezone, quotaResetDate, scheduleFarOut, scheduleStandard, 
                scheduleFinalStretch, operatingHoursStart, operatingHoursEnd, dataSourceStrategy,
                fallbackStrategyMode, roundRobinIndex, serpApiEnabled, searchApiEnabled, hasdataEnabled,
                fastFlightsEnabled, fliEnabled, serpApiQuota, searchApiQuota, hasdataQuota,
                fastFlightsQuota, notificationsEnabled, discordEnabled, slackEnabled,
                genericWebhookEnabled, smtpEnabled
            ) 
            VALUES (
                1, 'UTC', date('now', 'start of month', '+1 month'), 
                48, 24, 12, 7, 23, 'serpapi,searchapi,hasdata,fastflights,fli',
                'sequential-query', 0, 0, 0, 0, 0, 0, 100, 100, 100, 100, 1, 0, 0, 0, 0
            )
        `);
        insertSettings.run();
    }
}