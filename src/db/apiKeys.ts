import db from './index';
import { initDb } from './init';
import { ApiKeyPublic, ApiKeyRecord, ApiKeyScope } from '@/types';
import { normalizeApiKeyScopes, parseApiKeyScopes } from '@/services/auth/apiKeys';

let tableEnsured = false;

function ensureApiKeysTable(): void {
  if (tableEnsured) return;
  try {
    db.prepare('SELECT 1 FROM api_keys LIMIT 1').get();
    tableEnsured = true;
  } catch {
    initDb();
    tableEnsured = true;
  }
}

function toPublicApiKey(row: ApiKeyRecord): ApiKeyPublic {
  const nowMs = Date.now();
  const isExpired = Boolean(row.expiresAt && Date.parse(row.expiresAt) <= nowMs);
  const isRevoked = Boolean(row.revokedAt);

  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    scopes: parseApiKeyScopes(row.scopes),
    expiresAt: row.expiresAt ?? null,
    lastUsedAt: row.lastUsedAt ?? null,
    revokedAt: row.revokedAt ?? null,
    createdAt: row.createdAt,
    isExpired,
    isRevoked,
  };
}

export const apiKeysDb = {
  create: (params: {
    name: string;
    keyPrefix: string;
    keyHash: string;
    scopes: ApiKeyScope[] | ApiKeyScope;
    expiresAt?: string | null;
  }): ApiKeyPublic => {
    ensureApiKeysTable();
    const now = new Date().toISOString();
    const normalizedScopes = normalizeApiKeyScopes(params.scopes);

    const info = db.prepare(`
      INSERT INTO api_keys (name, keyPrefix, keyHash, scopes, expiresAt, lastUsedAt, revokedAt, createdAt)
      VALUES (@name, @keyPrefix, @keyHash, @scopes, @expiresAt, NULL, NULL, @createdAt)
    `).run({
      name: params.name.trim(),
      keyPrefix: params.keyPrefix,
      keyHash: params.keyHash,
      scopes: JSON.stringify(normalizedScopes),
      expiresAt: params.expiresAt ?? null,
      createdAt: now,
    });

    const created = db
      .prepare('SELECT * FROM api_keys WHERE id = ?')
      .get(info.lastInsertRowid) as ApiKeyRecord;
    return toPublicApiKey(created);
  },

  findByHash: (keyHash: string): ApiKeyRecord | null => {
    ensureApiKeysTable();
    const row = db
      .prepare('SELECT * FROM api_keys WHERE keyHash = ?')
      .get(keyHash) as ApiKeyRecord | undefined;
    return row ?? null;
  },

  getById: (id: number): ApiKeyPublic | null => {
    ensureApiKeysTable();
    const row = db
      .prepare('SELECT * FROM api_keys WHERE id = ?')
      .get(id) as ApiKeyRecord | undefined;
    return row ? toPublicApiKey(row) : null;
  },

  listAll: (): ApiKeyPublic[] => {
    ensureApiKeysTable();
    const rows = db
      .prepare(`
        SELECT * FROM api_keys
        ORDER BY (revokedAt IS NOT NULL) ASC, createdAt DESC, id DESC
      `)
      .all() as ApiKeyRecord[];
    return rows.map(toPublicApiKey);
  },

  touchLastUsed: (id: number, currentLastUsedAt?: string | null): void => {
    ensureApiKeysTable();
    const nowMs = Date.now();
    if (currentLastUsedAt) {
      const prevMs = Date.parse(currentLastUsedAt);
      if (!Number.isNaN(prevMs) && nowMs - prevMs < 60_000) {
        return;
      }
    }
    db.prepare(`
      UPDATE api_keys
      SET lastUsedAt = ?
      WHERE id = ? AND revokedAt IS NULL
    `).run(new Date(nowMs).toISOString(), id);
  },

  revoke: (id: number): boolean => {
    ensureApiKeysTable();
    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE api_keys
      SET revokedAt = ?
      WHERE id = ? AND revokedAt IS NULL
    `).run(now, id);
    return result.changes > 0;
  },

  deleteRevoked: (id: number): boolean => {
    ensureApiKeysTable();
    const result = db.prepare(`
      DELETE FROM api_keys
      WHERE id = ? AND revokedAt IS NOT NULL
    `).run(id);
    return result.changes > 0;
  },
};