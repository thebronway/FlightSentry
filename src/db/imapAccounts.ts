import db from './index';
import { ImapAccount, ImapAccountPublic } from '../types';

export function toPublicAccount(account: ImapAccount): ImapAccountPublic {
  const { encryptedPassword, ...rest } = account;
  const hasPassword = Boolean(encryptedPassword && encryptedPassword.length > 0);
  return {
    ...rest,
    hasPassword,
    maskedPassword: hasPassword ? '••••••••••••' : '',
  };
}

export const imapAccountsDb = {
  getAll: (): ImapAccount[] => {
    return db
      .prepare('SELECT * FROM imap_accounts ORDER BY createdAt ASC')
      .all() as ImapAccount[];
  },

  getAllPublic: (): ImapAccountPublic[] => {
    return imapAccountsDb.getAll().map(toPublicAccount);
  },

  getEnabled: (): ImapAccount[] => {
    return db
      .prepare('SELECT * FROM imap_accounts WHERE enabled = 1 ORDER BY id ASC')
      .all() as ImapAccount[];
  },

  getById: (id: number): ImapAccount | undefined => {
    return db
      .prepare('SELECT * FROM imap_accounts WHERE id = ?')
      .get(id) as ImapAccount | undefined;
  },

  getPublicById: (id: number): ImapAccountPublic | undefined => {
    const account = imapAccountsDb.getById(id);
    return account ? toPublicAccount(account) : undefined;
  },

  create: (data: {
    label: string;
    host: string;
    port: number;
    tls: number;
    username: string;
    encryptedPassword: string;
    folder?: string;
    enabled?: number;
    lastUid: number;
    uidValidity?: number | null;
    baselineTimestamp: string;
  }): number => {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO imap_accounts (
        label, host, port, tls, username, encryptedPassword,
        folder, enabled, lastUid, uidValidity, baselineTimestamp,
        lastCheckedAt, lastError, createdAt, updatedAt
      ) VALUES (
        @label, @host, @port, @tls, @username, @encryptedPassword,
        @folder, @enabled, @lastUid, @uidValidity, @baselineTimestamp,
        NULL, NULL, @now, @now
      )
    `);
    const result = stmt.run({
      label: data.label.trim(),
      host: data.host.trim().toLowerCase(),
      port: data.port || 993,
      tls: data.tls ? 1 : 0,
      username: data.username.trim(),
      encryptedPassword: data.encryptedPassword,
      folder: (data.folder || 'INBOX').trim() || 'INBOX',
      enabled: data.enabled === 0 ? 0 : 1,
      lastUid: Math.max(0, Math.floor(data.lastUid || 0)),
      uidValidity: data.uidValidity ?? null,
      baselineTimestamp: data.baselineTimestamp,
      now,
    });
    return result.lastInsertRowid as number;
  },

  update: (
    id: number,
    data: Partial<{
      label: string;
      host: string;
      port: number;
      tls: number;
      username: string;
      encryptedPassword: string;
      folder: string;
      enabled: number;
      lastUid: number;
      uidValidity: number | null;
      baselineTimestamp: string;
      lastError: string | null;
    }>
  ): void => {
    const existing = imapAccountsDb.getById(id);
    if (!existing) return;

    const merged = {
      id,
      label: data.label !== undefined ? data.label.trim() : existing.label,
      host: data.host !== undefined ? data.host.trim().toLowerCase() : existing.host,
      port: data.port !== undefined ? data.port : existing.port,
      tls: data.tls !== undefined ? (data.tls ? 1 : 0) : existing.tls,
      username: data.username !== undefined ? data.username.trim() : existing.username,
      encryptedPassword:
        data.encryptedPassword !== undefined && data.encryptedPassword !== ''
          ? data.encryptedPassword
          : existing.encryptedPassword,
      folder:
        data.folder !== undefined
          ? (data.folder.trim() || 'INBOX')
          : existing.folder,
      enabled: data.enabled !== undefined ? (data.enabled ? 1 : 0) : existing.enabled,
      lastUid: data.lastUid !== undefined ? data.lastUid : existing.lastUid,
      uidValidity: data.uidValidity !== undefined ? data.uidValidity : existing.uidValidity,
      baselineTimestamp:
        data.baselineTimestamp !== undefined
          ? data.baselineTimestamp
          : existing.baselineTimestamp,
      lastError: data.lastError !== undefined ? data.lastError : existing.lastError,
      updatedAt: new Date().toISOString(),
    };

    db.prepare(`
      UPDATE imap_accounts SET
        label = @label,
        host = @host,
        port = @port,
        tls = @tls,
        username = @username,
        encryptedPassword = @encryptedPassword,
        folder = @folder,
        enabled = @enabled,
        lastUid = @lastUid,
        uidValidity = @uidValidity,
        baselineTimestamp = @baselineTimestamp,
        lastError = @lastError,
        updatedAt = @updatedAt
      WHERE id = @id
    `).run(merged);
  },

  updateScanCursor: (
    id: number,
    lastUid: number,
    uidValidity: number | null,
    checkedAt: string
  ): void => {
    db.prepare(`
      UPDATE imap_accounts SET
        lastUid = @lastUid,
        uidValidity = @uidValidity,
        lastCheckedAt = @checkedAt,
        lastError = NULL,
        updatedAt = @checkedAt
      WHERE id = @id
    `).run({
      id,
      lastUid: Math.max(0, Math.floor(lastUid)),
      uidValidity,
      checkedAt,
    });
  },

  recordError: (id: number, errorMessage: string, checkedAt: string): void => {
    db.prepare(`
      UPDATE imap_accounts SET
        lastCheckedAt = @checkedAt,
        lastError = @errorMessage,
        updatedAt = @checkedAt
      WHERE id = @id
    `).run({
      id,
      errorMessage: errorMessage.slice(0, 500),
      checkedAt,
    });
  },

  delete: (id: number): void => {
    db.prepare('DELETE FROM imap_accounts WHERE id = ?').run(id);
  },
};