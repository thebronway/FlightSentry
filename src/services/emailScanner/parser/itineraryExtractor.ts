import { CabinClass, FareTier } from '../../../types';
import { MONTH_MAP, NON_AIRPORT_CODES } from './constants';

export function extractRoute(
  text: string,
  itineraryWindow = ''
): { origin: string | null; destination: string | null } {
  const scopes = [itineraryWindow, text].filter(Boolean);

  for (const scope of scopes) {
    // 1. Explicit arrow / separator route (e.g., "DCA -> JFK", "DCA → JFK", "LAX / DCA", "DCA to JFK")
    const arrowRegex =
      /\b([A-Z]{3})\s*(?:->|→|▶|▸|►|➔|➜|➝|➞|➡|⇒|to|-|–|—|\/)\s*([A-Z]{3})\b/g;
    let match: RegExpExecArray | null;
    while ((match = arrowRegex.exec(scope)) !== null) {
      const orig = match[1].toUpperCase();
      const dest = match[2].toUpperCase();
      if (
        orig !== dest &&
        !NON_AIRPORT_CODES.has(orig) &&
        !NON_AIRPORT_CODES.has(dest)
      ) {
        return { origin: orig, destination: dest };
      }
    }

    // 2. Labeled Origin / Destination lines
    const origMatch = scope.match(
      /\b(?:origin|departure\s+airport|depart(?:ing)?\s+from|from)\s*[:#-]?\s*(?:[A-Za-z\s,.()-]{0,30}?\()?([A-Z]{3})\)?\b/i
    );
    const destMatch = scope.match(
      /\b(?:destination|arrival\s+airport|arriv(?:ing|e)\s+(?:in|at)|to)\s*[:#-]?\s*(?:[A-Za-z\s,.()-]{0,30}?\()?([A-Z]{3})\)?\b/i
    );
    if (origMatch && destMatch) {
      const orig = origMatch[1].toUpperCase();
      const dest = destMatch[1].toUpperCase();
      if (
        orig !== dest &&
        !NON_AIRPORT_CODES.has(orig) &&
        !NON_AIRPORT_CODES.has(dest)
      ) {
        return { origin: orig, destination: dest };
      }
    }

    // 3. Parenthesized airport codes (e.g., "Washington (DCA) ... New York (JFK)")
    const parenRegex = /\(([A-Z]{3})\)/g;
    const parenCodes: string[] = [];
    let pMatch: RegExpExecArray | null;
    while ((pMatch = parenRegex.exec(scope)) !== null) {
      const code = pMatch[1].toUpperCase();
      if (!NON_AIRPORT_CODES.has(code) && !parenCodes.includes(code)) {
        parenCodes.push(code);
        if (parenCodes.length === 2) {
          return { origin: parenCodes[0], destination: parenCodes[1] };
        }
      }
    }
  }

  // 4. Itinerary-window proximity fallback (handles DOM-segmented table cells like "DCA | JFK" or "DEN | 3h 20m | BWI")
  if (itineraryWindow) {
    const codeRegex = /\b([A-Z]{3})\b/g;
    const itinCodes: string[] = [];
    let cMatch: RegExpExecArray | null;
    while ((cMatch = codeRegex.exec(itineraryWindow)) !== null) {
      const code = cMatch[1].toUpperCase();
      if (!NON_AIRPORT_CODES.has(code) && !itinCodes.includes(code)) {
        itinCodes.push(code);
        if (itinCodes.length === 2) {
          return { origin: itinCodes[0], destination: itinCodes[1] };
        }
      }
    }

    }

  return { origin: null, destination: null };
}

function isReceiptMetadataDatePrefix(text: string, matchIndex: number): boolean {
  const before = text.slice(Math.max(0, matchIndex - 35), matchIndex).toLowerCase();
  return /\b(?:purchase|booking|issued|issue|order|booked|purchased|sent|date)\s*(?:date|on|of\s+purchase)?\s*[:#-]?\s*$/.test(
    before
  );
}

function extractFullYearDate(text: string): string | null {
  // 1. ISO date YYYY-MM-DD
  const isoRegex = /\b(20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))\b/g;
  let m: RegExpExecArray | null;
  while ((m = isoRegex.exec(text)) !== null) {
    if (!isReceiptMetadataDatePrefix(text, m.index)) {
      return m[1];
    }
  }

  // 2. Month Name DD, YYYY (e.g., "Feb 17, 2027" or "February 17, 2027")
  const monthNameFirstRegex =
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2}),?\s+(20\d{2})\b/gi;
  while ((m = monthNameFirstRegex.exec(text)) !== null) {
    if (isReceiptMetadataDatePrefix(text, m.index)) continue;
    const mm = MONTH_MAP[m[1].toLowerCase()];
    const dd = m[2].padStart(2, '0');
    const yyyy = m[3];
    if (mm) return `${yyyy}-${mm}-${dd}`;
  }

  // 3. DD Month Name YYYY (e.g., "17 Feb 2027" or "17FEB2027")
  const dayFirstRegex =
    /\b(\d{1,2})\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s*(20\d{2})\b/gi;
  while ((m = dayFirstRegex.exec(text)) !== null) {
    if (isReceiptMetadataDatePrefix(text, m.index)) continue;
    const dd = m[1].padStart(2, '0');
    const mm = MONTH_MAP[m[2].toLowerCase()];
    const yyyy = m[3];
    if (mm) return `${yyyy}-${mm}-${dd}`;
  }

  // 4. Numeric slash date (supports MM/DD/YYYY and unambiguous international DD/MM/YYYY when first part > 12)
  const numericSlashRegex = /\b(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|[12]\d|3[01])\/(20\d{2})\b/g;
  while ((m = numericSlashRegex.exec(text)) !== null) {
    if (isReceiptMetadataDatePrefix(text, m.index)) continue;
    const p1 = parseInt(m[1], 10);
    const p2 = parseInt(m[2], 10);
    const yyyy = m[3];
    if (p1 > 12 && p2 <= 12) {
      return `${yyyy}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
    if (p1 <= 12 && p2 <= 31) {
      return `${yyyy}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
    }
  }

  return null;
}

function resolveRolledYear(monthStr: string, dayNum: number, referenceDateIso?: string | null): string {
  const refDate =
    referenceDateIso && !Number.isNaN(new Date(referenceDateIso).getTime())
      ? new Date(referenceDateIso)
      : new Date();
  const refYear = refDate.getUTCFullYear();
  const refMonth = refDate.getUTCMonth() + 1;
  const refDay = refDate.getUTCDate();
  const targetMonth = parseInt(monthStr, 10);

  // Roll forward to next calendar year when flight month/day precedes the email timestamp (with 2-day grace)
  const targetYear =
    targetMonth < refMonth || (targetMonth === refMonth && dayNum + 2 < refDay)
      ? refYear + 1
      : refYear;

  return `${targetYear}-${monthStr}-${String(dayNum).padStart(2, '0')}`;
}

function extractYearlessDate(text: string, referenceDateIso?: string | null): string | null {
  // 1. Month-first yearless (e.g., "Wed, Feb 17" or "February 17")
  const monthFirstMatch = text.match(
    /\b(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+)?(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})\b/i
  );
  if (monthFirstMatch) {
    const mm = MONTH_MAP[monthFirstMatch[1].toLowerCase()];
    const dayNum = parseInt(monthFirstMatch[2], 10);
    if (mm && dayNum >= 1 && dayNum <= 31) {
      return resolveRolledYear(mm, dayNum, referenceDateIso);
    }
  }

  // 2. International / Airline DD Mon yearless (e.g., "Fri, 11SEP" or "11 Sep")
  const dayFirstMatch = text.match(
    /\b(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+)?(\d{1,2})\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/i
  );
  if (dayFirstMatch) {
    const dayNum = parseInt(dayFirstMatch[1], 10);
    const mm = MONTH_MAP[dayFirstMatch[2].toLowerCase()];
    if (mm && dayNum >= 1 && dayNum <= 31) {
      return resolveRolledYear(mm, dayNum, referenceDateIso);
    }
  }

  return null;
}

export function extractDepartureDate(
  text: string,
  itineraryWindow = '',
  referenceDateIso?: string | null
): string | null {
  // 1. Prioritize itinerary section first so receipt/purchase dates never override yearless flight dates
  if (itineraryWindow) {
    const itinFullYear = extractFullYearDate(itineraryWindow);
    if (itinFullYear) return itinFullYear;

    const itinYearless = extractYearlessDate(itineraryWindow, referenceDateIso);
    if (itinYearless) return itinYearless;
  }

  // 2. Fallback to full email text (excluding receipt/purchase metadata labels)
  const fullYear = extractFullYearDate(text);
  if (fullYear) return fullYear;

  return extractYearlessDate(text, referenceDateIso);
}

export function normalizeTimeTo24Hour(rawTime: string): string | null {
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

export function extractTimes(
  text: string,
  itineraryWindow = ''
): { departureTime: string | null; arrivalTime: string | null } {
  const scopes = [itineraryWindow, text].filter(Boolean);

  for (const scope of scopes) {
    const depMatch = scope.match(
      /\b(?:depart(?:s|ing|ure)?|leaves?)\s*[:@-]?\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)\b/i
    );
    const arrMatch = scope.match(
      /\b(?:arriv(?:es|ing|al)|lands?)\s*[:@-]?\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)\b/i
    );
    if (depMatch || arrMatch) {
      return {
        departureTime: depMatch ? normalizeTimeTo24Hour(depMatch[1]) : null,
        arrivalTime: arrMatch ? normalizeTimeTo24Hour(arrMatch[1]) : null,
      };
    }

    // Paired AM/PM itinerary times separated by a dash or arrow (e.g., "6:00am - Wed, Feb 17 7:15am")
    const pairedMeridiem = scope.match(
      /\b(\d{1,2}:\d{2}\s*[AP]M)\b[\s\S]{0,60}?(?:-|–|—|to|→|->)[\s\S]{0,60}?\b(\d{1,2}:\d{2}\s*[AP]M)\b/i
    );
    if (pairedMeridiem) {
      return {
        departureTime: normalizeTimeTo24Hour(pairedMeridiem[1]),
        arrivalTime: normalizeTimeTo24Hour(pairedMeridiem[2]),
      };
    }
  }

  return { departureTime: null, arrivalTime: null };
}

export function extractCabinAndFare(text: string): {
  cabinClass: CabinClass | null;
  fareTier: FareTier | null;
} {
  const lower = text.toLowerCase();
  if (/\bbasic\s+economy\b/.test(lower)) {
    return { cabinClass: 'economy', fareTier: 'Basic Economy' };
  }
  if (/\bpremium\s+(?:economy|select|plus)\b/.test(lower)) {
    return { cabinClass: 'premium_economy', fareTier: 'Standard' };
  }
  if (
    /\b(?:business\s+class|polaris|delta\s+one|jetblue\s+mint|flagship\s+business)\b/.test(
      lower
    )
  ) {
    return { cabinClass: 'business', fareTier: 'Standard' };
  }
  if (/\bfirst\s+class\b/.test(lower)) {
    return { cabinClass: 'first', fareTier: 'Standard' };
  }
  if (
    /\b(?:main\s+cabin|economy\s+class|standard\s+economy|fare\s*\/\s*cabin\s*[:#-]?\s*main)\b/.test(
      lower
    )
  ) {
    return { cabinClass: 'economy', fareTier: 'Standard' };
  }
  return { cabinClass: null, fareTier: null };
}