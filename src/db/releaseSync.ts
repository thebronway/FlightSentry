import db from './index';
import { ReleaseSyncState } from '../types';

const DEFAULT_STATE: ReleaseSyncState = {
  id: 1,
  latestVersion: null,
  announcementsJson: '[]',
  lastCheckedAt: null,
  lastSyncStatus: 'never',
  dismissedUpdateVersion: null,
  dismissedUpdateUntil: null,
  dismissedAnnouncementIds: '[]',
};

function ensureTableAndRow(): void {
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
}

export const releaseSyncDb = {
  get: (): ReleaseSyncState => {
    ensureTableAndRow();
    const row = db
      .prepare('SELECT * FROM release_sync_state WHERE id = 1')
      .get() as ReleaseSyncState | undefined;
    return row ?? { ...DEFAULT_STATE };
  },

  saveSyncResult: (params: {
    latestVersion?: string | null;
    announcementsJson?: string;
    lastCheckedAt: string;
    lastSyncStatus: 'ok' | 'offline' | 'error';
  }): ReleaseSyncState => {
    const current = releaseSyncDb.get();
    const nextLatestVersion =
      params.latestVersion !== undefined ? params.latestVersion : current.latestVersion ?? null;
    const nextAnnouncementsJson =
      params.announcementsJson !== undefined ? params.announcementsJson : current.announcementsJson;

    db.prepare(`
      UPDATE release_sync_state SET
        latestVersion = @latestVersion,
        announcementsJson = @announcementsJson,
        lastCheckedAt = @lastCheckedAt,
        lastSyncStatus = @lastSyncStatus
      WHERE id = 1
    `).run({
      latestVersion: nextLatestVersion,
      announcementsJson: nextAnnouncementsJson,
      lastCheckedAt: params.lastCheckedAt,
      lastSyncStatus: params.lastSyncStatus,
    });

    return releaseSyncDb.get();
  },

  dismissUpdate: (version: string, mode: '24h' | 'forever'): ReleaseSyncState => {
    releaseSyncDb.get();
    const dismissedUpdateUntil =
      mode === '24h' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;

    db.prepare(`
      UPDATE release_sync_state SET
        dismissedUpdateVersion = @version,
        dismissedUpdateUntil = @dismissedUpdateUntil
      WHERE id = 1
    `).run({
      version,
      dismissedUpdateUntil,
    });

    return releaseSyncDb.get();
  },

  getDismissedAnnouncementIds: (): string[] => {
    const state = releaseSyncDb.get();
    try {
      const parsed = JSON.parse(state.dismissedAnnouncementIds);
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  },

  dismissAnnouncement: (announcementId: string): ReleaseSyncState => {
    const currentIds = releaseSyncDb.getDismissedAnnouncementIds();
    if (!currentIds.includes(announcementId)) {
      const updatedIds = [...currentIds, announcementId];
      db.prepare(`
        UPDATE release_sync_state SET
          dismissedAnnouncementIds = @dismissedAnnouncementIds
        WHERE id = 1
      `).run({
        dismissedAnnouncementIds: JSON.stringify(updatedIds),
      });
    }
    return releaseSyncDb.get();
  },
};