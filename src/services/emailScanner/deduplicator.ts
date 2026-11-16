import { ParsedFlightEmailEvent } from '../../types';
import { emailQueueDb } from '../../db/emailQueue';

export function normalizeMessageId(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/^<+|>+$/g, '').trim().toLowerCase();
  return cleaned.length > 0 ? cleaned.slice(0, 255) : null;
}

export function buildEventDedupeKey(
  event: ParsedFlightEmailEvent,
  fallbackIdentifier: string
): string {
  const pnr = (event.pnr || '').trim().toUpperCase();
  const carrier = (event.airline || 'UN').trim().toUpperCase();
  const flightNum = (event.flightNumber || '*').trim();
  const depDate = (event.departureDate || '*').trim();
  const origin = (event.origin || '*').trim().toUpperCase();
  const dest = (event.destination || '*').trim().toUpperCase();

  // Deduplicate across inboxes via PNR + Carrier + Flight Number + Departure Date (+ Event Type)
  if (pnr) {
    return `pnr:${pnr}|${carrier}|${flightNum}|${depDate}|${event.eventType}`;
  }

  if (carrier !== 'UN' && flightNum !== '*' && depDate !== '*') {
    return `flt:${carrier}|${flightNum}|${depDate}|${event.eventType}`;
  }

  if (origin !== '*' && dest !== '*' && depDate !== '*') {
    return `rte:${carrier}|${origin}-${dest}|${depDate}|${event.eventType}`;
  }

  return `msg:${fallbackIdentifier}`;
}

export function isDuplicateEmailEvent(
  normalizedMessageId: string | null,
  dedupeKey: string
): boolean {
  if (normalizedMessageId && emailQueueDb.isMessageSeen(normalizedMessageId)) {
    return true;
  }
  if (emailQueueDb.hasActiveDedupeKey(dedupeKey)) {
    return true;
  }
  return false;
}