import { simpleParser } from 'mailparser';
import { EmailParseDiagnosticResult, EmailParserSource, EmailQueueItem, Flight, ImapAccount, ParsedFlightEmailEvent } from '../../types';
import { imapAccountsDb } from '../../db/imapAccounts';
import { emailQueueDb } from '../../db/emailQueue';
import { emailScanLogsDb } from '../../db/emailScanLogs';
import { flightDb } from '../../db/flights';
import { settingsDb } from '../../db/settings';
import { logsDb } from '../../db/logs';
import { lookupFlightRoute } from '../flightLookup';
import { decryptSecret } from './crypto';
import { fetchNewMessages } from './imapClient';
import { extractSchemaOrgFlightEvents } from './schemaOrgParser';
import { extractIcsFlightEvents } from './icsParser';
import { extractHeuristicFlightEvents } from './heuristicParser';
import { parseConfiguredPointsCurrencies } from './pointsMatcher';
import { buildEventDedupeKey, isDuplicateEmailEvent, normalizeMessageId } from './deduplicator';
import { detectCarrierFromDomain, detectCarrierFromText, isKnownTravelSender, resolveSenderDomain } from './parser/identityExtractor';
import { preprocessEmailContent } from './parser/textPreprocessor';
import { matchesAirportOrMetro } from '../../utils/coLocations';

export interface AccountScanResult {
  accountId: number;
  accountLabel: string;
  messagesFetched: number;
  eventsQueued: number;
  queuedItems: EmailQueueItem[];
  baselineReset: boolean;
  error?: string;
}

export interface BatchScanResult {
  scannedAccounts: number;
  totalMessagesFetched: number;
  totalEventsQueued: number;
  queuedItems: EmailQueueItem[];
  accountResults: AccountScanResult[];
}

interface UnwrappedEmailEnvelope {
  messageId: string | null;
  subject: string | null;
  fromAddress: string | null;
  emailDate: string | null;
  htmlBody: string;
  textBody: string;
  icsPayloads: string[];
  unwrappedRfc822: boolean;
}

function extractInlineCalendarPayloads(rawSource: Buffer): string[] {
  const rawStr = rawSource.toString('utf8');
  const payloads: string[] = [];
  const vcalRegex = /BEGIN:VCALENDAR[\s\S]*?END:VCALENDAR/gi;
  let match: RegExpExecArray | null;
  while ((match = vcalRegex.exec(rawStr)) !== null) {
    payloads.push(match[0]);
  }
  return payloads;
}

async function unwrapEmailEnvelope(
  rawSource: Buffer,
  depth = 0
): Promise<UnwrappedEmailEnvelope> {
  const parsed = await simpleParser(rawSource);

  const messageId = normalizeMessageId(parsed.messageId);
  const subject = parsed.subject ? parsed.subject.trim() : null;
  const fromAddress = parsed.from?.value?.[0]?.address
    ? parsed.from.value[0].address.trim()
    : parsed.from?.text
    ? parsed.from.text.trim()
    : null;
  const emailDate =
    parsed.date instanceof Date && !Number.isNaN(parsed.date.getTime())
      ? parsed.date.toISOString()
      : null;

  const htmlBody = typeof parsed.html === 'string' ? parsed.html : '';
  const textBody = typeof parsed.text === 'string' ? parsed.text : '';

  const icsPayloads: string[] = [];
  let rfc822Buffer: Buffer | null = null;

  for (const att of parsed.attachments || []) {
    const ctype = (att.contentType || '').toLowerCase();
    const fname = (att.filename || '').toLowerCase();

    if (
      (ctype === 'text/calendar' || ctype === 'application/ics' || fname.endsWith('.ics')) &&
      Buffer.isBuffer(att.content)
    ) {
      icsPayloads.push(att.content.toString('utf8'));
    } else if (
      (ctype === 'message/rfc822' || fname.endsWith('.eml')) &&
      Buffer.isBuffer(att.content) &&
      !rfc822Buffer
    ) {
      rfc822Buffer = att.content;
    }
  }

  // Fallback for multipart/alternative text/calendar parts not surfaced as attachments
  if (icsPayloads.length === 0) {
    const inlineCalendars = extractInlineCalendarPayloads(rawSource);
    icsPayloads.push(...inlineCalendars);
  }

  // Recursively unwrap forwarded message/rfc822 (.eml) attachments
  if (rfc822Buffer && depth < 3) {
    try {
      const inner = await unwrapEmailEnvelope(rfc822Buffer, depth + 1);
      return {
        messageId: inner.messageId || messageId,
        subject: inner.subject || subject,
        fromAddress: inner.fromAddress || fromAddress,
        emailDate: inner.emailDate || emailDate,
        htmlBody: inner.htmlBody || htmlBody,
        textBody: inner.textBody || textBody,
        icsPayloads: [...inner.icsPayloads, ...icsPayloads],
        unwrappedRfc822: true,
      };
    } catch {
      // Fall back to outer envelope if nested RFC 822 payload is malformed
    }
  }

  return {
    messageId,
    subject,
    fromAddress,
    emailDate,
    htmlBody,
    textBody,
    icsPayloads,
    unwrappedRfc822: false,
  };
}

export async function parseEmailBuffer(
  rawSource: Buffer,
  options?: { recordRouteLookupLogs?: boolean }
): Promise<{
  messageId: string | null;
  subject: string | null;
  fromAddress: string | null;
  emailDate: string | null;
  unwrappedRfc822: boolean;
  icsAttachmentsCount: number;
  events: ParsedFlightEmailEvent[];
}> {
  const envelope = await unwrapEmailEnvelope(rawSource);
  const {
    messageId,
    subject,
    fromAddress,
    emailDate,
    htmlBody,
    textBody,
    icsPayloads,
    unwrappedRfc822,
  } = envelope;

  const settings = settingsDb.get();
  const configuredPointsCurrencies = parseConfiguredPointsCurrencies(settings?.pointsCurrencies);
  const fallbackTxDate =
    emailDate && /^\d{4}-\d{2}-\d{2}/.test(emailDate) ? emailDate.slice(0, 10) : null;

  // 1. Prefer structured Schema.org/FlightReservation JSON-LD & HTML Microdata extraction
  let events = extractSchemaOrgFlightEvents(
    htmlBody,
    subject || '',
    textBody,
    configuredPointsCurrencies,
    emailDate
  );

  // 2. Fallback to RFC 5545 iCalendar (.ics / text/calendar) attachments & MIME parts
  if (events.length === 0 && icsPayloads.length > 0) {
    events = extractIcsFlightEvents(icsPayloads, subject || '', textBody, emailDate);
  }

  // 3. Fallback to airline domain & DOM-segmented text/HTML pattern heuristics
  if (events.length === 0) {
    events = extractHeuristicFlightEvents({
      fromAddress,
      subject,
      emailDate,
      textBody,
      htmlBody,
      configuredPointsCurrencies,
    });
  }

  // Ensure every extracted event carries a transactionDate (explicit body date or email Date fallback)
  for (const ev of events) {
    if (!ev.transactionDate && fallbackTxDate) {
      ev.transactionDate = fallbackTxDate;
    }
  }

  // 4. Zero-quota aviation route lookup fallback when carrier + flight number are present without airport codes
  const recordLogs = options?.recordRouteLookupLogs !== false;
  for (const ev of events) {
    if ((!ev.origin || !ev.destination) && ev.airline && ev.flightNumber) {
      const lookupStart = Date.now();
      try {
        const lookup = await lookupFlightRoute(ev.airline, ev.flightNumber, ev.departureDate);
        const durationMs = Date.now() - lookupStart;
        const candidates = lookup.routes || [];

        if (lookup.success && candidates.length === 1) {
          ev.origin = candidates[0].origin;
          ev.destination = candidates[0].destination;
        }

        if (recordLogs) {
          try {
            logsDb.insert({
              provider: 'flight-route-lookup',
              route:
                lookup.success && candidates.length === 1
                  ? `${candidates[0].origin} → ${candidates[0].destination}`
                  : null,
              flightNumber: `${ev.airline} ${ev.flightNumber}`,
              departureDate: ev.departureDate || null,
              status: lookup.success && candidates.length === 1 ? 'Success' : 'Error',
              statusCode: lookup.success && candidates.length === 1 ? 200 : 404,
              errorMessage:
                lookup.success && candidates.length === 1
                  ? `Email scanner route auto-detect (${lookup.source || 'aviation-db'})`
                  : candidates.length > 1
                  ? `Multiple routes found (${candidates.length}); left blank for review`
                  : lookup.error || 'Route not found',
              durationMs,
            });
          } catch {
            // Ignore log insert errors
          }
        }
      } catch {
        // Ignore transient lookup errors
      }
    }
  }

  return {
    messageId,
    subject,
    fromAddress,
    emailDate,
    unwrappedRfc822,
    icsAttachmentsCount: icsPayloads.length,
    events,
  };
}

export async function inspectEmailBuffer(rawSource: Buffer): Promise<EmailParseDiagnosticResult> {
  const envelope = await unwrapEmailEnvelope(rawSource);
  const preprocessed = preprocessEmailContent({
    fromAddress: envelope.fromAddress,
    subject: envelope.subject,
    textBody: envelope.textBody,
    htmlBody: envelope.htmlBody,
  });

  const senderDomain = resolveSenderDomain(preprocessed.effectiveFromAddress);
  const resolvedCarrier =
    detectCarrierFromDomain(senderDomain) ||
    detectCarrierFromText(preprocessed.combinedText);

  const parsed = await parseEmailBuffer(rawSource, { recordRouteLookupLogs: false });
  const existingFlights = flightDb.getAll();
  const fallbackId = parsed.messageId || `preview:${Date.now()}`;

  const parserTierHit: EmailParserSource | 'none' =
    parsed.events.length > 0 ? parsed.events[0].parserSource : 'none';

  const enrichedEvents = parsed.events.map((ev) => {
    const dedupeKey = buildEventDedupeKey(ev, fallbackId);
    const matchedFlightId = findMatchingFlightId(ev, existingFlights);
    const alreadyInQueue = isDuplicateEmailEvent(parsed.messageId, dedupeKey);
    return {
      ...ev,
      matchedFlightId,
      dedupeKey,
      alreadyInQueue,
    };
  });

  let skipReason: string | null = null;
  if (enrichedEvents.length === 0) {
    if (!isKnownTravelSender(senderDomain, preprocessed.combinedText) && envelope.icsPayloads.length === 0) {
      skipReason = `Sender domain "${senderDomain || 'unknown'}" is not a recognized airline/OTA and no travel itinerary markers were detected.`;
    } else {
      skipReason =
        'No actionable flight confirmation, schedule change, or cancellation segments could be extracted.';
    }
  }

  const effectiveTransactionDate =
    enrichedEvents[0]?.transactionDate ||
    (parsed.emailDate && /^\d{4}-\d{2}-\d{2}/.test(parsed.emailDate)
      ? parsed.emailDate.slice(0, 10)
      : null);

  return {
    messageId: parsed.messageId,
    subject: parsed.subject,
    fromAddress: parsed.fromAddress,
    effectiveFromAddress: preprocessed.effectiveFromAddress,
    senderDomain,
    resolvedCarrier: enrichedEvents[0]?.airline || resolvedCarrier,
    emailDate: parsed.emailDate,
    effectiveTransactionDate,
    unwrappedRfc822: parsed.unwrappedRfc822,
    icsAttachmentsCount: parsed.icsAttachmentsCount,
    parserTierHit,
    events: enrichedEvents,
    skipReason,
  };
}

function isFlightAllowedByWatchFilters(flight: Flight, airlineCode: string): boolean {
  if (!airlineCode) return true;
  if (flight.excludedAirlines) {
    const excluded = flight.excludedAirlines
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (excluded.includes(airlineCode)) return false;
  }
  if (flight.includedAirlines) {
    const included = flight.includedAirlines
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (included.length > 0 && !included.includes(airlineCode)) {
      return false;
    }
  }
  return true;
}

export function findMatchingFlightId(
  event: ParsedFlightEmailEvent,
  flights: Flight[]
): number | null {
  const activeFlights = flights.filter((f) => f.status !== 'Past');
  const pool = activeFlights.length > 0 ? activeFlights : flights;

  const eventPnr = (event.pnr || '').trim().toUpperCase();
  const eventAirline = (event.airline || '').trim().toUpperCase();
  const eventFlightNum = (event.flightNumber || '').trim();
  const eventOrigin = (event.origin || '').trim().toUpperCase();
  const eventDest = (event.destination || '').trim().toUpperCase();
  const eventDate = (event.departureDate || '').trim();

  // For new bookings, match existing unbooked watched flights/routes (supports metro codes like WAS -> DCA)
  if (event.eventType === 'new_booking') {
    const unwatchedPool = pool.filter(
      (f) =>
        f.status !== 'Booked' &&
        !(f.purchasePrice !== null && f.purchasePrice !== undefined && f.purchasePrice > 0) &&
        !f.pnr
    );

    if (eventDate) {
      // 1a. Exact watched flight number + carrier + departure date
      if (eventAirline && eventFlightNum) {
        const watchedFlightMatch = unwatchedPool.find(
          (f) =>
            f.searchMode === 'FlightNumber' &&
            (f.airline || '').toUpperCase() === eventAirline &&
            (f.flightNumber || '').trim() === eventFlightNum &&
            f.departureDate === eventDate &&
            (!eventOrigin || !f.origin || matchesAirportOrMetro(f.origin, eventOrigin)) &&
            (!eventDest || !f.destination || matchesAirportOrMetro(f.destination, eventDest))
        );
        if (watchedFlightMatch) return watchedFlightMatch.id;
      }

      // 1b. Watched route / metro corridor on the same departure date
      if (eventOrigin && eventDest) {
        const watchedRouteMatches = unwatchedPool.filter(
          (f) =>
            f.searchMode === 'Route' &&
            f.departureDate === eventDate &&
            matchesAirportOrMetro(f.origin, eventOrigin) &&
            matchesAirportOrMetro(f.destination, eventDest)
        );
        if (watchedRouteMatches.length > 0) {
          const filterCompatible = watchedRouteMatches.find((f) =>
            isFlightAllowedByWatchFilters(f, eventAirline)
          );
          if (filterCompatible) return filterCompatible.id;
          return watchedRouteMatches[0].id;
        }
      }
    }

    return null;
  }

  // 1. Match by PNR first (disambiguating multi-leg itineraries by route/date when available)
  if (eventPnr) {
    const pnrMatches = pool.filter(
      (f) => f.pnr && f.pnr.trim().toUpperCase() === eventPnr
    );
    if (pnrMatches.length === 1) {
      return pnrMatches[0].id;
    }
    if (pnrMatches.length > 1) {
      const exactLeg = pnrMatches.find(
        (f) =>
          (!eventOrigin || matchesAirportOrMetro(f.origin, eventOrigin)) &&
          (!eventDest || matchesAirportOrMetro(f.destination, eventDest)) &&
          (!eventDate || f.departureDate === eventDate)
      );
      if (exactLeg) return exactLeg.id;
      return pnrMatches[0].id;
    }
  }

  // 2. Match by Carrier + Flight Number + Departure Date
  if (eventAirline && eventFlightNum && eventDate) {
    const flightNumMatch = pool.find(
      (f) =>
        (f.airline || '').toUpperCase() === eventAirline &&
        (f.flightNumber || '').trim() === eventFlightNum &&
        f.departureDate === eventDate
    );
    if (flightNumMatch) return flightNumMatch.id;
  }

  // 3. Match by Origin + Destination + Departure Date (covers flight number changes on existing bookings)
  if (eventOrigin && eventDest && eventDate) {
    const routeDateMatches = pool.filter(
      (f) =>
        matchesAirportOrMetro(f.origin, eventOrigin) &&
        matchesAirportOrMetro(f.destination, eventDest) &&
        f.departureDate === eventDate
    );
    if (routeDateMatches.length === 1) {
      return routeDateMatches[0].id;
    }
    if (routeDateMatches.length > 1 && eventAirline) {
      const carrierMatch = routeDateMatches.find(
        (f) => (f.airline || '').toUpperCase() === eventAirline
      );
      if (carrierMatch) return carrierMatch.id;
    }
  }

  return null;
}

export async function scanAccount(account: ImapAccount): Promise<AccountScanResult> {
  const checkedAt = new Date().toISOString();
  const queuedItems: EmailQueueItem[] = [];

  try {
    const plaintextPassword = decryptSecret(account.encryptedPassword);
    const fetchResult = await fetchNewMessages(account, plaintextPassword, 50);

    if (fetchResult.baselineReset) {
      imapAccountsDb.updateScanCursor(
        account.id,
        fetchResult.nextLastUid,
        fetchResult.uidValidity,
        checkedAt
      );
      return {
        accountId: account.id,
        accountLabel: account.label,
        messagesFetched: 0,
        eventsQueued: 0,
        queuedItems: [],
        baselineReset: true,
      };
    }

    const existingFlights = flightDb.getAll();

    for (const msg of fetchResult.messages) {
      let parsedEmail: Awaited<ReturnType<typeof parseEmailBuffer>>;
      try {
        // Parse strictly in memory — raw email source is never persisted to disk
        parsedEmail = await parseEmailBuffer(msg.source);
      } catch (parseErr: any) {
        const parseErrorMsg = parseErr?.message || 'Malformed MIME message';
        console.error(
          `[EmailScanner] Failed to parse message UID ${msg.uid} on account "${account.label}":`,
          parseErr
        );
        emailScanLogsDb.insert({
          accountId: account.id,
          accountLabel: account.label,
          messageId: null,
          emailSubject: `UID ${msg.uid}`,
          emailFrom: null,
          outcome: 'skipped',
          reason: `Parse error: ${parseErrorMsg}`,
          eventsCount: 0,
        });
        continue;
      }

      const fallbackId = parsedEmail.messageId || `${account.id}:${msg.uid}`;
      const effectiveEmailDate =
        parsedEmail.emailDate ||
        (msg.internalDate ? msg.internalDate.toISOString() : null);
      const fallbackTxDate =
        effectiveEmailDate && /^\d{4}-\d{2}-\d{2}/.test(effectiveEmailDate)
          ? effectiveEmailDate.slice(0, 10)
          : null;

      if (parsedEmail.events.length === 0) {
        emailScanLogsDb.insert({
          accountId: account.id,
          accountLabel: account.label,
          messageId: parsedEmail.messageId,
          emailSubject: parsedEmail.subject,
          emailFrom: parsedEmail.fromAddress,
          outcome: 'skipped',
          reason: 'No actionable flight confirmation, schedule change, or cancellation found',
          eventsCount: 0,
        });
        continue;
      }

      let queuedForMessage = 0;
      let duplicateCount = 0;

      for (const event of parsedEmail.events) {
        const dedupeKey = buildEventDedupeKey(event, fallbackId);
        if (isDuplicateEmailEvent(parsedEmail.messageId, dedupeKey)) {
          duplicateCount += 1;
          continue;
        }

        const matchedFlightId = findMatchingFlightId(event, existingFlights);
        const insertedId = emailQueueDb.enqueue({
          accountId: account.id,
          accountLabel: account.label,
          messageId: parsedEmail.messageId,
          emailSubject: parsedEmail.subject,
          emailFrom: parsedEmail.fromAddress,
          emailDate: effectiveEmailDate,
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
          queuedForMessage += 1;
        }
      }

      if (queuedForMessage > 0) {
        if (parsedEmail.messageId) {
          emailQueueDb.markMessageSeen(parsedEmail.messageId, account.id);
        }
        const tierLabel = parsedEmail.events[0]?.parserSource || 'heuristic';
        emailScanLogsDb.insert({
          accountId: account.id,
          accountLabel: account.label,
          messageId: parsedEmail.messageId,
          emailSubject: parsedEmail.subject,
          emailFrom: parsedEmail.fromAddress,
          outcome: 'queued',
          reason: `Queued ${queuedForMessage} flight event(s) via ${tierLabel}`,
          eventsCount: queuedForMessage,
        });
      } else if (duplicateCount > 0) {
        emailScanLogsDb.insert({
          accountId: account.id,
          accountLabel: account.label,
          messageId: parsedEmail.messageId,
          emailSubject: parsedEmail.subject,
          emailFrom: parsedEmail.fromAddress,
          outcome: 'duplicate',
          reason: `Already seen or queued (${duplicateCount} duplicate event(s))`,
          eventsCount: 0,
        });
      }
    }

    imapAccountsDb.updateScanCursor(
      account.id,
      fetchResult.nextLastUid,
      fetchResult.uidValidity,
      checkedAt
    );

    return {
      accountId: account.id,
      accountLabel: account.label,
      messagesFetched: fetchResult.messages.length,
      eventsQueued: queuedItems.length,
      queuedItems,
      baselineReset: false,
    };
  } catch (err: any) {
    const errorMessage = err?.message || 'IMAP scan failed';
    console.error(`[EmailScanner] Error scanning account "${account.label}":`, errorMessage);
    imapAccountsDb.recordError(account.id, errorMessage, checkedAt);

    return {
      accountId: account.id,
      accountLabel: account.label,
      messagesFetched: 0,
      eventsQueued: 0,
      queuedItems: [],
      baselineReset: false,
      error: errorMessage,
    };
  }
}

export async function scanAllEnabledAccounts(): Promise<BatchScanResult> {
  const enabledAccounts = imapAccountsDb.getEnabled();
  const accountResults: AccountScanResult[] = [];
  const allQueuedItems: EmailQueueItem[] = [];
  let totalMessagesFetched = 0;

  for (const account of enabledAccounts) {
    const result = await scanAccount(account);
    accountResults.push(result);
    totalMessagesFetched += result.messagesFetched;
    allQueuedItems.push(...result.queuedItems);
  }

  return {
    scannedAccounts: enabledAccounts.length,
    totalMessagesFetched,
    totalEventsQueued: allQueuedItems.length,
    queuedItems: allQueuedItems,
    accountResults,
  };
}