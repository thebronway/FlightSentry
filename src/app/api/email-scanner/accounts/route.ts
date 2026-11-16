import { NextRequest, NextResponse } from 'next/server';
import { imapAccountsDb } from '@/db/imapAccounts';
import { imapAccountCreateSchema } from '@/utils/validation';
import { encryptSecret, probeMailbox } from '@/services/emailScanner';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const accounts = imapAccountsDb.getAllPublic();
    return NextResponse.json(
      { accounts },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching IMAP accounts:', error);
    return NextResponse.json({ error: 'Failed to load IMAP accounts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = imapAccountCreateSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Invalid IMAP account configuration';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const data = parsed.data;
    const targetFolder = (data.folder || 'INBOX').trim() || 'INBOX';

    // Probe mailbox on creation to validate credentials and capture UIDNEXT baseline (new emails only)
    let probe: Awaited<ReturnType<typeof probeMailbox>>;
    try {
      probe = await probeMailbox({
        host: data.host,
        port: data.port,
        tls: data.tls === 1,
        username: data.username,
        password: data.password,
        folder: targetFolder,
      });
    } catch (connErr: any) {
      return NextResponse.json(
        {
          error: `IMAP connection failed: ${connErr?.message || 'Unable to authenticate or open folder'}`,
        },
        { status: 400 }
      );
    }

    const encryptedPassword = encryptSecret(data.password);
    const baselineTimestamp = new Date().toISOString();
    const initialLastUid = Math.max(0, (probe.uidNext || 1) - 1);

    const newId = imapAccountsDb.create({
      label: data.label,
      host: data.host,
      port: data.port,
      tls: data.tls,
      username: data.username,
      encryptedPassword,
      folder: targetFolder,
      enabled: data.enabled,
      lastUid: initialLastUid,
      uidValidity: probe.uidValidity,
      baselineTimestamp,
    });

    const account = imapAccountsDb.getPublicById(newId);
    return NextResponse.json(
      {
        account,
        probe: {
          uidNext: probe.uidNext,
          uidValidity: probe.uidValidity,
          exists: probe.exists,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating IMAP account:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to save IMAP account' },
      { status: 400 }
    );
  }
}