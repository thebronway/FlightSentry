import { EmailQueueEventType } from '../../../types';
import { isValidAirlineCode, normalizeAirlineCode } from '../../../utils/airline';
import {
  DOMAIN_TO_CARRIER,
  MONTH_MAP,
  OTA_DOMAINS,
  PNR_STOPWORDS,
} from './constants';

const CARRIER_NAME_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\bjetblue(?:\s+airways)?\b/i, name: 'JetBlue' },
  { pattern: /\bdelta\s+air\s+lines\b/i, name: 'Delta Air Lines' },
  { pattern: /\bunited\s+airlines\b/i, name: 'United Airlines' },
  { pattern: /\bamerican\s+airlines\b/i, name: 'American Airlines' },
  { pattern: /\bsouthwest\s+airlines\b/i, name: 'Southwest Airlines' },
  { pattern: /\balaska\s+airlines\b/i, name: 'Alaska Airlines' },
  { pattern: /\bspirit\s+airlines\b/i, name: 'Spirit Airlines' },
  { pattern: /\bfrontier\s+airlines\b/i, name: 'Frontier Airlines' },
  { pattern: /\bhawaiian\s+airlines\b/i, name: 'Hawaiian Airlines' },
  { pattern: /\bair\s+canada\b/i, name: 'Air Canada' },
  { pattern: /\bwestjet\b/i, name: 'WestJet' },
  { pattern: /\bbritish\s+airways\b/i, name: 'British Airways' },
  { pattern: /\bvirgin\s+atlantic\b/i, name: 'Virgin Atlantic' },
  { pattern: /\blufthansa\b/i, name: 'Lufthansa' },
  { pattern: /\bair\s+france\b/i, name: 'Air France' },
  { pattern: /\bklm\b/i, name: 'KLM' },
  { pattern: /\bemirates\b/i, name: 'Emirates' },
  { pattern: /\bqatar\s+airways\b/i, name: 'Qatar Airways' },
  { pattern: /\bsingapore\s+airlines\b/i, name: 'Singapore Airlines' },
];

export function resolveSenderDomain(fromAddress?: string | null): string {
  if (!fromAddress) return '';
  const angleMatch = fromAddress.match(/<([^>]+)>/);
  const email = (angleMatch ? angleMatch[1] : fromAddress).trim().toLowerCase();
  const atIdx = email.lastIndexOf('@');
  if (atIdx === -1) return '';
  return email.slice(atIdx + 1).trim();
}

export function detectCarrierFromDomain(domain: string): string | null {
  if (!domain) return null;
  for (const [key, code] of Object.entries(DOMAIN_TO_CARRIER)) {
    if (domain === key || domain.endsWith(`.${key}`)) {
      return code;
    }
  }
  return null;
}

export function detectCarrierFromText(text: string): string | null {
  for (const entry of CARRIER_NAME_PATTERNS) {
    if (entry.pattern.test(text)) {
      const code = normalizeAirlineCode(entry.name);
      if (isValidAirlineCode(code)) {
        return code;
      }
    }
  }
  return null;
}

export function isKnownTravelSender(domain: string, text: string): boolean {
  if (detectCarrierFromDomain(domain)) return true;
  if (OTA_DOMAINS.some((ota) => domain === ota || domain.endsWith(`.${ota}`))) {
    return true;
  }

  return /\b(?:pnr|confirmation\s*(?:code|number|#)|record\s*locator|booking\s*reference|e-?ticket|flight\s*itinerary|schedule\s*change|(?:flight|reservation|booking|trip|itinerary)\s+(?:(?:has|have)\s+been\s+|was\s+|were\s+|is\s+)?cancel(?:ed|led)|boarding\s*pass)\b/i.test(
    text
  );
}

export function classifyEventType(
  subject: string,
  text: string
): EmailQueueEventType | null {
  const combined = `${subject}\n${text}`;

  const hasStrongItinerarySignal =
    /\b(?:confirmation\s*(?:code|number|#)\s*(?:is|:)?\s*[A-Z0-9]{5,7}|your\s+flight\s+itinerary|ticket\s+number\s*:?\s*\d{10,14})\b/i.test(
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
    /\b(?:(?:flight|reservation|booking|trip|itinerary)\s+(?:(?:has|have)\s+been\s+|was\s+|were\s+|is\s+)?cancel(?:ed|led)|cancel(?:l)?ation\s+confirmation)\b/i.test(
      combined
    )
  ) {
    return 'cancellation';
  }

  if (
    /\b(?:schedule\s+change|flight\s+time\s+change|itinerary\s+change|updated\s+itinerary|new\s+departure\s+time|new\s+arrival\s+time|flight\s+(?:schedule\s+)?has\s+changed|time\s+has\s+changed)\b/i.test(
      combined
    )
  ) {
    return 'schedule_change';
  }

  if (
    /\b(?:booking\s+confirmation|flight\s+confirmation|itinerary\s+confirmation|reservation\s+confirmed|e-?ticket\s+receipt|your\s+flight\s+itinerary|thank\s+you\s+for\s+booking|you['’]re\s+all\s+set\s+to\s+jet|trip\s+confirmation)\b/i.test(
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
    /\b(?:confirmation\s*(?:code|number|#)|record\s*locator|booking\s*(?:reference|code|id)|reservation\s*(?:code|number|#)|pnr)\s*(?:is|:|#|-)?\s*([A-Z0-9]{5,7})\b/gi;
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
  // 1. Explicit Carrier + Flight Number (e.g., "B6 1888", "DL 1428", "AA104")
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

  // 2. "Flight # 1888" or "Flight 1888" paired with carrier resolved from sender domain or body text
  const flightOnlyMatch = text.match(/\bflight\s*(?:#|number|no\.?)?\s*:?\s*(\d{1,4})\b/i);
  if (flightOnlyMatch && resolvedCarrier) {
    return { airline: resolvedCarrier, flightNumber: flightOnlyMatch[1] };
  }

  return { airline: resolvedCarrier, flightNumber: null };
}