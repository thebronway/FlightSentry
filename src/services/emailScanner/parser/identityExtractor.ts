import { EmailQueueEventType } from '../../../types';
import {
  detectAirlineInText,
  isValidAirlineCode,
  normalizeAirlineCode,
  resolveAirlineFromDomain,
} from '../../../utils/airline';
import {
  MONTH_MAP,
  OTA_DOMAINS,
  PNR_STOPWORDS,
} from './constants';

export function resolveSenderDomain(fromAddress?: string | null): string {
  if (!fromAddress) return '';
  const angleMatch = fromAddress.match(/<([^>]+)>/);
  const email = (angleMatch ? angleMatch[1] : fromAddress).trim().toLowerCase();
  const atIdx = email.lastIndexOf('@');
  if (atIdx === -1) return '';
  return email.slice(atIdx + 1).trim();
}

export function detectCarrierFromDomain(domain: string): string | null {
  return resolveAirlineFromDomain(domain);
}

export function detectCarrierFromText(text: string): string | null {
  return detectAirlineInText(text);
}

export function isKnownTravelSender(domain: string, text: string): boolean {
  if (detectCarrierFromDomain(domain)) return true;
  if (OTA_DOMAINS.some((ota) => domain === ota || domain.endsWith(`.${ota}`))) {
    return true;
  }

  return /\b(?:pnr|confirmation\s*(?:code|number|#)?|record\s*locator|booking\s*ref(?:erence)?|e-?ticket|flight\s*itinerary|schedule\s*change|(?:flight|reservation|booking|trip|itinerary)\s+(?:(?:has|have)\s+been\s+|was\s+|were\s+|is\s+)?cancel(?:ed|led)|boarding\s*pass)\b/i.test(
    text
  );
}

export function classifyEventType(
  subject: string,
  text: string
): EmailQueueEventType | null {
  const combined = `${subject}\n${text}`;

  const hasStrongItinerarySignal =
    /\b(?:confirmation\s*(?:code|number|#)?\s*(?:is|:)?\s*[A-Z0-9]{5,7}|record\s*locator\s*:?\s*[A-Z0-9]{5,7}|booking\s*ref(?:erence)?\s*:?\s*[A-Z0-9]{5,7}|your\s+flight\s+itinerary|ticket\s+number\s*:?\s*\d{10,14})\b/i.test(
      combined
    );

  // Exclude non-actionable promos, statements, check-in reminders, or post-flight surveys
  if (
    !hasStrongItinerarySignal &&
    /\b(?:mileage\s+statement|monthly\s+statement|account\s+summary|check-?in\s+is\s+now\s+open|time\s+to\s+check\s+in|rate\s+your\s+flight|how\s+was\s+your\s+flight|password\s+reset|verify\s+your\s+email)\b/i.test(
      combined
    )
  ) {
    return null;
  }

  if (
    /\b(?:(?:flight|reservation|booking|trip|itinerary|ticket)\s+(?:(?:has|have)\s+been\s+|was\s+|were\s+|is\s+)?cancel(?:ed|led)|cancel(?:l)?ation\b|voided\s+ticket)\b/i.test(
      combined
    )
  ) {
    return 'cancellation';
  }

  if (
    /\b(?:schedule\s+change|flight\s+time\s+change|itinerary\s+change|updated\s+itinerary|new\s+departure\s+time|new\s+arrival\s+time|flight\s+(?:schedule\s+)?has\s+changed|time\s+has\s+changed|rebooked|reaccommodat(?:ed|ion))\b/i.test(
      combined
    )
  ) {
    return 'schedule_change';
  }

  if (
    /\b(?:confirmation|confirmed|booked|booking|reservation|itinerary|receipt|e-?ticket|ticketed|purchase\s+summary)\b/i.test(
      combined
    )
  ) {
    return 'new_booking';
  }

  return null;
}

function isValidPnrCandidate(candidate: string): boolean {
  const code = candidate.toUpperCase();
  if (!/^(?=.*[A-Z])[A-Z0-9]{5,7}$/.test(code)) return false;
  if (PNR_STOPWORDS.has(code)) return false;
  if (MONTH_MAP[code.toLowerCase()]) return false;
  return true;
}

export function extractPnr(text: string, subject?: string): string | null {
  const labeledRegex =
    /\b(?:confirmation\s*(?:code|number|#)?|record\s*locator|booking\s*(?:ref(?:erence)?|code|id)|reservation\s*(?:code|number|#)?|pnr)\s*(?:is|:|#|-|\|)?\s*([A-Z0-9]{5,7})\b/gi;
  let match: RegExpExecArray | null;
  while ((match = labeledRegex.exec(text)) !== null) {
    const candidate = match[1].toUpperCase();
    if (isValidPnrCandidate(candidate)) {
      return candidate;
    }
  }

  if (subject) {
    const subjectSuffixMatch = subject.match(
      /(?:[-–—]\s*|\()([A-Z0-9]{5,7})\)?\s*$/
    );
    if (subjectSuffixMatch) {
      const candidate = subjectSuffixMatch[1].toUpperCase();
      if (isValidPnrCandidate(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

export function extractFlightIdentity(
  text: string,
  resolvedCarrier: string | null
): { airline: string | null; flightNumber: string | null } {
  // 1. Explicit Carrier + Flight Number (e.g., "B6 1888", "DL 1428", "UA 1328", "AA104")
  const carrierFlightRegex = /\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s*#?\s*(\d{1,4})\b(?!\s*:\d{2})/g;
  let match: RegExpExecArray | null;
  while ((match = carrierFlightRegex.exec(text)) !== null) {
    const rawCode = match[1].toUpperCase();
    const num = match[2];
    if (rawCode === 'PM') continue;
    if (rawCode === 'AM' && resolvedCarrier !== 'AM') continue;
    if (isValidAirlineCode(rawCode)) {
      return { airline: rawCode, flightNumber: num };
    }
  }

  // 2. Full Carrier Name + Flight Number (e.g., "DELTA 397", "ALASKA 6", "UNITED 142")
  const namedFlightRegex =
    /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\s+(\d{1,4})\b(?!\s*:\d{2})/g;
  while ((match = namedFlightRegex.exec(text)) !== null) {
    const candidateName = match[1].trim();
    const num = match[2];
    const code = normalizeAirlineCode(candidateName);
    if (isValidAirlineCode(code)) {
      return { airline: code, flightNumber: num };
    }
  }

  // 3. "Flight # 1888" or "Flight 1888" paired with carrier resolved from sender domain or body text
  const flightOnlyMatch = text.match(/\bflight\s*(?:#|number|no\.?)?\s*:?\s*(\d{1,4})\b/i);
  if (flightOnlyMatch && resolvedCarrier) {
    return { airline: resolvedCarrier, flightNumber: flightOnlyMatch[1] };
  }

  return { airline: resolvedCarrier, flightNumber: null };
}