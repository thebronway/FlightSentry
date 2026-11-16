export interface PreprocessedEmail {
  cleanSubject: string;
  effectiveFromAddress: string | null;
  htmlText: string;
  plainText: string;
  combinedText: string;
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

export function stripHtml(html: string): string {
  const withoutBlocks = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(withoutBlocks).replace(/\s+/g, ' ').trim();
}

export function extractForwardedSender(text: string): string | null {
  const match = text.match(
    /(?:forwarded\s+message|original\s+message)[\s\S]{0,350}?\bFrom:\s*(?:[^<\n]*<)?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})>?/i
  );
  return match ? match[1].trim().toLowerCase() : null;
}

export function stripForwardWrapper(text: string): string {
  return text.replace(
    /-{2,}\s*(?:Forwarded|Original)\s+[Mm]essage\s*-{2,}[\s\S]{0,500}?\bTo:\s*(?:[^\n<>]*<[^>\n]+>|[^\s\n]+@[^\s\n]+)(?:\s*\bSubject:\s*[^\n]+)?/g,
    ' '
  );
}

export function preprocessEmailContent(params: {
  fromAddress?: string | null;
  subject?: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
}): PreprocessedEmail {
  const rawSubject = (params.subject || '').trim();
  const cleanSubject = rawSubject.replace(/^(?:(?:fwd?|re)\s*:\s*)+/i, '').trim();

  const rawPlain = (params.textBody || '').trim();
  const rawHtmlText = params.htmlBody ? stripHtml(params.htmlBody) : '';

  const forwardedSender =
    extractForwardedSender(rawPlain) || extractForwardedSender(rawHtmlText);
  const effectiveFromAddress = forwardedSender || (params.fromAddress || '').trim() || null;

  const plainText = stripForwardWrapper(rawPlain).replace(/\s+/g, ' ').trim();
  const htmlText = stripForwardWrapper(rawHtmlText).replace(/\s+/g, ' ').trim();

  const parts = [cleanSubject];
  if (htmlText) parts.push(htmlText);
  if (plainText && plainText !== htmlText) parts.push(plainText);

  return {
    cleanSubject,
    effectiveFromAddress,
    htmlText,
    plainText,
    combinedText: parts.filter(Boolean).join('\n'),
  };
}

export function extractItineraryWindow(text: string): string {
  const startMatch = text.match(
    /\b(?:your\s+flight\s+itinerary|flight\s+itinerary|itinerary\s+details|[A-Z]{3}\s*(?:->|→|▶|▸|►|➔|➜|➝|➞|➡|⇒|to)\s*[A-Z]{3})\b/
  );
  if (!startMatch || startMatch.index === undefined) return '';

  const startIdx = startMatch.index;
  const tail = text.slice(startIdx);
  const endMatch = tail.match(
    /\b(?:payment\s+details|payment\s+summary|fare\s+summary|price\s+summary|bag\s+allowance|terms\s+and\s+conditions|change\/cancel\s+policy)\b/i
  );
  const endIdx =
    endMatch && endMatch.index !== undefined
      ? startIdx + endMatch.index
      : Math.min(text.length, startIdx + 1400);

  return text.slice(startIdx, endIdx);
}

export function extractPaymentWindow(text: string): string {
  const payStart = text.match(
    /\b(?:payment\s+details|payment\s+summary|fare\s+summary|price\s+summary|receipt\s+details)\b/i
  );
  if (!payStart || payStart.index === undefined) {
    return text;
  }

  const tail = text.slice(payStart.index);
  const payEnd = tail.match(
    /\b(?:change\s+made\s+easy|terms\s+and\s+conditions|important\s+notices|bag\s+allowance)\b/i
  );
  return payEnd && payEnd.index !== undefined ? tail.slice(0, payEnd.index) : tail.slice(0, 1200);
}