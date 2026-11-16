import { NextRequest, NextResponse } from 'next/server';
import { imapAccountsDb } from '@/db/imapAccounts';
import { imapConnectionTestSchema } from '@/utils/validation';
import { decryptSecret, probeMailbox } from '@/services/emailScanner';
import { requireApiAuth } from '@/services/auth/apiGuard';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = imapConnectionTestSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Invalid IMAP test parameters';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const data = parsed.data;
    let passwordToUse = (data.password || '').trim();

    // Allow testing an existing saved account without re-entering its stored password
    if (!passwordToUse && data.accountId) {
      const existing = imapAccountsDb.getById(data.accountId);
      if (!existing) {
        return NextResponse.json({ error: 'Saved IMAP account not found' }, { status: 404 });
      }
      passwordToUse = decryptSecret(existing.encryptedPassword);
    }

    if (!passwordToUse) {
      return NextResponse.json(
        { error: 'IMAP password or app-specific password is required to test connection.' },
        { status: 400 }
      );
    }

    const targetFolder = (data.folder || 'INBOX').trim() || 'INBOX';
    const probe = await probeMailbox({
      host: data.host,
      port: data.port,
      tls: data.tls === 1,
      username: data.username,
      password: passwordToUse,
      folder: targetFolder,
    });

    return NextResponse.json(
      {
        success: true,
        folder: targetFolder,
        uidValidity: probe.uidValidity,
        uidNext: probe.uidNext,
        exists: probe.exists,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || 'Unable to connect to IMAP server',
      },
      { status: 400 }
    );
  }
}