import { resolvePointsCurrencyLabel } from '../pointsMatcher';

export interface ExtractedPaymentDetails {
  price: number | null;
  currency: string | null;
  isPoints: number;
  taxesAmount: number | null;
  taxesCurrency: string | null;
}

const SYMBOL_TO_CURRENCY: Record<string, string> = {
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
};

const PROMO_POINTS_CONTEXT_REGEX =
  /\b(?:earn|earned|earning|bonus|sign\s*up|promo|promotion|offer|up\s*to|win|enter|cardmember|credit\s*card|balance|available)\b/i;

export function extractFiatAmount(text: string): {
  amount: number | null;
  currency: string | null;
} {
  const fiatMatch = text.match(
    /(USD|EUR|GBP|CAD|AUD|JPY)?\s*([$€£¥])\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)\s*(USD|EUR|GBP|CAD|AUD|JPY)?/i
  );
  if (!fiatMatch) return { amount: null, currency: null };

  const rawNum = parseFloat(fiatMatch[3].replace(/,/g, ''));
  if (Number.isNaN(rawNum) || rawNum <= 0) return { amount: null, currency: null };

  const code = (fiatMatch[1] || fiatMatch[4])?.toUpperCase() || null;
  const symbol = fiatMatch[2] || '';
  const currency = code || SYMBOL_TO_CURRENCY[symbol] || null;

  return { amount: rawNum, currency };
}

export function extractPaymentDetails(
  paymentScope: string,
  airlineCode: string | null,
  configuredPointsCurrencies: string[]
): ExtractedPaymentDetails {
  // 1a. Explicit Total line with cash taxes followed by points/miles (e.g., "Total paid $108.09 + 40,000 miles" or "Total $5.60 USD 26,400 Points")
  const totalCashPlusPointsMatch = paymentScope.match(
    /\b(?:total\s*(?:paid|fare|price|amount|charge|cost)?|grand\s*total|amount\s*paid)\s*[:|#-]?\s*(USD|EUR|GBP|CAD|AUD|JPY)?\s*([$€£¥])\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)\s*(USD|EUR|GBP|CAD|AUD|JPY)?[\s|+]{1,12}([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,})\s+(?:([A-Za-z][A-Za-z0-9&-]{0,20}(?:\s+[A-Za-z][A-Za-z0-9&-]{0,20})?)\s+)?(points|miles|pts)\b/i
  );
  if (totalCashPlusPointsMatch) {
    const rawTax = parseFloat(totalCashPlusPointsMatch[3].replace(/,/g, ''));
    const rawPoints = parseInt(totalCashPlusPointsMatch[5].replace(/,/g, ''), 10);
    if (!Number.isNaN(rawPoints) && rawPoints > 0) {
      const code = (totalCashPlusPointsMatch[1] || totalCashPlusPointsMatch[4])?.toUpperCase() || null;
      const symbol = totalCashPlusPointsMatch[2] || '';
      const taxCurrency = code || SYMBOL_TO_CURRENCY[symbol] || null;
      const modifier = (totalCashPlusPointsMatch[6] || '').trim();
      const unit = (totalCashPlusPointsMatch[7] || '').trim();
      const detectedLabel = modifier ? `${modifier} ${unit}` : unit;

      const resolvedPointsCurrency = resolvePointsCurrencyLabel({
        detectedProgramLabel: detectedLabel,
        airlineCode,
        configuredCurrencies: configuredPointsCurrencies,
      });

      return {
        price: rawPoints,
        currency: resolvedPointsCurrency,
        isPoints: 1,
        taxesAmount: !Number.isNaN(rawTax) && rawTax > 0 ? rawTax : null,
        taxesCurrency: !Number.isNaN(rawTax) && rawTax > 0 ? taxCurrency : null,
      };
    }
  }

  // 1b. Explicit Total / Redeemed line denominated in points/miles (e.g., "Total: 15,400 TrueBlue points + $5.60")
  const totalPointsMatch = paymentScope.match(
    /\b(?:total\s*(?:paid|fare|price|amount|charge|redeemed|cost)?|grand\s*total|amount\s*paid|points\s*redeemed|miles\s*redeemed)\s*[:|#-]?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,})\s+(?:([A-Za-z][A-Za-z0-9&-]{0,20}(?:\s+[A-Za-z][A-Za-z0-9&-]{0,20})?)\s+)?(points|miles|pts)\b/i
  );
  if (totalPointsMatch) {
    const rawPoints = parseInt(totalPointsMatch[1].replace(/,/g, ''), 10);
    if (!Number.isNaN(rawPoints) && rawPoints > 0) {
      const modifier = (totalPointsMatch[2] || '').trim();
      const unit = (totalPointsMatch[3] || '').trim();
      const detectedLabel = modifier ? `${modifier} ${unit}` : unit;

      const resolvedPointsCurrency = resolvePointsCurrencyLabel({
        detectedProgramLabel: detectedLabel,
        airlineCode,
        configuredCurrencies: configuredPointsCurrencies,
      });

      const matchIdx = totalPointsMatch.index || 0;
      const nearbySlice = paymentScope.slice(
        Math.max(0, matchIdx - 30),
        Math.min(paymentScope.length, matchIdx + totalPointsMatch[0].length + 90)
      );
      const taxes = extractFiatAmount(nearbySlice);

      return {
        price: rawPoints,
        currency: resolvedPointsCurrency,
        isPoints: 1,
        taxesAmount: taxes.amount,
        taxesCurrency: taxes.currency,
      };
    }
  }

  // 2. Explicit cash Total / Grand Total / Amount Paid (prevents promotional points banners from overriding cash receipts)
  const priceMatch = paymentScope.match(
    /\b(?:total\s*(?:paid|fare|price|amount|charge|cost)?|grand\s*total|amount\s*paid|total)\s*[:|#-]?\s*(USD|EUR|GBP|CAD|AUD|JPY)?\s*([$€£¥])\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)\s*(USD|EUR|GBP|CAD|AUD|JPY)?\b/i
  );
  if (priceMatch) {
    const rawNum = parseFloat(priceMatch[3].replace(/,/g, ''));
    if (!Number.isNaN(rawNum) && rawNum > 0) {
      const code = (priceMatch[1] || priceMatch[4])?.toUpperCase() || null;
      const symbol = priceMatch[2] || '';
      const currency = code || SYMBOL_TO_CURRENCY[symbol] || null;

      return {
        price: rawNum,
        currency,
        isPoints: 0,
        taxesAmount: null,
        taxesCurrency: null,
      };
    }
  }

  // 3. Fallback: non-promotional points/miles redemption inside payment scope
  const pointsRegex =
    /\b([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,})\s+(?:([A-Za-z][A-Za-z0-9&-]{0,20}(?:\s+[A-Za-z][A-Za-z0-9&-]{0,20})?)\s+)?(points|miles|pts)\b/gi;
  let ptsMatch: RegExpExecArray | null;
  while ((ptsMatch = pointsRegex.exec(paymentScope)) !== null) {
    const rawPoints = parseInt(ptsMatch[1].replace(/,/g, ''), 10);
    if (Number.isNaN(rawPoints) || rawPoints <= 0) continue;

    const windowBefore = paymentScope
      .slice(Math.max(0, ptsMatch.index - 50), ptsMatch.index)
      .toLowerCase();
    if (PROMO_POINTS_CONTEXT_REGEX.test(windowBefore)) {
      continue;
    }

    const modifier = (ptsMatch[2] || '').trim();
    const unit = (ptsMatch[3] || '').trim();
    const detectedLabel = modifier ? `${modifier} ${unit}` : unit;

    const resolvedPointsCurrency = resolvePointsCurrencyLabel({
      detectedProgramLabel: detectedLabel,
      airlineCode,
      configuredCurrencies: configuredPointsCurrencies,
    });

    const nearbySlice = paymentScope.slice(
      Math.max(0, ptsMatch.index - 30),
      Math.min(paymentScope.length, ptsMatch.index + ptsMatch[0].length + 90)
    );
    const taxes = extractFiatAmount(nearbySlice);

    return {
      price: rawPoints,
      currency: resolvedPointsCurrency,
      isPoints: 1,
      taxesAmount: taxes.amount,
      taxesCurrency: taxes.currency,
    };
  }

  return {
    price: null,
    currency: null,
    isPoints: 0,
    taxesAmount: null,
    taxesCurrency: null,
  };
}