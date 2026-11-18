import db from './index';
import { SearchTelemetryItem } from '../types';

let tableEnsured = false;

function ensureTelemetryTable(): void {
  if (tableEnsured) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS search_telemetry (
          id TEXT PRIMARY KEY,
          flightId INTEGER,
          searchKind TEXT NOT NULL DEFAULT 'fare_search',
          context TEXT NOT NULL,
          route TEXT,
          flightNumber TEXT,
          departureDate TEXT,
          activeProvider TEXT NOT NULL,
          providerLabel TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'searching',
          failoverReason TEXT,
          previousProvider TEXT,
          previousProviderLabel TEXT,
          attemptNumber INTEGER NOT NULL DEFAULT 1,
          totalProviders INTEGER NOT NULL DEFAULT 1,
          startedAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          completedAt TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_search_telemetry_updated
          ON search_telemetry(updatedAt DESC);
    `);
    tableEnsured = true;
  } catch {
    // Table will be created by initDb() if locked momentarily
  }
}

export const searchTelemetryDb = {
  upsert: (item: SearchTelemetryItem): void => {
    ensureTelemetryTable();
    db.prepare(`
      INSERT INTO search_telemetry (
        id, flightId, searchKind, context, route, flightNumber, departureDate,
        activeProvider, providerLabel, status, failoverReason,
        previousProvider, previousProviderLabel, attemptNumber, totalProviders,
        startedAt, updatedAt, completedAt
      ) VALUES (
        @id, @flightId, @searchKind, @context, @route, @flightNumber, @departureDate,
        @activeProvider, @providerLabel, @status, @failoverReason,
        @previousProvider, @previousProviderLabel, @attemptNumber, @totalProviders,
        @startedAt, @updatedAt, @completedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        activeProvider = excluded.activeProvider,
        providerLabel = excluded.providerLabel,
        status = excluded.status,
        failoverReason = excluded.failoverReason,
        previousProvider = excluded.previousProvider,
        previousProviderLabel = excluded.previousProviderLabel,
        attemptNumber = excluded.attemptNumber,
        totalProviders = excluded.totalProviders,
        updatedAt = excluded.updatedAt,
        completedAt = excluded.completedAt
    `).run({
      id: item.id,
      flightId: item.flightId ?? null,
      searchKind: item.searchKind,
      context: item.context,
      route: item.route ?? null,
      flightNumber: item.flightNumber ?? null,
      departureDate: item.departureDate ?? null,
      activeProvider: item.activeProvider,
      providerLabel: item.providerLabel,
      status: item.status,
      failoverReason: item.failoverReason ?? null,
      previousProvider: item.previousProvider ?? null,
      previousProviderLabel: item.previousProviderLabel ?? null,
      attemptNumber: item.attemptNumber,
      totalProviders: item.totalProviders,
      startedAt: item.startedAt,
      updatedAt: item.updatedAt,
      completedAt: item.completedAt ?? null,
    });
  },

  update: (id: string, patch: Partial<Omit<SearchTelemetryItem, 'id'>>): void => {
    ensureTelemetryTable();
    const sets: string[] = [];
    const params: Record<string, unknown> = { id };

    const fields: Array<keyof Omit<SearchTelemetryItem, 'id'>> = [
      'activeProvider',
      'providerLabel',
      'status',
      'failoverReason',
      'previousProvider',
      'previousProviderLabel',
      'attemptNumber',
      'totalProviders',
      'updatedAt',
      'completedAt',
    ];

    for (const field of fields) {
      if (patch[field] !== undefined) {
        sets.push(`${field} = @${field}`);
        params[field] = patch[field];
      }
    }

    if (sets.length === 0) return;
    db.prepare(`UPDATE search_telemetry SET ${sets.join(', ')} WHERE id = @id`).run(params);
  },

  getActiveAndRecent: (recentWindowMs: number = 8000): SearchTelemetryItem[] => {
    ensureTelemetryTable();
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const staleInFlightCutoff = new Date(nowMs - 120_000).toISOString();
    const pruneCutoff = new Date(nowMs - 300_000).toISOString();
    const recentCompletedCutoff = new Date(nowMs - recentWindowMs).toISOString();

    // Auto-expire orphaned searches if a worker restarted mid-query
    db.prepare(`
      UPDATE search_telemetry
      SET status = 'failed', completedAt = @nowIso, updatedAt = @nowIso
      WHERE completedAt IS NULL AND updatedAt < @staleInFlightCutoff
    `).run({ nowIso, staleInFlightCutoff });

    // Prune entries older than 5 minutes
    db.prepare(`
      DELETE FROM search_telemetry WHERE updatedAt < @pruneCutoff
    `).run({ pruneCutoff });

    return db
      .prepare(`
        SELECT * FROM search_telemetry
        WHERE completedAt IS NULL OR completedAt >= @recentCompletedCutoff
        ORDER BY startedAt ASC
      `)
      .all({ recentCompletedCutoff }) as SearchTelemetryItem[];
  },
};