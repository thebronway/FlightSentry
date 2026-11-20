import ical from 'node-ical';
import { EmailQueueEventType, ParsedFlightEmailEvent } from '../../types';
import { cleanFlightNumber, isValidAirlineCode, normalizeAirlineCode } from '../../utils/airline';
import { NON_AIRPORT_CODES } from './parser/constants';
import { detectCarrierFromText, extractPnr } from './parser/identityExtractor';

function formatDateUtcOrIso(dateVal: unknown): { date: string | null; time: string | null } {
  if (!dateVal) return { date: null, time: null };
  const d = dateVal instanceof Date ? dateVal : new Date(String(dateVal));
  if (Number.isNaN(d.getTime())) return { date: null, time: null };

  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${min}`,
  };
}

function extractIataPair(text: string): { origin: string | null; destination: string | null } {
  // 1. Explicit arrow / dash / "to" airport pair (e.g., "LAX - DCA", "LAX → DCA", "LAX to DCA")
  const pairRegex =
    /\b([A-Z]{3})\s*(?:->|→|▶|▸|►|➔|➜|➝|➞|➡|⇒|to|-|–|—|\/)\s*([A-Z]{3})\b/g;
  let match: RegExpExecArray | null;
  while ((match = pairRegex.exec(text)) !== null) {
    const orig = match[1].toUpperCase();
    const dest = match[2].toUpperCase();
    if (orig !== dest && !NON_AIRPORT_CODES.has(orig) && !NON_AIRPORT_CODES.has(dest)) {
      return { origin: orig, destination: dest };
    }
  }

  // 2. Parenthesized airport codes (e.g., "Los Angeles (LAX) ... Washington (DCA)")
  const parenRegex = /\(([A-Z]{3})\)/g;
  const codes: string[] = [];
  let pMatch: RegExpExecArray | null;
  while ((pMatch = parenRegex.exec(text)) !== null) {
    const code = pMatch[1].toUpperCase();
    if (!NON_AIRPORT_CODES.has(code) && !codes.includes(code)) {
      codes.push(code);
      if (codes.length === 2) {
        return { origin: codes[0], destination: codes[1] };
      }
    }
  }

  return { origin: null, destination: null };
}

function extractFlightFromSummary(summary: string, fullText: string): {
  airline: string | null;
  flightNumber: string | null;
} {
  const carrierFlightRegex = /\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s*#?\s*(\d{1,4})\b/g;
  let match: RegExpExecArray | null;
  while ((match = carrierFlightRegex.exec(`${summary}\n${fullText}`)) !== null) {
    const code = match[1].toUpperCase();
    if (code === 'AM' || code === 'PM') continue;
    if (isValidAirlineCode(code)) {
      return { airline: code, flightNumber: match[2] };
    }
  }

  const resolvedCarrier = detectCarrierFromText(`${summary}\n${fullText}`);
  const flightOnlyMatch = `${summary}\n${fullText}`.match(
    /\bflight\s*(?:#|number|no\.?)?\s*:?\s*(\d{1,4})\b/i
  );
  if (flightOnlyMatch && resolvedCarrier) {
    return {
      airline: resolvedCarrier,
      flightNumber: cleanFlightNumber(flightOnlyMatch[1], resolvedCarrier),
    };
  }

  return { airline: resolvedCarrier, flightNumber: null };
}

export function extractIcsFlightEvents(
  icsPayloads: string[],
  subject = '',
  bodyText = '',
  emailDate?: string | null
): ParsedFlightEmailEvent[] {
  if (!icsPayloads || icsPayloads.length === 0) {
    return [];
  }

  const events: ParsedFlightEmailEvent[] = [];
  const fallbackTxDate =
    emailDate && /^\d{4}-\d{2}-\d{2}/.test(emailDate) ? emailDate.slice(0, 10) : null;

  for (const rawIcs of icsPayloads) {
    if (!rawIcs || !rawIcs.trim()) continue;

    const methodCancel = /^METHOD:CANCEL\b/im.test(rawIcs);
    let parsedComponents: Record<string, any>;
    try {
      parsedComponents = ical.sync.parseICS(rawIcs);
    } catch {
      continue;
    }

    for (const comp of Object.values(parsedComponents)) {
      if (!comp || comp.type !== 'VEVENT') continue;

      const summary = typeof comp.summary === 'string' ? comp.summary : '';
      const description = typeof comp.description === 'string' ? comp.description : '';
      const location = typeof comp.location === 'string' ? comp.location : '';
      const statusStr = typeof comp.status === 'string' ? comp.status.toUpperCase() : '';

      const combinedEventText = [summary, location, description, subject, bodyText]
        .filter(Boolean)
        .join('\n');

      const isCancelled =
        methodCancel ||
        statusStr === 'CANCELLED' ||
        /\b(?:flight|reservation|booking|trip|itinerary)\s+(?:(?:has|have)\s+been\s+|was\s+|were\s+|is\s+)?cancel(?:l)?ed\b/i.test(
          combinedEventText
        );

      const eventType: EmailQueueEventType = isCancelled ? 'cancellation' : 'new_booking';

      const { origin, destination } = extractIataPair(
        [summary, location, description].filter(Boolean).join(' ')
      );
      const { airline, flightNumber } = extractFlightFromSummary(
        summary,
        `${description}\n${subject}\n${bodyText}`
      );
      const pnr = extractPnr(combinedEventText, subject);

      const dep = formatDateUtcOrIso(comp.start);
      const arr = formatDateUtcOrIso(comp.end);
      const dtStamp = formatDateUtcOrIso(comp.dtstamp || comp.created);

      const normalizedCarrier = airline ? normalizeAirlineCode(airline) : null;
      const validCarrier =
        normalizedCarrier && isValidAirlineCode(normalizedCarrier) ? normalizedCarrier : null;

      const hasActionableFields = Boolean(
        (origin && destination && dep.date) ||
        (validCarrier && flightNumber && dep.date) ||
        (pnr && (validCarrier || origin || dep.date))
      );

      if (!hasActionableFields) continue;

      const confidence =
        origin && destination && dep.date && (validCarrier || pnr) ? 'high' : 'medium';

      events.push({
        eventType,
        pnr,
        airline: validCarrier,
        flightNumber,
        origin,
        destination,
        departureDate: dep.date,
        departureTime: dep.time,
        arrivalTime: arr.time,
        cabinClass: null,
        fareTier: null,
        price: null,
        currency: null,
        isPoints: 0,
        taxesAmount: null,
        taxesCurrency: null,
        transactionDate: dtStamp.date || fallbackTxDate,
        confidence,
        parserSource: 'ics',
      });
    }
  }

  return events;
}