import db from './index';
import { initDb } from './init';
import { ApiRequestLog } from '@/types';

let tableEnsured = false;

function ensureRequestLogsTable(): void {
  if (tableEnsured) return;
  try {
    db.prepare('SELECT 1 FROM api_request_logs LIMIT 1').get();
    tableEnsured = true;
  } catch {
    initDb();
    tableEnsured = true;
  }
}

export const apiRequestLogsDb = {
  insert: (entry: Omit<ApiRequestLog, 'id' | 'createdAt'> & { createdAt?: string }): void => {
    ensureRequestLogsTable();
    const createdAt = entry.createdAt || new Date().toISOString();

    db.prepare(`
      INSERT INTO api_request_logs (apiKeyId, keyPrefix, method, path, statusCode, ipAddress, durationMs, createdAt)
      VALUES (@apiKeyId, @keyPrefix, @method, @path, @statusCode, @ipAddress, @durationMs, @createdAt)
    `).run({
      apiKeyId: entry.apiKeyId ?? null,
      keyPrefix: entry.keyPrefix ?? null,
      method: entry.method.slice(0, 16),
      path: entry.path.slice(0, 255),
      statusCode: entry.statusCode,
      ipAddress: entry.ipAddress ? entry.ipAddress.slice(0, 64) : null,
      durationMs: entry.durationMs ?? null,
      createdAt,
    });

    // Retain most recent 1,000 API audit log rows
    db.prepare(`
      DELETE FROM api_request_logs
      WHERE id NOT IN (
        SELECT id FROM api_request_logs ORDER BY createdAt DESC, id DESC LIMIT 1000
      )
    `).run();
  },

  listRecent: (limit = 100): ApiRequestLog[] => {
    ensureRequestLogsTable();
    const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
    return db
      .prepare('SELECT * FROM api_request_logs ORDER BY createdAt DESC, id DESC LIMIT ?')
      .all(safeLimit) as ApiRequestLog[];
  },
};