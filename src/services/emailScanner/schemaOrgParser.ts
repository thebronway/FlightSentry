import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import {
  CabinClass,
  EmailParserSource,
  EmailQueueEventType,
  FareTier,
  ParsedFlightEmailEvent,
} from '../../types';
import { cleanFlightNumber, isValidAirlineCode, normalizeAirlineCode } from '../../utils/airline';
import { resolvePointsCurrencyLabel } from './pointsMatcher';
import { extractPaymentDetails } from './parser/paymentExtractor';
import { extractPaymentWindow, stripHtml } from './parser/textPreprocessor';
import { MONTH_MAP } from './parser/constants';

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
  if (
    lower.includes('business') ||
    lower.includes('polaris') ||
    lower.includes('mint') ||
    lower.includes('delta one') ||
    lower.includes('flagship')
  ) {
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

function extractMicrodataScope($: cheerio.CheerioAPI, rootEl: AnyNode): Record<string, any> {
  const result: Record<string, any> = {};
  const itemType = $(rootEl).attr('itemtype');
  if (itemType) {
    result['@type'] = itemType;
  }

  function walk(el: AnyNode): void {
    $(el)
      .children()
      .each((_idx, child) => {
        const $child = $(child);
        const propName = ($child.attr('itemprop') || '').trim();
        const isNestedScope = $child.attr('itemscope') !== undefined;

        if (propName) {
          let value: unknown;
          if (isNestedScope) {
            value = extractMicrodataScope($, child);
          } else {
            value =
              $child.attr('content') ??
              $child.attr('datetime') ??
              $child.attr('href') ??
              $child.text().trim();
          }

          if (value !== undefined && value !== '') {
            if (result[propName] === undefined) {
              result[propName] = value;
            } else if (Array.isArray(result[propName])) {
              result[propName].push(value);
            } else {
              result[propName] = [result[propName], value];
            }
          }
        }

        if (!isNestedScope) {
          walk(child);
        }
      });
  }

  walk(rootEl);
  return result;
}

function extractHtmlMicrodataReservations(htmlContent: string): any[] {
  if (!htmlContent || !/itemscope/i.test(htmlContent)) {
    return [];
  }
  const $ = cheerio.load(htmlContent);
  const reservations: any[] = [];
  $('[itemscope][itemtype*="FlightReservation"]').each((_idx, el) => {
    // Skip nested FlightReservation inside another FlightReservation
    if ($(el).parents('[itemscope][itemtype*="FlightReservation"]').length > 0) {
      return;
    }
    reservations.push(extractMicrodataScope($, el));
  });
  return reservations;
}

function extractBodyTransactionDate(text: string): string | null {
  // 1. Month-first date preceded by Issued / Purchase Date / charged ... on / canceled on
  const monthFirst = text.match(
    /\b(?:issued|purchase\s*date|booking\s*date|date\s*of\s*purchase|charged\b[^.\n]{0,80}?\bon|cancel(?:l)?ed\s+on)\s*[:#-]?\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i
  );
  if (monthFirst) {
    const mm = MONTH_MAP[monthFirst[1].toLowerCase()];
    if (mm) {
      return `${monthFirst[3]}-${mm}-${monthFirst[2].padStart(2, '0')}`;
    }
  }

  // 2. Compact airline receipt date (e.g., "Issue Date: 10AUG26")
  const compactDate = text.match(
    /\b(?:issue\s*date|purchase\s*date|date\s*of\s*issue)\s*[:#-]?\s*(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{2})\b/i
  );
  if (compactDate) {
    const mm = MONTH_MAP[compactDate[2].toLowerCase()];
    if (mm) {
      return `20${compactDate[3]}-${mm}-${compactDate[1]}`;
    }
  }

  return null;
}

function classifyEventType(
  reservationStatus: unknown,
  subject: string,
  bodyText: string
): EmailQueueEventType {
  const statusStr = typeof reservationStatus === 'string' ? reservationStatus.toLowerCase() : '';
  const combined = `${subject}\n${bodyText}`.toLowerCase();

  if (
    statusStr.includes('cancel') ||
    /\b(?:flight|reservation|booking|trip|itinerary)\s+(?:(?:has|have)\s+been\s+|was\s+|were\s+|is\s+)?cancel(?:l)?ed\b/.test(
      combined
    ) ||
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
  bodyText: string,
  configuredPointsCurrencies: string[] = [],
  emailDate?: string | null
): ParsedFlightEmailEvent[] {
  if (!htmlContent) {
    return [];
  }

  const taggedReservations: Array<{ res: any; source: EmailParserSource }> = [];

  // 1. JSON-LD <script type="application/ld+json">
  if (htmlContent.includes('ld+json')) {
    const scriptRegex =
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    while ((match = scriptRegex.exec(htmlContent)) !== null) {
      const rawJson = (match[1] || '').trim();
      if (!rawJson) continue;
      try {
        const parsed = JSON.parse(rawJson);
        const found: any[] = [];
        collectFlightReservations(parsed, found);
        for (const res of found) {
          taggedReservations.push({ res, source: 'schema_org' });
        }
      } catch {
        // Ignore malformed JSON-LD blocks
      }
    }
  }

  // 2. HTML Microdata [itemscope][itemtype*="FlightReservation"]
  if (taggedReservations.length === 0) {
    const microdataRes = extractHtmlMicrodataReservations(htmlContent);
    for (const res of microdataRes) {
      taggedReservations.push({ res, source: 'schema_org_microdata' });
    }
  }

  if (taggedReservations.length === 0) {
    return [];
  }

  const cleanBody = [stripHtml(htmlContent), bodyText].filter(Boolean).join('\n');
  const fallbackEmailDate =
    emailDate && /^\d{4}-\d{2}-\d{2}/.test(emailDate) ? emailDate.slice(0, 10) : null;
  const resolvedTransactionDate =
    extractBodyTransactionDate(cleanBody) || fallbackEmailDate;
  const paymentScope = extractPaymentWindow(cleanBody);

  const events: ParsedFlightEmailEvent[] = [];
  let attachedSupplementPayment = false;

  for (const { res, source } of taggedReservations) {
    const rawPnrCandidate =
      typeof res.reservationNumber === 'string'
        ? res.reservationNumber
        : typeof res.reservationId === 'string'
        ? res.reservationId
        : null;
    const rawPnr = rawPnrCandidate ? rawPnrCandidate.trim().toUpperCase() : null;
    const pnr = rawPnr && /^[A-Z0-9]{5,8}$/.test(rawPnr) ? rawPnr : null;
    const eventType = classifyEventType(res.reservationStatus, subject, cleanBody);

    const rawPrice = res.totalPrice !== undefined ? Number(res.totalPrice) : NaN;
    const parsedPrice = !Number.isNaN(rawPrice) && rawPrice > 0 ? rawPrice : null;
    const rawCurrency = typeof res.priceCurrency === 'string' ? res.priceCurrency.trim() : '';
    const isPoints = Boolean(
      rawCurrency &&
        (rawCurrency.toUpperCase() === 'PTS' || !/^[A-Z]{3}$/i.test(rawCurrency))
    );
    const currency = rawCurrency
      ? isPoints
        ? rawCurrency
        : rawCurrency.toUpperCase()
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
        const htmlPayment =
          parsedPrice === null && !attachedSupplementPayment
            ? extractPaymentDetails(paymentScope, null, configuredPointsCurrencies)
            : null;
        if (htmlPayment && htmlPayment.price !== null) {
          attachedSupplementPayment = true;
        }
        const effectivePrice = parsedPrice ?? htmlPayment?.price ?? null;
        const effectiveIsPoints = parsedPrice !== null ? isPoints : Boolean(htmlPayment?.isPoints);
        const effectiveCurrency =
          parsedPrice !== null
            ? isPoints
              ? resolvePointsCurrencyLabel({
                  detectedProgramLabel: currency,
                  airlineCode: null,
                  configuredCurrencies: configuredPointsCurrencies,
                })
              : currency
            : htmlPayment?.currency ?? null;

        events.push({
          eventType,
          pnr,
          price: effectivePrice,
          currency: effectiveCurrency,
          isPoints: effectiveIsPoints ? 1 : 0,
          taxesAmount: htmlPayment?.taxesAmount ?? null,
          taxesCurrency: htmlPayment?.taxesCurrency ?? null,
          transactionDate: resolvedTransactionDate,
          cabinClass,
          fareTier,
          confidence: 'medium',
          parserSource: source,
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
      const resolvedCurrency = isPoints
        ? resolvePointsCurrencyLabel({
            detectedProgramLabel: currency,
            airlineCode: airline,
            configuredCurrencies: configuredPointsCurrencies,
          })
        : currency;

      let legPrice = idx === 0 ? parsedPrice : null;
      let legCurrency = idx === 0 ? resolvedCurrency : null;
      let legIsPoints = idx === 0 && isPoints ? 1 : 0;
      let legTaxesAmount: number | null = null;
      let legTaxesCurrency: string | null = null;

      // Enrich primary leg from HTML receipt payment block when Schema.org omits totalPrice
      if (legPrice === null && !attachedSupplementPayment && events.length === 0 && idx === 0) {
        const htmlPayment = extractPaymentDetails(
          paymentScope,
          airline,
          configuredPointsCurrencies
        );
        if (htmlPayment.price !== null) {
          legPrice = htmlPayment.price;
          legCurrency = htmlPayment.currency;
          legIsPoints = htmlPayment.isPoints;
          legTaxesAmount = htmlPayment.taxesAmount;
          legTaxesCurrency = htmlPayment.taxesCurrency;
          attachedSupplementPayment = true;
        }
      }

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
        price: legPrice,
        currency: legCurrency,
        isPoints: legIsPoints,
        taxesAmount: legTaxesAmount,
        taxesCurrency: legTaxesCurrency,
        transactionDate: resolvedTransactionDate,
        confidence: hasCoreFields ? 'high' : 'medium',
        parserSource: source,
      });
    }
  }

  return events;
}