import { simpleParser } from 'mailparser';
import {
  EmailQueueItem,
  Flight,
  ImapAccount,
  ParsedFlightEmailEvent,
} from '../../types';
import { imapAccountsDb } from '../../db/imapAccounts';
import { emailQueueDb } from '../../db/emailQueue';
import { flightDb } from '../../db/flights';
import { settingsDb } from '../../db/settings';
import { logsDb } from '../../db/logs';
import { lookupFlightRoute } from '../flightLookup';
import { decryptSecret } from './crypto';
import { fetchNewMessages } from './imapClient';
import { extractSchemaOrgFlightEvents } from './schemaOrgParser';
import { extractHeuristicFlightEvents } from './heuristicParser';
import { parseConfiguredPointsCurrencies } from './pointsMatcher';
import { buildEventDedupeKey, isDuplicateEmailEvent, normalizeMessageId } from './deduplicator';
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

export async function parseEmailBuffer(rawSource: Buffer): Promise<{
  messageId: string | null;
  subject: string | null;
  fromAddress: string | null;
  emailDate: string | null;
  events: ParsedFlightEmailEvent[];
}> {
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
  const settings = settingsDb.get();
  const configuredPointsCurrencies = parseConfiguredPointsCurrencies(settings?.pointsCurrencies);

  // 1. Prefer structured Schema.org/FlightReservation JSON-LD extraction
  let events = extractSchemaOrgFlightEvents(
    htmlBody,
    subject || '',
    textBody,
    configuredPointsCurrencies
  );

  // 2. Fallback to airline domain & text/HTML pattern heuristics
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

  // 3. Zero-quota aviation route lookup fallback when carrier + flight number are present without airport codes
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
    events,
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
      } catch (parseErr) {
        console.error(
          `[EmailScanner] Failed to parse message UID ${msg.uid} on account "${account.label}":`,
          parseErr
        );
        continue;
      }

      const fallbackId = parsedEmail.messageId || `${account.id}:${msg.uid}`;

      for (const event of parsedEmail.events) {
        const dedupeKey = buildEventDedupeKey(event, fallbackId);
        if (isDuplicateEmailEvent(parsedEmail.messageId, dedupeKey)) {
          continue;
        }

        const matchedFlightId = findMatchingFlightId(event, existingFlights);
        const insertedId = emailQueueDb.enqueue({
          accountId: account.id,
          accountLabel: account.label,
          messageId: parsedEmail.messageId,
          emailSubject: parsedEmail.subject,
          emailFrom: parsedEmail.fromAddress,
          emailDate:
            parsedEmail.emailDate ||
            (msg.internalDate ? msg.internalDate.toISOString() : null),
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
          matchedFlightId,
          confidence: event.confidence,
          parserSource: event.parserSource,
        });

        const queued = emailQueueDb.getById(insertedId);
        if (queued) {
          queuedItems.push(queued);
        }
      }

      if (parsedEmail.messageId) {
        emailQueueDb.markMessageSeen(parsedEmail.messageId, account.id);
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