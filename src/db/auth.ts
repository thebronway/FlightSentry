import db from './index';
import { initDb } from './init';
import {
  AuthConfig,
  AuthPasskey,
  AuthPasskeyPublic,
  AuthSession,
  AuthSessionPublic,
} from '@/types';

let tablesEnsured = false;

function ensureAuthTables(): void {
  if (tablesEnsured) return;
  try {
    db.prepare('SELECT 1 FROM auth_config WHERE id = 1').get();
    tablesEnsured = true;
  } catch {
    initDb();
    tablesEnsured = true;
  }
}

function syncRuntimeAuthFlag(enabled: boolean): void {
  process.env['__FLIGHTSENTRY_AUTH_ENABLED'] = enabled ? '1' : '0';
}

export const authDb = {
  getConfig: (): AuthConfig => {
    ensureAuthTables();
    let row = db.prepare('SELECT * FROM auth_config WHERE id = 1').get() as AuthConfig | undefined;
    if (!row) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT OR IGNORE INTO auth_config (id, enabled, username, passwordHash, passwordSalt, sessionDurationDays, updatedAt)
        VALUES (1, 0, 'admin', NULL, NULL, 30, ?)
      `).run(now);
      row = db.prepare('SELECT * FROM auth_config WHERE id = 1').get() as AuthConfig;
    }
    if (!row.sessionDurationDays || row.sessionDurationDays <= 0) {
      row.sessionDurationDays = 30;
    }
    syncRuntimeAuthFlag(row.enabled === 1);
    return row;
  },

  enableOrUpdateCredentials: (params: {
    username: string;
    passwordHash: string;
    passwordSalt: string;
  }): AuthConfig => {
    ensureAuthTables();
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE auth_config
      SET enabled = 1,
          username = @username,
          passwordHash = @passwordHash,
          passwordSalt = @passwordSalt,
          updatedAt = @updatedAt
      WHERE id = 1
    `).run({
      username: params.username,
      passwordHash: params.passwordHash,
      passwordSalt: params.passwordSalt,
      updatedAt: now,
    });
    syncRuntimeAuthFlag(true);
    return authDb.getConfig();
  },

  disableAuth: (): AuthConfig => {
    ensureAuthTables();
    const now = new Date().toISOString();
    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE auth_config
        SET enabled = 0,
            updatedAt = ?
        WHERE id = 1
      `).run(now);
      db.prepare(`
        UPDATE auth_sessions
        SET revokedAt = ?
        WHERE revokedAt IS NULL
      `).run(now);
    });
    tx();
    syncRuntimeAuthFlag(false);
    return authDb.getConfig();
  },

  updateSessionDuration: (sessionDurationDays: number): AuthConfig => {
    ensureAuthTables();
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE auth_config
      SET sessionDurationDays = ?,
          updatedAt = ?
      WHERE id = 1
    `).run(sessionDurationDays, now);
    return authDb.getConfig();
  },

  createSession: (session: {
    id: string;
    username: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: string;
  }): AuthSession => {
    ensureAuthTables();
    const now = new Date().toISOString();
    const staleCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const tx = db.transaction(() => {
      db.prepare(`
        DELETE FROM auth_sessions
        WHERE expiresAt < ? OR (revokedAt IS NOT NULL AND revokedAt < ?)
      `).run(now, staleCutoff);

      db.prepare(`
        INSERT INTO auth_sessions (id, username, userAgent, ipAddress, createdAt, lastActiveAt, expiresAt, revokedAt)
        VALUES (@id, @username, @userAgent, @ipAddress, @createdAt, @lastActiveAt, @expiresAt, NULL)
      `).run({
        id: session.id,
        username: session.username,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        createdAt: now,
        lastActiveAt: now,
        expiresAt: session.expiresAt,
      });
    });
    tx();

    return db.prepare('SELECT * FROM auth_sessions WHERE id = ?').get(session.id) as AuthSession;
  },

  getValidSession: (id: string): AuthSession | null => {
    ensureAuthTables();
    const now = new Date().toISOString();
    const row = db.prepare(`
      SELECT * FROM auth_sessions
      WHERE id = ?
        AND revokedAt IS NULL
        AND expiresAt > ?
    `).get(id, now) as AuthSession | undefined;
    return row || null;
  },

  touchSession: (id: string, currentLastActiveAt?: string): void => {
    ensureAuthTables();
    const nowMs = Date.now();
    if (currentLastActiveAt) {
      const prevMs = Date.parse(currentLastActiveAt);
      if (!Number.isNaN(prevMs) && nowMs - prevMs < 5 * 60 * 1000) {
        return;
      }
    }
    db.prepare(`
      UPDATE auth_sessions
      SET lastActiveAt = ?
      WHERE id = ? AND revokedAt IS NULL
    `).run(new Date(nowMs).toISOString(), id);
  },

  revokeSession: (id: string): boolean => {
    ensureAuthTables();
    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE auth_sessions
      SET revokedAt = ?
      WHERE id = ? AND revokedAt IS NULL
    `).run(now, id);
    return result.changes > 0;
  },

  revokeAllSessions: (exceptSessionId?: string | null): number => {
    ensureAuthTables();
    const now = new Date().toISOString();
    if (exceptSessionId) {
      const result = db.prepare(`
        UPDATE auth_sessions
        SET revokedAt = ?
        WHERE revokedAt IS NULL AND id != ?
      `).run(now, exceptSessionId);
      return result.changes;
    }
    const result = db.prepare(`
      UPDATE auth_sessions
      SET revokedAt = ?
      WHERE revokedAt IS NULL
    `).run(now);
    return result.changes;
  },

  listActiveSessions: (currentSessionId?: string | null): AuthSessionPublic[] => {
    ensureAuthTables();
    const now = new Date().toISOString();
    const rows = db.prepare(`
      SELECT id, username, userAgent, ipAddress, createdAt, lastActiveAt, expiresAt
      FROM auth_sessions
      WHERE revokedAt IS NULL AND expiresAt > ?
      ORDER BY lastActiveAt DESC
    `).all(now) as Array<{
      id: string;
      username: string;
      userAgent: string | null;
      ipAddress: string | null;
      createdAt: string;
      lastActiveAt: string;
      expiresAt: string;
    }>;

    return rows.map((row) => ({
      ...row,
      isCurrent: Boolean(currentSessionId && row.id === currentSessionId),
    }));
  },

  listPasskeys: (): AuthPasskey[] => {
    ensureAuthTables();
    return db.prepare('SELECT * FROM auth_passkeys ORDER BY createdAt DESC').all() as AuthPasskey[];
  },

  listPasskeysPublic: (): AuthPasskeyPublic[] => {
    const rows = authDb.listPasskeys();
    return rows.map((p) => ({
      id: p.id,
      credentialId: p.credentialId,
      deviceType: p.deviceType || null,
      backedUp: p.backedUp === 1,
      name: p.name,
      createdAt: p.createdAt,
      lastUsedAt: p.lastUsedAt || null,
    }));
  },

  countPasskeys: (): number => {
    ensureAuthTables();
    const row = db.prepare('SELECT COUNT(*) as count FROM auth_passkeys').get() as { count: number };
    return row?.count ?? 0;
  },

  getPasskeyByCredentialId: (credentialId: string): AuthPasskey | null => {
    ensureAuthTables();
    const row = db.prepare('SELECT * FROM auth_passkeys WHERE credentialId = ?').get(credentialId) as AuthPasskey | undefined;
    return row || null;
  },

  createPasskey: (params: {
    credentialId: string;
    publicKey: string;
    counter: number;
    transports: string | null;
    deviceType: string | null;
    backedUp: boolean;
    name: string;
  }): AuthPasskey => {
    ensureAuthTables();
    const now = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO auth_passkeys (credentialId, publicKey, counter, transports, deviceType, backedUp, name, createdAt, lastUsedAt)
      VALUES (@credentialId, @publicKey, @counter, @transports, @deviceType, @backedUp, @name, @createdAt, NULL)
    `).run({
      credentialId: params.credentialId,
      publicKey: params.publicKey,
      counter: params.counter,
      transports: params.transports,
      deviceType: params.deviceType,
      backedUp: params.backedUp ? 1 : 0,
      name: params.name,
      createdAt: now,
    });
    return db.prepare('SELECT * FROM auth_passkeys WHERE id = ?').get(info.lastInsertRowid) as AuthPasskey;
  },

  updatePasskeyUsage: (id: number, newCounter: number): void => {
    ensureAuthTables();
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE auth_passkeys
      SET counter = ?, lastUsedAt = ?
      WHERE id = ?
    `).run(newCounter, now, id);
  },

  renamePasskey: (id: number, name: string): boolean => {
    ensureAuthTables();
    const result = db.prepare('UPDATE auth_passkeys SET name = ? WHERE id = ?').run(name, id);
    return result.changes > 0;
  },

  deletePasskey: (id: number): boolean => {
    ensureAuthTables();
    const result = db.prepare('DELETE FROM auth_passkeys WHERE id = ?').run(id);
    return result.changes > 0;
  },

  storeWebAuthnChallenge: (challenge: string, type: 'registration' | 'authentication', ttlMs = 5 * 60 * 1000): void => {
    ensureAuthTables();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM auth_webauthn_challenges WHERE expiresAt <= ?').run(now);
      db.prepare(`
        INSERT OR REPLACE INTO auth_webauthn_challenges (challenge, type, expiresAt)
        VALUES (?, ?, ?)
      `).run(challenge, type, expiresAt);
    });
    tx();
  },

  consumeWebAuthnChallenge: (challenge: string, expectedType: 'registration' | 'authentication'): boolean => {
    ensureAuthTables();
    const now = new Date().toISOString();
    const tx = db.transaction(() => {
      const row = db.prepare(`
        SELECT challenge, type, expiresAt
        FROM auth_webauthn_challenges
        WHERE challenge = ?
      `).get(challenge) as { challenge: string; type: string; expiresAt: string } | undefined;

      if (!row) return false;
      db.prepare('DELETE FROM auth_webauthn_challenges WHERE challenge = ?').run(challenge);
      if (row.type !== expectedType) return false;
      if (row.expiresAt <= now) return false;
      return true;
    });
    return tx();
  },

  getLoginAttempt: (ipAddress: string): { ipAddress: string; failedCount: number; lockedUntil: string | null; lastAttemptAt: string } | null => {
    ensureAuthTables();
    const row = db.prepare('SELECT * FROM auth_login_attempts WHERE ipAddress = ?').get(ipAddress) as
      | { ipAddress: string; failedCount: number; lockedUntil: string | null; lastAttemptAt: string }
      | undefined;
    return row || null;
  },

  recordLoginAttempt: (ipAddress: string, failedCount: number, lockedUntil: string | null): void => {
    ensureAuthTables();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO auth_login_attempts (ipAddress, failedCount, lockedUntil, lastAttemptAt)
      VALUES (@ipAddress, @failedCount, @lockedUntil, @lastAttemptAt)
      ON CONFLICT(ipAddress) DO UPDATE SET
        failedCount = excluded.failedCount,
        lockedUntil = excluded.lockedUntil,
        lastAttemptAt = excluded.lastAttemptAt
    `).run({
      ipAddress,
      failedCount,
      lockedUntil,
      lastAttemptAt: now,
    });
  },

  clearLoginAttempt: (ipAddress: string): void => {
    ensureAuthTables();
    db.prepare('DELETE FROM auth_login_attempts WHERE ipAddress = ?').run(ipAddress);
  },
};