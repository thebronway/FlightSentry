import { NextRequest, NextResponse } from 'next/server';
import { imapAccountsDb } from '@/db/imapAccounts';
import { imapAccountUpdateSchema } from '@/utils/validation';
import { decryptSecret, encryptSecret, probeMailbox } from '@/services/emailScanner';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    const existing = imapAccountsDb.getById(id);
    if (!existing) {
      return NextResponse.json({ error: 'IMAP account not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = imapAccountUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Invalid IMAP account update';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const updates = parsed.data;
    const effectiveHost = (updates.host ?? existing.host).trim().toLowerCase();
    const effectivePort = updates.port ?? existing.port;
    const effectiveTls = updates.tls !== undefined ? updates.tls === 1 : existing.tls === 1;
    const effectiveUsername = (updates.username ?? existing.username).trim();
    const effectiveFolder = ((updates.folder ?? existing.folder) || 'INBOX').trim() || 'INBOX';

    const hasNewPassword = Boolean(updates.password && updates.password.trim().length > 0);
    const effectivePassword = hasNewPassword
      ? updates.password!.trim()
      : decryptSecret(existing.encryptedPassword);

    const endpointChanged =
      effectiveHost !== existing.host ||
      effectivePort !== existing.port ||
      (effectiveTls ? 1 : 0) !== existing.tls ||
      effectiveUsername !== existing.username ||
      effectiveFolder !== existing.folder;

    let nextLastUid = existing.lastUid;
    let nextUidValidity = existing.uidValidity ?? null;
    let nextBaselineTimestamp = existing.baselineTimestamp;

    // Re-verify connection when server/folder/credentials change; re-baseline UIDNEXT if mailbox target changed
    if (endpointChanged || hasNewPassword) {
      try {
        const probe = await probeMailbox({
          host: effectiveHost,
          port: effectivePort,
          tls: effectiveTls,
          username: effectiveUsername,
          password: effectivePassword,
          folder: effectiveFolder,
        });

        const targetMoved =
          effectiveHost !== existing.host ||
          effectiveUsername !== existing.username ||
          effectiveFolder !== existing.folder;

        if (targetMoved) {
          nextLastUid = Math.max(0, (probe.uidNext || 1) - 1);
          nextUidValidity = probe.uidValidity;
          nextBaselineTimestamp = new Date().toISOString();
        }
      } catch (connErr: any) {
        return NextResponse.json(
          {
            error: `IMAP connection failed: ${connErr?.message || 'Unable to verify updated settings'}`,
          },
          { status: 400 }
        );
      }
    }

    imapAccountsDb.update(id, {
      label: updates.label ?? existing.label,
      host: effectiveHost,
      port: effectivePort,
      tls: effectiveTls ? 1 : 0,
      username: effectiveUsername,
      encryptedPassword: hasNewPassword ? encryptSecret(effectivePassword) : undefined,
      folder: effectiveFolder,
      enabled: updates.enabled !== undefined ? updates.enabled : existing.enabled,
      lastUid: nextLastUid,
      uidValidity: nextUidValidity,
      baselineTimestamp: nextBaselineTimestamp,
      lastError: endpointChanged || hasNewPassword ? null : existing.lastError,
    });

    const updatedAccount = imapAccountsDb.getPublicById(id);
    return NextResponse.json({ account: updatedAccount });
  } catch (error: any) {
    console.error('Error updating IMAP account:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update IMAP account' },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    const existing = imapAccountsDb.getById(id);
    if (!existing) {
      return NextResponse.json({ error: 'IMAP account not found' }, { status: 404 });
    }

    const body = await req.json();
    const enabled = body?.enabled === 1 || body?.enabled === true ? 1 : 0;

    imapAccountsDb.update(id, { enabled });
    return NextResponse.json({ account: imapAccountsDb.getPublicById(id) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update IMAP account status' },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    const existing = imapAccountsDb.getById(id);
    if (!existing) {
      return NextResponse.json({ error: 'IMAP account not found' }, { status: 404 });
    }

    imapAccountsDb.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting IMAP account:', error);
    return NextResponse.json({ error: 'Failed to delete IMAP account' }, { status: 500 });
  }
}