import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Uses the Docker volume path in production, local folder in dev
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/app/data/flightsentry.db' 
  : path.join(process.cwd(), 'data', 'flightsentry.db');

let dbInstance: InstanceType<typeof Database> | null = null;

function getDb(): InstanceType<typeof Database> {
  if (!dbInstance) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    dbInstance = new Database(dbPath, { fileMustExist: false, timeout: 10000 });

    // Configure a 10-second busy timeout so concurrent processes wait for locks
    dbInstance.pragma('busy_timeout = 10000');

    // Enable Write-Ahead Logging for better concurrent performance (web + worker)
    dbInstance.pragma('journal_mode = WAL');

    // Enforce foreign keys
    dbInstance.pragma('foreign_keys = ON');
  }
  return dbInstance;
}

// Proxy all database operations lazily so importing `db` doesn't lock the database during Next.js build time
const db = new Proxy({} as InstanceType<typeof Database>, {
  get(_target, prop: string | symbol) {
    const instance = getDb();
    const value = (instance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

export default db;