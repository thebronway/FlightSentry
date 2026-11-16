import { getAirlineName } from '../../utils/airline';
import { isPointsCurrency } from '../../utils/format';

// Standard loyalty program keywords per IATA carrier code (used only to match against user-configured pointsCurrencies)
const CARRIER_LOYALTY_KEYWORDS: Record<string, string[]> = {
  B6: ['trueblue', 'jetblue'],
  AA: ['aadvantage', 'american'],
  DL: ['skymiles', 'delta'],
  UA: ['mileageplus', 'united'],
  WN: ['rapid rewards', 'southwest'],
  AS: ['mileage plan', 'atmos', 'alaska'],
  HA: ['hawaiianmiles', 'hawaiian'],
  NK: ['free spirit', 'spirit'],
  F9: ['frontier miles', 'frontier'],
  AC: ['aeroplan', 'air canada'],
  BA: ['avios', 'british airways', 'executive club'],
  IB: ['avios', 'iberia'],
  EI: ['avios', 'aer lingus'],
  QR: ['avios', 'privilege club', 'qatar'],
  AF: ['flying blue', 'air france'],
  KL: ['flying blue', 'klm'],
  LH: ['miles & more', 'miles and more', 'lufthansa'],
  LX: ['miles & more', 'swiss'],
  OS: ['miles & more', 'austrian'],
  VS: ['flying club', 'virgin atlantic'],
  SQ: ['krisflyer', 'singapore'],
  EK: ['skywards', 'emirates'],
  CX: ['asia miles', 'cathay'],
  NH: ['ana mileage', 'ana'],
  JL: ['jal mileage', 'jal'],
  QF: ['frequent flyer', 'qantas'],
  TK: ['miles&smiles', 'miles & smiles', 'turkish'],
};

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
      const keywords = [...(CARRIER_LOYALTY_KEYWORDS[upperCarrier] || [])];
      const airlineName = getAirlineName(upperCarrier);
      if (airlineName && airlineName !== upperCarrier) {
        keywords.push(airlineName.toLowerCase());
      }

      for (const kw of keywords) {
        if (kw.length < 3) continue;
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