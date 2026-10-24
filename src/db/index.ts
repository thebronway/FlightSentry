import Database from 'better-sqlite3';
import path from 'path';

// Uses the Docker volume path in production, local folder in dev
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/app/data/flightdocket.db' 
  : path.join(process.cwd(), 'data', 'flightdocket.db');

const db = new Database(dbPath, { fileMustExist: false });

// Enable Write-Ahead Logging for better concurrent performance (web + worker)
db.pragma('journal_mode = WAL');
// Enforce foreign keys
db.pragma('foreign_keys = ON');

export default db;