import db from './index';
import { schema } from './schema';

export function initDb() {
    db.exec(schema);
    
    // Seed the single settings row if it doesn't exist
    const getSettings = db.prepare('SELECT id FROM settings WHERE id = 1');
    if (!getSettings.get()) {
        const insertSettings = db.prepare(`
            INSERT INTO settings (id, timezone, quotaResetDate) 
            VALUES (1, 'UTC', date('now', 'start of month', '+1 month'))
        `);
        insertSettings.run();
    }
}