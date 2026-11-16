import { CabinClass, EmailQueueEventType, FareTier, ParsedFlightEmailEvent } from '../../types';
import { cleanFlightNumber, isValidAirlineCode, normalizeAirlineCode } from '../../utils/airline';

function parseIsoDateAndTime(raw?: unknown): { date: string | null; time: string | null } {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { date: null, time: null };
  }
  const str = raw.trim();
  const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/);
  if (isoMatch) {
    return {
      date: isoMatch[1],
      time: isoMatch[2] || null,
    };
  }
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    const yyyy = parsed.getUTCFullYear();
    const mm = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getUTCDate()).padStart(2, '0');
    const hh = String(parsed.getUTCHours()).padStart(2, '0');
    const min = String(parsed.getUTCMinutes()).padStart(2, '0');
    return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
  }
  return { date: null, time: null };
}

function mapCabinClass(raw?: unknown): { cabinClass: CabinClass | null; fareTier: FareTier | null } {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { cabinClass: null, fareTier: null };
  }
  const lower = raw.toLowerCase();
  if (lower.includes('basic')) {
    return { cabinClass: 'economy', fareTier: 'Basic Economy' };
  }
  if (lower.includes('premium')) {
    return { cabinClass: 'premium_economy', fareTier: 'Standard' };
  }
  if (lower.includes('business') || lower.includes('polaris') || lower.includes('mint') || lower.includes('delta one') || lower.includes('flagship')) {
    return { cabinClass: 'business', fareTier: 'Standard' };
  }
  if (lower.includes('first')) {
    return { cabinClass: 'first', fareTier: 'Standard' };
  }
  if (lower.includes('economy') || lower.includes('coach') || lower.includes('main')) {
    return { cabinClass: 'economy', fareTier: 'Standard' };
  }
  return { cabinClass: null, fareTier: null };
}

function collectFlightReservations(node: unknown, results: any[], depth = 0): void {
  if (!node || depth > 8) return;
  if (Array.isArray(node)) {
    for (const item of node) {
      collectFlightReservations(item, results, depth + 1);
    }
    return;
  }
  if (typeof node === 'object') {
    const record = node as Record<string, unknown>;
    const rawType = record['@type'];
    const types = Array.isArray(rawType) ? rawType : typeof rawType === 'string' ? [rawType] : [];
    const isFlightRes = types.some(
      (t) => typeof t === 'string' && t.toLowerCase().endsWith('flightreservation')
    );
    if (isFlightRes) {
      results.push(record);
    }
    for (const value of Object.values(record)) {
      if (value && typeof value === 'object') {
        collectFlightReservations(value, results, depth + 1);
      }
    }
  }
}

function classifyEventType(reservationStatus: unknown, subject: string, bodyText: string): EmailQueueEventType {
  const statusStr = typeof reservationStatus === 'string' ? reservationStatus.toLowerCase() : '';
  const combined = `${subject}\n${bodyText}`.toLowerCase();

  if (
    statusStr.includes('cancel') ||
    /\b(?:flight|reservation|booking|itinerary)\s+(?:has been\s+|is\s+)?cancel(?:l)?ed\b/.test(combined) ||
    /\bcancel(?:l)?ation\s+confirmation\b/.test(combined)
  ) {
    return 'cancellation';
  }

  if (
    statusStr.includes('rescheduled') ||
    /\b(?:schedule|flight|itinerary|time)\s+change\b/.test(combined) ||
    /\bflight\s+number\s+(?:has\s+)?changed\b/.test(combined) ||
    /\breaccommodat(?:ed|ion)\b/.test(combined) ||
    /\bupdated\s+itinerary\b/.test(combined)
  ) {
    return 'schedule_change';
  }

  return 'new_booking';
}

function extractAirportCode(airportObj: any): string | null {
  if (!airportObj) return null;
  if (typeof airportObj === 'string') {
    const m = airportObj.trim().toUpperCase().match(/\b([A-Z]{3})\b/);
    return m ? m[1] : null;
  }
  if (typeof airportObj === 'object') {
    const code = airportObj.iataCode || airportObj.identifier || airportObj.code;
    if (typeof code === 'string' && /^[A-Z]{3}$/i.test(code.trim())) {
      return code.trim().toUpperCase();
    }
  }
  return null;
}

export function extractSchemaOrgFlightEvents(
  htmlContent: string,
  subject: string,
  bodyText: string
): ParsedFlightEmailEvent[] {
  if (!htmlContent || !htmlContent.includes('ld+json')) {
    return [];
  }

  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const reservations: any[] = [];
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(htmlContent)) !== null) {
    const rawJson = (match[1] || '').trim();
    if (!rawJson) continue;
    try {
      const parsed = JSON.parse(rawJson);
      collectFlightReservations(parsed, reservations);
    } catch {
      // Ignore malformed JSON-LD blocks
    }
  }

  if (reservations.length === 0) {
    return [];
  }

  const events: ParsedFlightEmailEvent[] = [];

  for (const res of reservations) {
    const rawPnr = typeof res.reservationNumber === 'string' ? res.reservationNumber.trim().toUpperCase() : null;
    const pnr = rawPnr && /^[A-Z0-9]{5,8}$/.test(rawPnr) ? rawPnr : null;
    const eventType = classifyEventType(res.reservationStatus, subject, bodyText);

    const rawPrice = res.totalPrice !== undefined ? Number(res.totalPrice) : NaN;
    const price = !Number.isNaN(rawPrice) && rawPrice > 0 ? rawPrice : null;
    const currency =
      typeof res.priceCurrency === 'string' && /^[A-Z]{3}$/i.test(res.priceCurrency.trim())
        ? res.priceCurrency.trim().toUpperCase()
        : null;

    const seatCabin =
      res.ticketedSeat?.seatingType ||
      res.cabinClass ||
      res.reservationFor?.cabinClass ||
      null;
    const { cabinClass, fareTier } = mapCabinClass(seatCabin);

    const flightsList = Array.isArray(res.reservationFor)
      ? res.reservationFor
      : res.reservationFor
      ? [res.reservationFor]
      : [];

    if (flightsList.length === 0) {
      if (pnr) {
        events.push({
          eventType,
          pnr,
          price,
          currency,
          cabinClass,
          fareTier,
          confidence: 'medium',
          parserSource: 'schema_org',
        });
      }
      continue;
    }

    for (let idx = 0; idx < flightsList.length; idx++) {
      const flightObj = flightsList[idx];
      if (!flightObj || typeof flightObj !== 'object') continue;

      const airlineObj = flightObj.airline || flightObj.carrier || flightObj.provider || {};
      const rawCarrier =
        (typeof airlineObj === 'object' ? airlineObj.iataCode || airlineObj.name : airlineObj) || '';
      const rawFlightNum =
        typeof flightObj.flightNumber === 'string' || typeof flightObj.flightNumber === 'number'
          ? String(flightObj.flightNumber)
          : '';

      const normalizedCarrier = normalizeAirlineCode(String(rawCarrier), rawFlightNum);
      const airline = isValidAirlineCode(normalizedCarrier) ? normalizedCarrier : null;
      const cleanedNum = cleanFlightNumber(rawFlightNum, airline || undefined);
      const flightNumber = /^\d+$/.test(cleanedNum) ? cleanedNum : null;

      const origin = extractAirportCode(flightObj.departureAirport);
      const destination = extractAirportCode(flightObj.arrivalAirport);

      const dep = parseIsoDateAndTime(flightObj.departureTime);
      const arr = parseIsoDateAndTime(flightObj.arrivalTime);

      const hasCoreFields = Boolean(origin && destination && dep.date && (airline || pnr));

      events.push({
        eventType,
        pnr,
        airline,
        flightNumber,
        origin,
        destination,
        departureDate: dep.date,
        departureTime: dep.time,
        arrivalTime: arr.time,
        cabinClass,
        fareTier,
        // Attach total reservation price to the first segment so multi-leg totals aren't duplicated
        price: idx === 0 ? price : null,
        currency: idx === 0 ? currency : null,
        confidence: hasCoreFields ? 'high' : 'medium',
        parserSource: 'schema_org',
      });
    }
  }

  return events;
}