import db from './index';
import { initDb } from './init';
import { EmailScanLog, EmailScanLogOutcome } from '../types';

const MAX_SCAN_LOGS = 200;
let tableEnsured = false;

function ensureScanLogsTable(): void {
  if (tableEnsured) return;
  try {
    db.prepare('SELECT 1 FROM email_scan_logs LIMIT 1').get();
    tableEnsured = true;
  } catch {
    initDb();
    tableEnsured = true;
  }
}

export const emailScanLogsDb = {
  insert: (entry: {
    accountId?: number | null;
    accountLabel: string;
    messageId?: string | null;
    emailSubject?: string | null;
    emailFrom?: string | null;
    outcome: EmailScanLogOutcome;
    reason: string;
    eventsCount?: number;
    scannedAt?: string;
  }): void => {
    ensureScanLogsTable();
    const scannedAt = entry.scannedAt || new Date().toISOString();

    db.prepare(`
      INSERT INTO email_scan_logs (
        accountId, accountLabel, messageId, emailSubject, emailFrom,
        outcome, reason, eventsCount, scannedAt
      ) VALUES (
        @accountId, @accountLabel, @messageId, @emailSubject, @emailFrom,
        @outcome, @reason, @eventsCount, @scannedAt
      )
    `).run({
      accountId: entry.accountId ?? null,
      accountLabel: (entry.accountLabel || 'IMAP').slice(0, 120),
      messageId: entry.messageId ? entry.messageId.slice(0, 255) : null,
      emailSubject: entry.emailSubject ? entry.emailSubject.slice(0, 300) : null,
      emailFrom: entry.emailFrom ? entry.emailFrom.slice(0, 255) : null,
      outcome: entry.outcome,
      reason: (entry.reason || '').slice(0, 500),
      eventsCount: Math.max(0, Math.floor(entry.eventsCount ?? 0)),
      scannedAt,
    });

    db.prepare(`
      DELETE FROM email_scan_logs
      WHERE id NOT IN (
        SELECT id FROM email_scan_logs ORDER BY scannedAt DESC, id DESC LIMIT ?
      )
    `).run(MAX_SCAN_LOGS);
  },

  listRecent: (limit = 50): EmailScanLog[] => {
    ensureScanLogsTable();
    const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
    return db
      .prepare('SELECT * FROM email_scan_logs ORDER BY scannedAt DESC, id DESC LIMIT ?')
      .all(safeLimit) as EmailScanLog[];
  },

  clear: (): void => {
    ensureScanLogsTable();
    db.prepare('DELETE FROM email_scan_logs').run();
  },
};