import { ImapFlow } from 'imapflow';
import { ImapAccount } from '../../types';

export interface ImapConnectionConfig {
  host: string;
  port: number;
  tls: boolean;
  username: string;
  password: string;
  folder: string;
}

export interface MailboxProbeResult {
  uidValidity: number | null;
  uidNext: number;
  exists: number;
}

export interface FetchedRawEmail {
  uid: number;
  source: Buffer;
  internalDate: Date | null;
}

export interface FetchNewMessagesResult {
  messages: FetchedRawEmail[];
  nextLastUid: number;
  uidValidity: number | null;
  baselineReset: boolean;
}

function createImapClient(config: ImapConnectionConfig): ImapFlow {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.tls,
    auth: {
      user: config.username,
      pass: config.password,
    },
    logger: false,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
}

async function safeLogout(client: ImapFlow): Promise<void> {
  try {
    await client.logout();
  } catch {
    try {
      client.close();
    } catch {
      // Ignore close errors
    }
  }
}

export async function probeMailbox(config: ImapConnectionConfig): Promise<MailboxProbeResult> {
  const client = createImapClient(config);
  try {
    await client.connect();
    const targetFolder = (config.folder || 'INBOX').trim() || 'INBOX';
    const lock = await client.getMailboxLock(targetFolder);
    try {
      const mailbox = client.mailbox;
      if (!mailbox || typeof mailbox === 'boolean') {
        throw new Error(`Unable to open mailbox folder "${targetFolder}"`);
      }
      const uidValidity = mailbox.uidValidity != null ? Number(mailbox.uidValidity) : null;
      const uidNext = mailbox.uidNext != null ? Number(mailbox.uidNext) : 1;
      const exists = mailbox.exists != null ? Number(mailbox.exists) : 0;
      return {
        uidValidity,
        uidNext,
        exists,
      };
    } finally {
      lock.release();
    }
  } finally {
    await safeLogout(client);
  }
}

export async function fetchNewMessages(
  account: ImapAccount,
  plaintextPassword: string,
  maxMessages = 50
): Promise<FetchNewMessagesResult> {
  const client = createImapClient({
    host: account.host,
    port: account.port,
    tls: account.tls === 1,
    username: account.username,
    password: plaintextPassword,
    folder: account.folder || 'INBOX',
  });

  try {
    await client.connect();
    const targetFolder = (account.folder || 'INBOX').trim() || 'INBOX';
    const lock = await client.getMailboxLock(targetFolder);

    try {
      const mailbox = client.mailbox;
      if (!mailbox || typeof mailbox === 'boolean') {
        throw new Error(`Unable to open mailbox folder "${targetFolder}"`);
      }

      const serverUidValidity = mailbox.uidValidity != null ? Number(mailbox.uidValidity) : null;
      const serverUidNext = mailbox.uidNext != null ? Number(mailbox.uidNext) : 1;

      // If UIDVALIDITY changed (e.g. mailbox rebuilt), re-baseline to serverUidNext - 1 so no historical backfill occurs
      if (
        account.uidValidity !== null &&
        account.uidValidity !== undefined &&
        serverUidValidity !== null &&
        serverUidValidity !== account.uidValidity
      ) {
        return {
          messages: [],
          nextLastUid: Math.max(0, serverUidNext - 1),
          uidValidity: serverUidValidity,
          baselineReset: true,
        };
      }

      // No new messages have arrived since lastUid
      if (serverUidNext <= account.lastUid + 1) {
        return {
          messages: [],
          nextLastUid: account.lastUid,
          uidValidity: serverUidValidity,
          baselineReset: false,
        };
      }

      const baselineMs = new Date(account.baselineTimestamp).getTime();
      // Allow 2 minutes of mail server clock skew tolerance
      const minAllowedMs = Number.isNaN(baselineMs) ? 0 : baselineMs - 120_000;

      const messages: FetchedRawEmail[] = [];
      let highestUid = account.lastUid;
      const range = `${account.lastUid + 1}:*`;

      for await (const msg of client.fetch(
        range,
        { uid: true, source: true, internalDate: true },
        { uid: true }
      )) {
        // IMAP `<n>:*` always returns the highest message in the mailbox even when `<n>` > max UID
        if (!msg.uid || msg.uid <= account.lastUid) {
          continue;
        }

        highestUid = Math.max(highestUid, msg.uid);

        const internalDate =
          msg.internalDate instanceof Date
            ? msg.internalDate
            : msg.internalDate
            ? new Date(msg.internalDate)
            : null;

        // Defense-in-depth: skip messages whose arrival timestamp predates account baseline
        if (internalDate && !Number.isNaN(internalDate.getTime()) && internalDate.getTime() < minAllowedMs) {
          continue;
        }

        if (msg.source && Buffer.isBuffer(msg.source)) {
          messages.push({
            uid: msg.uid,
            source: msg.source,
            internalDate,
          });
        }

        if (messages.length >= maxMessages) {
          break;
        }
      }

      return {
        messages,
        nextLastUid: highestUid,
        uidValidity: serverUidValidity,
        baselineReset: false,
      };
    } finally {
      lock.release();
    }
  } finally {
    await safeLogout(client);
  }
}