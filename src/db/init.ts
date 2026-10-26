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
    ];

    for (const migration of migrations) {
        try {
            db.exec(migration);
        } catch {
            // Column already exists
        }
    }
        
    // Seed the single settings row if it doesn't exist (APIs disabled by default)
    const getSettings = db.prepare('SELECT id FROM settings WHERE id = 1');
    if (!getSettings.get()) {
        const insertSettings = db.prepare(`
            INSERT INTO settings (
                id, timezone, quotaResetDate, scheduleFarOut, scheduleStandard, 
                scheduleFinalStretch, operatingHoursStart, operatingHoursEnd, dataSourceStrategy,
                fallbackStrategyMode, serpApiEnabled, searchApiEnabled, fastFlightsEnabled,
                serpApiQuota, searchApiQuota, fastFlightsQuota, notificationsEnabled
            ) 
            VALUES (
                1, 'UTC', date('now', 'start of month', '+1 month'), 
                48, 24, 12, 7, 23, 'serpapi,searchapi,fastflights',
                'sequential-query', 0, 0, 0, 100, 100, 100, 1
            )
        `);
        insertSettings.run();
    }
}