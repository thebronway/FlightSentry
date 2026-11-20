import { getAirlineName, LOYALTY_PROGRAMS } from '../../utils/airline';
import { isPointsCurrency } from '../../utils/format';

function getCarrierLoyaltyKeywords(upperCarrier: string): string[] {
  const keywords = new Set<string>();
  for (const prog of LOYALTY_PROGRAMS) {
    if (prog.hostCarriers.includes(upperCarrier)) {
      for (const kw of prog.keywords) {
        if (kw.length >= 3) {
          keywords.add(kw.toLowerCase());
        }
      }
    }
  }
  const airlineName = getAirlineName(upperCarrier);
  if (airlineName && airlineName !== upperCarrier) {
    keywords.add(airlineName.toLowerCase());
  }
  return Array.from(keywords);
}

export function parseConfiguredPointsCurrencies(rawPointsCurrencies?: string | null): string[] {
  if (!rawPointsCurrencies) return [];
  try {
    const parsed =
      typeof rawPointsCurrencies === 'string'
        ? JSON.parse(rawPointsCurrencies)
        : rawPointsCurrencies;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0);
  } catch {
    return [];
  }
}

export function resolvePointsCurrencyLabel(params: {
  detectedProgramLabel?: string | null;
  airlineCode?: string | null;
  configuredCurrencies: string[];
}): string {
  const { detectedProgramLabel, airlineCode, configuredCurrencies } = params;
  const cleanProgram = (detectedProgramLabel || '').trim();
  const lowerProgram = cleanProgram.toLowerCase();
  const upperCarrier = (airlineCode || '').trim().toUpperCase();

  if (configuredCurrencies.length > 0) {
    // 1. Exact case-insensitive match against configured Points & Miles Currencies
    if (lowerProgram) {
      const exact = configuredCurrencies.find((c) => c.toLowerCase() === lowerProgram);
      if (exact) return exact;

      // 2. Substring / token overlap (e.g., detected "TrueBlue" matches configured "TrueBlue points")
      const partial = configuredCurrencies.find((c) => {
        const cl = c.toLowerCase();
        return cl.includes(lowerProgram) || lowerProgram.includes(cl);
      });
      if (partial) return partial;
    }

    // 3. Match by operating carrier's loyalty program keywords against user-configured currencies
    if (upperCarrier) {
      const keywords = getCarrierLoyaltyKeywords(upperCarrier);
      for (const kw of keywords) {
        const matched = configuredCurrencies.find((c) => c.toLowerCase().includes(kw));
        if (matched) return matched;
      }
    }
  }

  // 4. If email named a non-fiat loyalty program (e.g., "TrueBlue points"), preserve it
  if (cleanProgram && isPointsCurrency(cleanProgram)) {
    return cleanProgram;
  }

  // 5. Generic fallback recognized by FlightSentry's isPointsCurrency()
  return 'PTS';
}