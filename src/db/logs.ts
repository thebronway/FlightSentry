import db from './index';

export interface DataSourceLog {
  id: number;
  provider: string;
  route?: string | null;
  flightNumber?: string | null;
  departureDate?: string | null;
  status: string;
  statusCode?: number | null;
  errorMessage?: string | null;
  durationMs?: number | null;
  queriedAt: string;
}

export const logsDb = {
  getByProvider: (provider: string, limit: number = 30): DataSourceLog[] => {
    return db
      .prepare(
        'SELECT * FROM datasource_logs WHERE provider = ? ORDER BY queriedAt DESC LIMIT ?'
      )
      .all(provider, limit) as DataSourceLog[];
  },

  insert: (log: Omit<DataSourceLog, 'id' | 'queriedAt'> & { queriedAt?: string }): void => {
    const stmt = db.prepare(`
      INSERT INTO datasource_logs (provider, route, flightNumber, departureDate, status, statusCode, errorMessage, durationMs, queriedAt)
      VALUES (@provider, @route, @flightNumber, @departureDate, @status, @statusCode, @errorMessage, @durationMs, @queriedAt)
    `);

    stmt.run({
      provider: log.provider,
      route: log.route ?? null,
      flightNumber: log.flightNumber ?? null,
      departureDate: log.departureDate ?? null,
      status: log.status,
      statusCode: log.statusCode ?? null,
      errorMessage: log.errorMessage ?? null,
      durationMs: log.durationMs ?? null,
      queriedAt: log.queriedAt || new Date().toISOString(),
    });

    // Automatically prune old logs past 200 per provider to preserve storage
    db.prepare(`
      DELETE FROM datasource_logs
      WHERE provider = ? AND id NOT IN (
        SELECT id FROM datasource_logs WHERE provider = ? ORDER BY queriedAt DESC LIMIT 200
      )
    `).run(log.provider, log.provider);
  },
};