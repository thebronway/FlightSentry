import { CabinClass, EmailQueueEventType, FareTier, ParsedFlightEmailEvent } from '../../types';
import { cleanFlightNumber, isValidAirlineCode, normalizeAirlineCode } from '../../utils/airline';
import { resolvePointsCurrencyLabel } from './pointsMatcher';

const DOMAIN_TO_CARRIER: Record<string, string> = {
  'delta.com': 'DL',
  'united.com': 'UA',
  'aa.com': 'AA',
  'southwest.com': 'WN',
  'jetblue.com': 'B6',
  'alaskaair.com': 'AS',
  'spirit.com': 'NK',
  'flyfrontier.com': 'F9',
  'hawaiianairlines.com': 'HA',
  'suncountry.com': 'SY',
  'allegiantair.com': 'G4',
  'aveloair.com': 'XP',
  'flybreeze.com': 'MX',
  'aircanada.com': 'AC',
  'westjet.com': 'WS',
  'porterairlines.com': 'PD',
  'britishairways.com': 'BA',
  'ba.com': 'BA',
  'virginatlantic.com': 'VS',
  'lufthansa.com': 'LH',
  'swiss.com': 'LX',
  'austrian.com': 'OS',
  'airfrance.com': 'AF',
  'klm.com': 'KL',
  'iberia.com': 'IB',
  'tapairportugal.com': 'TP',
  'aerlingus.com': 'EI',
  'sas.se': 'SK',
  'finnair.com': 'AY',
  'turkishairlines.com': 'TK',
  'emirates.com': 'EK',
  'qatarairways.com': 'QR',
  'etihad.com': 'EY',
  'singaporeair.com': 'SQ',
  'cathaypacific.com': 'CX',
  'ana.co.jp': 'NH',
  'jal.co.jp': 'JL',
  'qantas.com': 'QF',
  'copaair.com': 'CM',
  'avianca.com': 'AV',
  'latam.com': 'LA',
  'aeromexico.com': 'AM',
};

const OTA_DOMAINS = [
  'expedia.com',
  'priceline.com',
  'kayak.com',
  'hopper.com',
  'chase.com',
  'amextravel.com',
  'capitalone.com',
  'travelocity.com',
  'orbitz.com',
  'cheapoair.com',
];

const NON_AIRPORT_CODES = new Set([
  'THE', 'AND', 'FOR', 'YOU', 'ARE', 'NOT', 'ALL', 'ANY', 'CAN', 'HAS', 'HAD',
  'EST', 'EDT', 'CST', 'CDT', 'MST', 'MDT', 'PST', 'PDT', 'UTC', 'GMT',
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'NZD', 'MXN',
  'PNR', 'AIR', 'JET', 'FLY', 'NON', 'ONE', 'TWO', 'VIA', 'PER', 'TAX',
  'FEE', 'BAG', 'MAX', 'MIN', 'NEW', 'OLD', 'ADD', 'GET', 'SET', 'USE',
  'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN',
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
]);

const PNR_STOPWORDS = new Set([
  'FLIGHT', 'STATUS', 'CHANGE', 'CANCEL', 'TICKET', 'NUMBER', 'ONLINE',
  'TRAVEL', 'DIRECT', 'RETURN', 'DEPART', 'ARRIVE', 'VERIFY', 'UPDATE',
  'MANAGE', 'SEARCH', 'BOOKED', 'POINTS', 'REWARD', 'CREDIT', 'AMOUNT',
]);

const MONTH_MAP: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
};

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&#(\d+);/g, (_m, dec) => {
      const code = parseInt(dec, 10);
      return !Number.isNaN(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => {
      const code = parseInt(hex, 16);
      return !Number.isNaN(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&rarr;/gi, ' → ')
    .replace(/&mdash;/gi, ' — ')
    .replace(/&ndash;/gi, ' – ');
}

function stripHtml(html: string): string {
  const withoutBlocks = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(withoutBlocks).replace(/\s+/g, ' ').trim();
}

function resolveSenderDomain(fromAddress?: string | null): string | null {
  if (!fromAddress) return null;
  const match = fromAddress.toLowerCase().match(/@([a-z0-9.-]+)/);
  if (!match) return null;
  return match[1];
}

function detectCarrierFromDomain(domain: string | null): string | null {
  if (!domain) return null;
  for (const [knownDomain, code] of Object.entries(DOMAIN_TO_CARRIER)) {
    if (domain === knownDomain || domain.endsWith(`.${knownDomain}`)) {
      return code;
    }
  }
  return null;
}

function isKnownTravelSender(domain: string | null, combinedText: string): boolean {
  if (detectCarrierFromDomain(domain)) return true;
  if (domain && OTA_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    return true;
  }
  return /\b(?:flight|itinerary|e-?ticket|boarding|confirmation\s+(?:code|number)|record\s+locator|pnr|airline|airways)\b/i.test(
    combinedText
  );
}

function classifyEventType(subject: string, text: string): EmailQueueEventType | null {
  const combined = `${subject}\n${text}`.toLowerCase();

  if (
    /\b(?:flight|reservation|booking|itinerary|trip)\s+(?:has been\s+|is\s+|was\s+)?cancel(?:l)?ed\b/.test(combined) ||
    /\bcancel(?:l)?ation\s+(?:confirmation|notice|alert)\b/.test(combined) ||
    /\byour\s+flight\s+was\s+cancel(?:l)?ed\b/.test(combined)
  ) {
    return 'cancellation';
  }

  if (
    /\b(?:schedule|flight|itinerary|time)\s+change\b/.test(combined) ||
    /\bflight\s+number\s+(?:has\s+)?changed\b/.test(combined) ||
    /\bnew\s+flight\s+(?:number|time|schedule)\b/.test(combined) ||
    /\breaccommodat(?:ed|ion)\b/.test(combined) ||
    /\bupdated\s+(?:flight\s+)?itinerary\b/.test(combined)
  ) {
    return 'schedule_change';
  }

  if (
    /\b(?:booking|flight|trip|reservation|ticket)\s+confirmation\b/.test(combined) ||
    /\byour\s+(?:flight|trip)\s+itinerary\b/.test(combined) ||
    /\bconfirmation\s+code\s+is\b/.test(combined) ||
    /\be-?ticket\s+(?:itinerary|receipt|confirmation)\b/.test(combined) ||
    /\bitinerary\s+receipt\b/.test(combined) ||
    /\breservation\s+confirmed\b/.test(combined) ||
    /\bthank\s+you\s+for\s+(?:booking|flying|choosing)\b/.test(combined)
  ) {
    return 'new_booking';
  }

  return null;
}

function extractPnr(text: string, subject?: string): string | null {
  const patterns = [
    /(?:confirmation\s*(?:code|number|#|no\.?)|record\s*locator|booking\s*(?:reference|code|ref)|pnr)\s*(?:is\s*)?[:#-]?\s*([A-Z0-9]{5,7})\b/i,
  ];
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const candidate = match[1].toUpperCase();
      if (!PNR_STOPWORDS.has(candidate) && /[A-Z]/.test(candidate)) {
        return candidate;
      }
    }
  }

  // Fallback: trailing confirmation code in email subject (e.g. "Airline booking confirmation for NAME - JIFIPH")
  if (subject) {
    const subjectSuffix = subject.match(/(?:[-–—:|]|#)\s*([A-Z0-9]{5,7})\s*$/i);
    if (subjectSuffix && subjectSuffix[1]) {
      const candidate = subjectSuffix[1].toUpperCase();
      if (!PNR_STOPWORDS.has(candidate) && /[A-Z]/.test(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function extractFlightIdentity(
  text: string,
  domainCarrier: string | null
): { airline: string | null; flightNumber: string | null } {
  // Match explicit carrier + flight number (e.g., "DL 1234", "B6 415", "Flight UA890")
  const explicitRegex = /\b(?:flight\s+#?)?([A-Z]{2}|[A-Z]\d|\d[A-Z])\s*(\d{1,4})\b/g;
  let match: RegExpExecArray | null;
  while ((match = explicitRegex.exec(text)) !== null) {
    const code = match[1].toUpperCase();
    const num = match[2];
    if (isValidAirlineCode(code) && !NON_AIRPORT_CODES.has(code)) {
      return {
        airline: code,
        flightNumber: cleanFlightNumber(num, code),
      };
    }
  }

  // Fallback: if carrier is known from sender domain, look for "Flight 1234" or "Flight #1234"
  if (domainCarrier) {
    const numOnlyMatch = text.match(/\bflight\s*(?:#|no\.?|number)?\s*(\d{1,4})\b/i);
    if (numOnlyMatch) {
      return {
        airline: domainCarrier,
        flightNumber: numOnlyMatch[1],
      };
    }
  }

  // Fallback: detect airline name in text
  const airlineNameMatch = text.match(
    /\b(Delta Air Lines|United Airlines|American Airlines|Southwest Airlines|JetBlue|Alaska Airlines|Spirit Airlines|Frontier Airlines|British Airways|Lufthansa|Air France|KLM|Air Canada|Qantas|Emirates|Singapore Airlines|Qatar Airways)\b/i
  );
  if (airlineNameMatch) {
    const normalized = normalizeAirlineCode(airlineNameMatch[1]);
    if (isValidAirlineCode(normalized)) {
      return { airline: normalized, flightNumber: null };
    }
  }

  return { airline: domainCarrier, flightNumber: null };
}

function extractRoute(text: string): { origin: string | null; destination: string | null } {
  // Pattern 1: Direct airport pair separated by arrow/triangle glyphs or connectors
  // Supports "DCA ▶ BOS", "JFK -> LAX", "JFK → LAX", "JFK to LAX", "JFK - LAX"
  const arrowRegex =
    /\b([A-Z]{3})\s*(?:->|→|▶|▸|►|➔|➜|➝|➞|➡|⇒|to|–|—|-)\s*([A-Z]{3})\b/g;
  let match: RegExpExecArray | null;
  while ((match = arrowRegex.exec(text)) !== null) {
    const orig = match[1].toUpperCase();
    const dest = match[2].toUpperCase();
    if (orig !== dest && !NON_AIRPORT_CODES.has(orig) && !NON_AIRPORT_CODES.has(dest)) {
      return { origin: orig, destination: dest };
    }
  }

  // Pattern 2: "From: ... (JFK) ... To: ... (LAX)"
  const fromToMatch = text.match(
    /\b(?:from|depart(?:ing|ure)?)\b[^()]{0,60}\(([A-Z]{3})\)[\s\S]{0,120}?\b(?:to|arriv(?:ing|al))\b[^()]{0,60}\(([A-Z]{3})\)/i
  );
  if (fromToMatch) {
    const orig = fromToMatch[1].toUpperCase();
    const dest = fromToMatch[2].toUpperCase();
    if (orig !== dest && !NON_AIRPORT_CODES.has(orig) && !NON_AIRPORT_CODES.has(dest)) {
      return { origin: orig, destination: dest };
    }
  }

  // Pattern 3: First two distinct parenthesized airport codes (e.g. "Washington, DC (DCA) ... Boston, MA (BOS)")
  const parenRegex = /\(([A-Z]{3})\)/g;
  const parenCodes: string[] = [];
  let pMatch: RegExpExecArray | null;
  while ((pMatch = parenRegex.exec(text)) !== null) {
    const code = pMatch[1].toUpperCase();
    if (!NON_AIRPORT_CODES.has(code) && !parenCodes.includes(code)) {
      parenCodes.push(code);
      if (parenCodes.length === 2) {
        return { origin: parenCodes[0], destination: parenCodes[1] };
      }
    }
  }

  return { origin: null, destination: null };
}

function extractDepartureDate(text: string, referenceDateIso?: string | null): string | null {
  // 1. ISO date YYYY-MM-DD
  const isoMatch = text.match(/\b(20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))\b/);
  if (isoMatch) return isoMatch[1];

  // 2. Month Name DD, YYYY (e.g., "Nov 15, 2026" or "November 15, 2026")
  const monthNameFirst = text.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i
  );
  if (monthNameFirst) {
    const mm = MONTH_MAP[monthNameFirst[1].toLowerCase()];
    const dd = monthNameFirst[2].padStart(2, '0');
    const yyyy = monthNameFirst[3];
    if (mm) return `${yyyy}-${mm}-${dd}`;
  }

  // 3. DD Month Name YYYY (e.g., "15 Nov 2026" or "15NOV2026")
  const dayFirst = text.match(
    /\b(\d{1,2})\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s*(20\d{2})\b/i
  );
  if (dayFirst) {
    const dd = dayFirst[1].padStart(2, '0');
    const mm = MONTH_MAP[dayFirst[2].toLowerCase()];
    const yyyy = dayFirst[3];
    if (mm) return `${yyyy}-${mm}-${dd}`;
  }

  // 4. US numeric MM/DD/YYYY
  const usNumeric = text.match(/\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(20\d{2})\b/);
  if (usNumeric) {
    const mm = usNumeric[1].padStart(2, '0');
    const dd = usNumeric[2].padStart(2, '0');
    const yyyy = usNumeric[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // 5. Yearless itinerary date (e.g., "Mon, Feb 15" or "Feb 15") anchored to email sent date
  const yearlessMatch = text.match(
    /\b(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+)?(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})\b/i
  );
  if (yearlessMatch) {
    const mm = MONTH_MAP[yearlessMatch[1].toLowerCase()];
    const dayNum = parseInt(yearlessMatch[2], 10);
    if (mm && dayNum >= 1 && dayNum <= 31) {
      const refDate =
        referenceDateIso && !Number.isNaN(new Date(referenceDateIso).getTime())
          ? new Date(referenceDateIso)
          : new Date();
      const refYear = refDate.getUTCFullYear();
      const refMonth = refDate.getUTCMonth() + 1;
      const refDay = refDate.getUTCDate();
      const targetMonth = parseInt(mm, 10);

      // If the flight's month/day is earlier in the calendar than the email date (with 2-day grace), roll to next year
      const targetYear =
        targetMonth < refMonth || (targetMonth === refMonth && dayNum + 2 < refDay)
          ? refYear + 1
          : refYear;

      return `${targetYear}-${mm}-${String(dayNum).padStart(2, '0')}`;
    }
  }

  return null;
}

function normalizeTimeTo24Hour(rawTime: string): string | null {
  const match = rawTime.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  if (hours < 0 || hours > 23) return null;

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function extractTimes(text: string): { departureTime: string | null; arrivalTime: string | null } {
  const depMatch = text.match(
    /\b(?:depart(?:s|ing|ure)?|leaves?)\s*[:@-]?\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)\b/i
  );
  const arrMatch = text.match(
    /\b(?:arriv(?:es|ing|al)|lands?)\s*[:@-]?\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)\b/i
  );
  if (depMatch || arrMatch) {
    return {
      departureTime: depMatch ? normalizeTimeTo24Hour(depMatch[1]) : null,
      arrivalTime: arrMatch ? normalizeTimeTo24Hour(arrMatch[1]) : null,
    };
  }

  // Fallback: paired AM/PM itinerary times separated by a dash (e.g. "7:00am Terminal: 2 - Mon, Feb 15 8:34am")
  const pairedMeridiem = text.match(
    /\b(\d{1,2}:\d{2}\s*[AP]M)\b[\s\S]{0,60}?(?:-|–|—|to|→|->)[\s\S]{0,60}?\b(\d{1,2}:\d{2}\s*[AP]M)\b/i
  );
  if (pairedMeridiem) {
    return {
      departureTime: normalizeTimeTo24Hour(pairedMeridiem[1]),
      arrivalTime: normalizeTimeTo24Hour(pairedMeridiem[2]),
    };
  }

  return { departureTime: null, arrivalTime: null };
}

function extractCabinAndFare(text: string): { cabinClass: CabinClass | null; fareTier: FareTier | null } {
  const lower = text.toLowerCase();
  if (/\bbasic\s+economy\b/.test(lower)) {
    return { cabinClass: 'economy', fareTier: 'Basic Economy' };
  }
  if (/\bpremium\s+(?:economy|select|plus)\b/.test(lower)) {
    return { cabinClass: 'premium_economy', fareTier: 'Standard' };
  }
  if (/\b(?:business\s+class|polaris|delta\s+one|jetblue\s+mint|flagship\s+business)\b/.test(lower)) {
    return { cabinClass: 'business', fareTier: 'Standard' };
  }
  if (/\bfirst\s+class\b/.test(lower)) {
    return { cabinClass: 'first', fareTier: 'Standard' };
  }
  if (/\b(?:main\s+cabin|economy\s+class|standard\s+economy)\b/.test(lower)) {
    return { cabinClass: 'economy', fareTier: 'Standard' };
  }
  return { cabinClass: null, fareTier: null };
}

function extractPriceAndCurrency(text: string): { price: number | null; currency: string | null } {
  const priceMatch = text.match(
    /\b(?:total\s*(?:paid|fare|price|amount|charge)?|grand\s*total|amount\s*paid)\s*[:#-]?\s*(USD|EUR|GBP|CAD|AUD|JPY)?\s*([$€£¥])?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)\b/i
  );
  if (!priceMatch) return { price: null, currency: null };

  const rawNum = parseFloat(priceMatch[3].replace(/,/g, ''));
  if (Number.isNaN(rawNum) || rawNum <= 0) return { price: null, currency: null };

  const code = priceMatch[1]?.toUpperCase() || null;
  const symbol = priceMatch[2] || '';
  const currency =
    code ||
    (symbol === '$'
      ? 'USD'
      : symbol === '€'
      ? 'EUR'
      : symbol === '£'
      ? 'GBP'
      : symbol === '¥'
      ? 'JPY'
      : null);

  return { price: rawNum, currency };
}

export function extractHeuristicFlightEvents(params: {
  fromAddress?: string | null;
  subject?: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
}): ParsedFlightEmailEvent[] {
  const subject = (params.subject || '').trim();
  const plainText = (params.textBody || '').trim() || stripHtml(params.htmlBody || '');
  const combined = `${subject}\n${plainText}`;

  const domain = resolveSenderDomain(params.fromAddress);
  if (!isKnownTravelSender(domain, combined)) {
    return [];
  }

  const eventType = classifyEventType(subject, plainText);
  if (!eventType) {
    return [];
  }

  const domainCarrier = detectCarrierFromDomain(domain);
  const pnr = extractPnr(combined);
  const { airline, flightNumber } = extractFlightIdentity(combined, domainCarrier);
  const { origin, destination } = extractRoute(combined);
  const departureDate = extractDepartureDate(combined);
  const { departureTime, arrivalTime } = extractTimes(combined);
  const { cabinClass, fareTier } = extractCabinAndFare(combined);
  const { price, currency } = extractPriceAndCurrency(combined);

  // Require at least minimal actionable flight/reservation identifiers to avoid false positives
  const hasActionableData = Boolean(
    (origin && destination && departureDate) ||
    (airline && flightNumber && departureDate) ||
    (pnr && (airline || origin || departureDate))
  );

  if (!hasActionableData) {
    return [];
  }

  const confidence =
    origin && destination && departureDate && (airline || pnr)
      ? 'high'
      : (origin && destination) || (airline && flightNumber)
      ? 'medium'
      : 'low';

  return [
    {
      eventType,
      pnr,
      airline,
      flightNumber,
      origin,
      destination,
      departureDate,
      departureTime,
      arrivalTime,
      cabinClass,
      fareTier,
      price,
      currency,
      confidence,
      parserSource: 'heuristic',
    },
  ];
}