import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiAuth } from '@/services/auth/apiGuard';
import {
  buildEventDedupeKey,
  findMatchingFlightId,
  inspectEmailBuffer,
  isDuplicateEmailEvent,
  parseEmailBuffer,
} from '@/services/emailScanner';
import { emailQueueDb } from '@/db/emailQueue';
import { emailScanLogsDb } from '@/db/emailScanLogs';
import { flightDb } from '@/db/flights';
import { settingsDb } from '@/db/settings';
import { sendEmailQueueAlert } from '@/services/notifications';
import { EmailQueueItem } from '@/types';

export const dynamic = 'force-dynamic';

const importEmlRequestSchema = z.object({
  mode: z.enum(['preview', 'stage']),
  rawSource: z
    .string()
    .min(1, 'Email content is required')
    .max(2_097_152, 'Email file exceeds maximum allowed size of 2 MB'),
  fileName: z.string().trim().max(255).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON request body.' }, { status: 400 });
  }

  const parsed = importEmlRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid .eml upload payload.' },
      { status: 400 }
    );
  }

  const { mode, rawSource, fileName } = parsed.data;
  const buffer = Buffer.from(rawSource, 'utf8');

  try {
    if (mode === 'preview') {
      const diagnostic = await inspectEmailBuffer(buffer);
      return NextResponse.json({
        fileName: fileName || null,
        diagnostic,
      });
    }

    const parsedEmail = await parseEmailBuffer(buffer, { recordRouteLookupLogs: true });
    const accountLabel = fileName ? `Manual Upload (${fileName})` : 'Manual .eml Upload';
    const fallbackId = parsedEmail.messageId || `manual:${Date.now()}`;
    const existingFlights = flightDb.getAll();
    const fallbackTxDate =
      parsedEmail.emailDate && /^\d{4}-\d{2}-\d{2}/.test(parsedEmail.emailDate)
        ? parsedEmail.emailDate.slice(0, 10)
        : null;

    if (parsedEmail.events.length === 0) {
      emailScanLogsDb.insert({
        accountId: null,
        accountLabel,
        messageId: parsedEmail.messageId,
        emailSubject: parsedEmail.subject,
        emailFrom: parsedEmail.fromAddress,
        outcome: 'skipped',
        reason: 'Manual .eml upload contained no actionable flight events',
        eventsCount: 0,
      });
      return NextResponse.json(
        { error: 'No actionable flight confirmation, schedule change, or cancellation found in this .eml file.' },
        { status: 400 }
      );
    }

    const queuedItems: EmailQueueItem[] = [];
    let duplicateCount = 0;

    for (const event of parsedEmail.events) {
      const dedupeKey = buildEventDedupeKey(event, fallbackId);
      if (isDuplicateEmailEvent(parsedEmail.messageId, dedupeKey)) {
        duplicateCount += 1;
        continue;
      }

      const matchedFlightId = findMatchingFlightId(event, existingFlights);
      const insertedId = emailQueueDb.enqueue({
        accountId: null,
        accountLabel,
        messageId: parsedEmail.messageId,
        emailSubject: parsedEmail.subject,
        emailFrom: parsedEmail.fromAddress,
        emailDate: parsedEmail.emailDate,
        eventType: event.eventType,
        dedupeKey,
        pnr: event.pnr ?? null,
        airline: event.airline ?? null,
        flightNumber: event.flightNumber ?? null,
        origin: event.origin ?? null,
        destination: event.destination ?? null,
        departureDate: event.departureDate ?? null,
        departureTime: event.departureTime ?? null,
        arrivalTime: event.arrivalTime ?? null,
        cabinClass: event.cabinClass ?? null,
        fareTier: event.fareTier ?? null,
        price: event.price ?? null,
        currency: event.currency ?? null,
        isPoints: event.isPoints ? 1 : 0,
        taxesAmount: event.taxesAmount ?? null,
        taxesCurrency: event.taxesCurrency ?? null,
        transactionDate: event.transactionDate ?? fallbackTxDate,
        matchedFlightId,
        confidence: event.confidence,
        parserSource: event.parserSource,
      });

      const queued = emailQueueDb.getById(insertedId);
      if (queued) {
        queuedItems.push(queued);
      }
    }

    if (queuedItems.length > 0) {
      emailScanLogsDb.insert({
        accountId: null,
        accountLabel,
        messageId: parsedEmail.messageId,
        emailSubject: parsedEmail.subject,
        emailFrom: parsedEmail.fromAddress,
        outcome: 'queued',
        reason: `Staged ${queuedItems.length} event(s) from manual .eml upload`,
        eventsCount: queuedItems.length,
      });

      const settings = settingsDb.get();
      await sendEmailQueueAlert(settings, queuedItems);
    } else if (duplicateCount > 0) {
      emailScanLogsDb.insert({
        accountId: null,
        accountLabel,
        messageId: parsedEmail.messageId,
        emailSubject: parsedEmail.subject,
        emailFrom: parsedEmail.fromAddress,
        outcome: 'duplicate',
        reason: `Manual .eml upload skipped (${duplicateCount} duplicate event(s) already queued/applied)`,
        eventsCount: 0,
      });
    }

    return NextResponse.json({
      success: true,
      queuedCount: queuedItems.length,
      duplicateCount,
      queuedItems,
      pendingQueueCount: emailQueueDb.countPending(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to process uploaded .eml file.' },
      { status: 500 }
    );
  }
}