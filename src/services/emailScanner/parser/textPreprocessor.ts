import * as cheerio from 'cheerio';
import { MONTH_MAP } from './constants';

export interface PreprocessedEmail {
  cleanSubject: string;
  effectiveFromAddress: string | null;
  htmlText: string;
  plainText: string;
  combinedText: string;
  transactionDate: string | null;
}

export function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&#(\d+);/g, (_match, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : '';
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&mdash;/gi, ' — ')
    .replace(/&ndash;/gi, ' – ')
    .replace(/&rarr;/gi, ' → ')
    .replace(/&larr;/gi, ' ← ')
    .replace(/&harr;/gi, ' ↔ ');
}

function cleanInvisibleChars(raw: string): string {
  return raw.replace(/[\u00a0\u200b-\u200f\u2028\u2029\u2060\ufeff\u034f\u00ad]/g, ' ');
}

export function stripHtml(html: string): string {
  if (!html || !html.trim()) return '';
  const cleanedHtml = html.replace(/<\?xml[^>]*\?>/gi, '');
  const $ = cheerio.load(cleanedHtml);

  $('script, style, head, title, meta, link, noscript, .preheader').remove();

  $('br').each((_i, el) => {
    $(el).replaceWith('\n');
  });

  $('td, th').each((_i, el) => {
    $(el).append(' | ');
  });

  $('tr, div, p, section, article, li, h1, h2, h3, h4, h5, h6, table, thead, tbody, tfoot').each(
    (_i, el) => {
      $(el).append('\n');
    }
  );

  const rawText = cleanInvisibleChars($.root().text());
  const normalizedLines: string[] = [];

  for (const rawLine of rawText.split(/\r?\n/)) {
    let ln = rawLine.replace(/[ \t]+/g, ' ').trim();
    ln = ln.replace(/(?:\s*\|\s*)+/g, ' | ');
    ln = ln.replace(/^\|\s*|\s*\|$/g, '').trim();
    if (ln && !/^[\s|·•-]+$/.test(ln)) {
      normalizedLines.push(ln);
    }
  }

  return normalizedLines.join('\n');
}

export function extractForwardedSender(text: string): string | null {
  const match = text.match(
    /(?:forwarded\s+message|original\s+message)[\s\S]{0,400}?\bFrom:\s*(?:[^<\n]*<)?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})>?/i
  );
  return match ? match[1].trim().toLowerCase() : null;
}

export function stripForwardWrapper(text: string): string {
  return text.replace(
    /-{2,}\s*(?:Forwarded|Original)\s+[Mm]essage\s*-{2,}[\s\S]{0,600}?\bTo:\s*(?:[^\n<>]*<[^>\n]+>|[^\s\n]+@[^\s\n]+)(?:\s*\bSubject:\s*[^\n]+)?/g,
    ' '
  );
}

export function extractTransactionDateFromText(
  text: string,
  emailDate?: string | null
): string | null {
  // 1. Explicit Month-Name DD, YYYY preceded by transaction/cancellation keyword
  const labeledMonthFirst = text.match(
    /\b(?:purchase\s*date|booking\s*date|date\s*of\s*purchase|issued|issue\s*date|charged\b[^.\n]{0,80}?\bon|cancel(?:l)?ed\s+on)\s*[:|#-]?\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i
  );
  if (labeledMonthFirst) {
    const mm = MONTH_MAP[labeledMonthFirst[1].toLowerCase()];
    if (mm) {
      return `${labeledMonthFirst[3]}-${mm}-${labeledMonthFirst[2].padStart(2, '0')}`;
    }
  }

  // 2. Explicit DD Month-Name YYYY preceded by transaction/cancellation keyword
  const labeledDayFirst = text.match(
    /\b(?:purchase\s*date|booking\s*date|date\s*of\s*purchase|issued|issue\s*date|charged\b[^.\n]{0,80}?\bon|cancel(?:l)?ed\s+on)\s*[:|#-]?\s*(\d{1,2})\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s*(20\d{2})\b/i
  );
  if (labeledDayFirst) {
    const mm = MONTH_MAP[labeledDayFirst[2].toLowerCase()];
    if (mm) {
      return `${labeledDayFirst[3]}-${mm}-${labeledDayFirst[1].padStart(2, '0')}`;
    }
  }

  // 3. Compact airline receipt date (e.g., "Issue Date: 10AUG26")
  const compactDate = text.match(
    /\b(?:issue\s*date|purchase\s*date|date\s*of\s*issue)\s*[:|#-]?\s*(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{2})\b/i
  );
  if (compactDate) {
    const mm = MONTH_MAP[compactDate[2].toLowerCase()];
    if (mm) {
      return `20${compactDate[3]}-${mm}-${compactDate[1]}`;
    }
  }

  // 4. Generic cancellation header date (e.g., "Reservation cancellation ... September 14, 2026")
  const cancelHeaderDate = text.match(
    /\bcancel(?:l)?(?:ed|ation)\b[\s\S]{0,80}?\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i
  );
  if (cancelHeaderDate) {
    const mm = MONTH_MAP[cancelHeaderDate[1].toLowerCase()];
    if (mm) {
      return `${cancelHeaderDate[3]}-${mm}-${cancelHeaderDate[2].padStart(2, '0')}`;
    }
  }

  // 5. Fallback to the email header Date
  if (emailDate && /^\d{4}-\d{2}-\d{2}/.test(emailDate)) {
    return emailDate.slice(0, 10);
  }

  return null;
}

export function preprocessEmailContent(params: {
  fromAddress?: string | null;
  subject?: string | null;
  emailDate?: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
}): PreprocessedEmail {
  const rawSubject = (params.subject || '').trim();
  const cleanSubject = rawSubject.replace(/^(?:(?:fwd?|re)\s*:\s*)+/i, '').trim();

  const rawPlain = cleanInvisibleChars((params.textBody || '').trim());
  const rawHtmlText = params.htmlBody ? stripHtml(params.htmlBody) : '';

  const forwardedSender =
    extractForwardedSender(rawPlain) || extractForwardedSender(rawHtmlText);
  const effectiveFromAddress = forwardedSender || (params.fromAddress || '').trim() || null;

  const plainText = stripForwardWrapper(rawPlain)
    .split(/\r?\n/)
    .map((ln) => ln.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
  const htmlText = stripForwardWrapper(rawHtmlText)
    .split(/\r?\n/)
    .map((ln) => ln.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

  const parts = [cleanSubject];
  if (htmlText) parts.push(htmlText);
  if (plainText && plainText !== htmlText) parts.push(plainText);
  const combinedText = parts.filter(Boolean).join('\n');

  const transactionDate = extractTransactionDateFromText(combinedText, params.emailDate);

  return {
    cleanSubject,
    effectiveFromAddress,
    htmlText,
    plainText,
    combinedText,
    transactionDate,
  };
}

export function extractItineraryWindow(text: string): string {
  const startMatch = text.match(
    /\b(?:flight\s+itinerary|itinerary\s+details|trip\s+details|flight\s+details|flight\s+segments|passenger\s+info|[A-Z]{3}\s*(?:->|→|▶|▸|►|➔|➜|➝|➞|➡|⇒|to|\/)\s*[A-Z]{3})\b/i
  );
  if (!startMatch || startMatch.index === undefined) return '';

  const startIdx = startMatch.index;
  const tail = text.slice(startIdx);
  const endMatch = tail.match(
    /\b(?:payment\s+details|payment\s+summary|your\s+payment|fare\s+summary|fare\s+breakdown|price\s+summary|receipt\s+details|flight\s+receipt|checked\s+bag|bag\s+allowance|baggage\s+information|terms\s+and\s+conditions|terms\s*&\s*conditions|change\/cancel\s+policy|bag\s+charges)\b/i
  );
  const endIdx =
    endMatch && endMatch.index !== undefined
      ? startIdx + endMatch.index
      : Math.min(text.length, startIdx + 2600);

  return text.slice(startIdx, endIdx);
}

export function extractPaymentWindow(text: string): string {
  const payStart = text.match(
    /\b(?:payment\s+details|payment\s+summary|your\s+payment|fare\s+summary|fare\s+breakdown|price\s+summary|receipt\s+details|flight\s+receipt|purchase\s+summary|your\s+purchase|airfare\s+charges)\b/i
  );
  if (!payStart || payStart.index === undefined) {
    return text;
  }

  const tail = text.slice(payStart.index);
  const payEnd = tail.match(
    /\b(?:terms\s+and\s+conditions|terms\s*&\s*conditions|important\s+notices|checked\s+bag|bag\s+allowance|baggage\s+information|bag\s+charges|flight\s+details)\b/i
  );
  return payEnd && payEnd.index !== undefined ? tail.slice(0, payEnd.index) : tail.slice(0, 1600);
}

export function segmentItineraryBlocks(itineraryText: string): string[] {
  if (!itineraryText || !itineraryText.trim()) return [];

  // Strip compact seat-assignment summary tables before segmenting leg blocks
  const cleaned = itineraryText.replace(
    /\bFLIGHT\s*\|\s*SEAT\b[\s\S]{0,250}?(?=\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\d{1,2}\s*[A-Z]{3}\b|\bFlight\s+\d+\b)/i,
    ''
  );

  // Split segments structurally on numbered leg headers or day-of-week + date section headers
  const anchorRegex =
    /(?:^|\n)(?=(?:Flight\s+\d+\s*[·•:-]|(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+(?:\d{1,2}\s*[A-Za-z]{3,9}|[A-Za-z]{3,9}\s+\d{1,2})(?:\s*,?\s*20\d{2})?\s*(?:\||$)))/gi;

  const indices: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = anchorRegex.exec(cleaned)) !== null) {
    const idx = m.index === 0 ? 0 : m.index + 1;
    if (indices.length === 0 || idx - indices[indices.length - 1] > 25) {
      indices.push(idx);
    }
  }

  if (indices.length <= 1) {
    return [cleaned.trim()];
  }

  const segments: string[] = [];
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i];
    const end = i + 1 < indices.length ? indices[i + 1] : cleaned.length;
    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length > 15) {
      segments.push(chunk);
    }
  }

  return segments.length > 0 ? segments : [cleaned.trim()];
}