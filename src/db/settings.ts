import db from './index';
import { Settings } from '../types';

export const settingsDb = {
  get: (): Settings => {
    return db.prepare('SELECT * FROM settings WHERE id = 1').get() as Settings;
  },

  update: (settings: Partial<Omit<Settings, 'id' | 'apiSearchesUsed'>>): void => {
    const current = settingsDb.get();
    const updated = { ...current, ...settings };
    
    const stmt = db.prepare(`
      UPDATE settings SET 
        serpApiKey = @serpApiKey,
        appriseUrl = @appriseUrl,
        timezone = @timezone,
        checkHours = @checkHours,
        minDropDollar = @minDropDollar,
        minDropPercent = @minDropPercent,
        monthlyQuota = @monthlyQuota,
        globalPause = @globalPause
      WHERE id = 1
    `);
    stmt.run(updated);
  },

  incrementApiUsage: (): void => {
    db.prepare('UPDATE settings SET apiSearchesUsed = apiSearchesUsed + 1 WHERE id = 1').run();
  },

  resetApiUsage: (newResetDate: string): void => {
    const stmt = db.prepare('UPDATE settings SET apiSearchesUsed = 0, quotaResetDate = @newResetDate WHERE id = 1');
    stmt.run({ newResetDate });
  }
};