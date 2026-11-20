export * from './airlineThemes';
import { AIRLINE_NAMES, BRAND_COLORS, AIRLINE_THEMES, AIRLINE_ALIASES, getAirlineName, getAirlineColor } from './airlineThemes';
import { buildGoogleFlightsUrl } from './googleFlightsUrl';

export const INVALID_AIRLINE_CODES = new Set(['XX', 'UN']);
export const IATA_CARRIER_REGEX = /^(?=[A-Z0-9]*[A-Z])[A-Z0-9]{2}$/;

export function isValidAirlineCode(code?: string | null): boolean {
  if (!code) return false;
  const upper = code.trim().toUpperCase();
  if (INVALID_AIRLINE_CODES.has(upper)) return false;
  return IATA_CARRIER_REGEX.test(upper);
}

export function normalizeAirlineCode(rawNameOrCode: string, rawFlightNum?: string): string {
  if (!rawNameOrCode && !rawFlightNum) return 'UN';

  // 1. Check if flight number string starts with a 2-character carrier code containing at least one letter (e.g. "DL 523", "B6 142")
  if (rawFlightNum) {
    const match = rawFlightNum.trim().match(/^((?:[A-Z]{2}|[A-Z]\d|\\d[A-Z]))\s*\d+/i);
    if (match) {
      const prefix = match[1].toUpperCase();
      if (isValidAirlineCode(prefix)) return prefix;
    }
  }

  const input = (rawNameOrCode || '').trim();
  const upper = input.toUpperCase();

  // Explicitly reject unknown/placeholder IATA codes
  if (INVALID_AIRLINE_CODES.has(upper)) return 'UN';

  // 2. Check explicit common aliases and catchalls (e.g. SW -> WN, JB -> B6, DELTA -> DL)
  if (AIRLINE_ALIASES[upper] && isValidAirlineCode(AIRLINE_ALIASES[upper])) {
    return AIRLINE_ALIASES[upper];
  }

  // 3. Known official 2-character codes in the airline theme catalog
  if (AIRLINE_THEMES[upper] && isValidAirlineCode(upper)) return upper;

  // 4. Dynamic lookup derived from AIRLINE_THEMES and AIRLINE_ALIASES (longest match first)
  const lower = input.toLowerCase();
  if (lower.length >= 3) {
    const catalogCandidates: Array<{ term: string; code: string }> = [];
    for (const theme of Object.values(AIRLINE_THEMES)) {
      if (!isValidAirlineCode(theme.code)) continue;
      catalogCandidates.push({ term: theme.name.toLowerCase(), code: theme.code });
      catalogCandidates.push({ term: theme.shortName.toLowerCase(), code: theme.code });
    }
    for (const [alias, code] of Object.entries(AIRLINE_ALIASES)) {
      if (!isValidAirlineCode(code)) continue;
      catalogCandidates.push({ term: alias.toLowerCase(), code });
    }

    catalogCandidates.sort((a, b) => b.term.length - a.term.length);

    // Exact name/alias match first
    for (const candidate of catalogCandidates) {
      if (lower === candidate.term) {
        return candidate.code;
      }
    }

    // Substring match for descriptive strings (e.g. "Operated by Delta Air Lines")
    for (const candidate of catalogCandidates) {
      if (candidate.term.length >= 4 && lower.includes(candidate.term)) {
        return candidate.code;
      }
      if (candidate.term.length === 3) {
        const wordRegex = new RegExp(`\\b${candidate.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        if (wordRegex.test(lower)) {
          return candidate.code;
        }
      }
    }
  }

  // 5. If already a valid 2-character IATA carrier code (not XX or UN)
  if (isValidAirlineCode(upper)) return upper;

  return 'UN';
}

function extractRegistrableDomainLabel(domain: string): string {
  const parts = domain.toLowerCase().split('.').filter(Boolean);
  if (parts.length < 2) return '';
  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  if (last.length === 2 && /^(co|com|net|org|gov|ac)$/.test(secondLast) && parts.length >= 3) {
    return parts[parts.length - 3];
  }
  return secondLast;
}

export function resolveAirlineFromDomain(domain?: string | null): string | null {
  if (!domain) return null;
  const label = extractRegistrableDomainLabel(domain.trim());
  if (!label) return null;

  const upperLabel = label.toUpperCase();
  if (AIRLINE_THEMES[upperLabel] && isValidAirlineCode(upperLabel)) {
    return upperLabel;
  }
  if (AIRLINE_ALIASES[upperLabel] && isValidAirlineCode(AIRLINE_ALIASES[upperLabel])) {
    return AIRLINE_ALIASES[upperLabel];
  }

  const strippedLabel = label.replace(/^(?:fly|my|go)|(?:airlines|airways|air)$/g, '');
  if (strippedLabel.length >= 3) {
    const upperStripped = strippedLabel.toUpperCase();
    if (AIRLINE_ALIASES[upperStripped] && isValidAirlineCode(AIRLINE_ALIASES[upperStripped])) {
      return AIRLINE_ALIASES[upperStripped];
    }
  }

  const candidates: Array<{ compact: string; code: string }> = [];
  for (const theme of Object.values(AIRLINE_THEMES)) {
    if (!isValidAirlineCode(theme.code)) continue;
    candidates.push({
      compact: theme.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      code: theme.code,
    });
    candidates.push({
      compact: theme.shortName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      code: theme.code,
    });
  }
  for (const [alias, code] of Object.entries(AIRLINE_ALIASES)) {
    const compact = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (compact.length >= 4 && isValidAirlineCode(code)) {
      candidates.push({ compact, code });
    }
  }

  candidates.sort((a, b) => b.compact.length - a.compact.length);

  for (const c of candidates) {
    if (label === c.compact || (strippedLabel && strippedLabel === c.compact)) {
      return c.code;
    }
  }

  for (const c of candidates) {
    if (c.compact.length >= 5 && label.includes(c.compact)) {
      return c.code;
    }
  }

  return null;
}

let cachedCarrierTextPatterns: Array<{ pattern: RegExp; code: string; weight: number }> | null = null;

export function detectAirlineInText(text: string): string | null {
  if (!text) return null;
  if (!cachedCarrierTextPatterns) {
    const seenTerms = new Set<string>();
    const patterns: Array<{ pattern: RegExp; code: string; weight: number }> = [];

    const registerTerm = (term: string, code: string) => {
      const clean = term.trim();
      const lower = clean.toLowerCase();
      if (lower.length < 4 || seenTerms.has(lower) || !isValidAirlineCode(code)) {
        return;
      }
      seenTerms.add(lower);
      const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\s+/g, '\\s+');
      patterns.push({
        pattern: new RegExp(`\\b${escaped}\\b`, 'i'),
        code,
        weight: lower.length,
      });
    };

    for (const theme of Object.values(AIRLINE_THEMES)) {
      registerTerm(theme.name, theme.code);
      registerTerm(theme.shortName, theme.code);
    }
    for (const [alias, code] of Object.entries(AIRLINE_ALIASES)) {
      registerTerm(alias, code);
    }

    patterns.sort((a, b) => b.weight - a.weight);
    cachedCarrierTextPatterns = patterns;
  }

  for (const entry of cachedCarrierTextPatterns) {
    if (entry.pattern.test(text)) {
      return entry.code;
    }
  }
  return null;
}

export function cleanFlightNumber(rawFlightNumber: string, airlineCode?: string): string {
  let num = (rawFlightNumber || '').trim();
  if (!num) return '';

  if (airlineCode) {
    const prefixRegex = new RegExp(`^${airlineCode}\\s*`, 'i');
    num = num.replace(prefixRegex, '');
  }

  // Only strip a 2-character IATA carrier prefix if it contains letters (e.g. B6, F9, AA),
  // NEVER strip leading digits if the remaining flight number is pure numbers (e.g. 830, 2828).
  num = num.replace(/^(?:[A-Z]{2}|[A-Z]\d|\d[A-Z])\s*(?=\d)/i, '').trim();

  // Extract only the flight number digits
  const match = num.match(/\d+/);
  return match ? match[0] : num.trim();
}

export function cleanDisplayTime(timeStr?: string): string | null {
  if (!timeStr) return null;
  const str = timeStr.trim();
  if (!str || str.includes('undefined')) return null;

  // If timeStr is "YYYY-MM-DD HH:MM" or ISO string, extract time component
  const timePart = str.includes(' ') ? str.split(' ')[1] : str.includes('T') ? str.split('T')[1] : str;
  const match = timePart.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return timePart.length <= 8 ? timePart : null;

  const hours = parseInt(match[1], 10);
  const minutes = match[2];
  if (isNaN(hours)) return null;

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${period}`;
}

export function getGoogleFlightsUrl(
  flight: {
    origin?: string | null;
    destination?: string | null;
    departureDate: string;
    airline?: string | null;
    flightNumber?: string | null;
    cabinClass?: string | null;
    fareTier?: string | null;
    currency?: string | null;
    searchMode?: string | null;
  },
  fallbackCurrency?: string | null
): string {
  return buildGoogleFlightsUrl(
    {
      origin: flight.origin,
      destination: flight.destination,
      departureDate: flight.departureDate,
      cabinClass: flight.cabinClass,
      fareTier: flight.fareTier,
      currency: flight.currency,
    },
    { fallbackCurrency }
  );
}

export function getDataSourceStatus(settings?: any | null): {
  configured: boolean;
  allPaused: boolean;
  quotaExhausted: boolean;
  available: boolean;
  reason?: string;
} {
  if (!settings) {
    return { configured: true, allPaused: false, quotaExhausted: false, available: true };
  }

  const isEnabled = (val: any) => val === 1 || val === true || val === '1' || val === 'true';
  const isPaused = (val: any) => val === 1 || val === true || val === '1' || val === 'true';

  const serpKey = (settings.serpApiKey || '').trim();
  const searchKey = (settings.searchApiKey || '').trim();
  const scraperUrl = (settings.openfareScraperUrl || '').trim();
  const scraperKey = (settings.openfareScraperApiKey || '').trim();

  const serpConfigured = isEnabled(settings.serpApiEnabled) && Boolean(serpKey);
  const searchConfigured = isEnabled(settings.searchApiEnabled) && Boolean(searchKey);
  const scraperConfigured = isEnabled(settings.openfareScraperEnabled) && Boolean(scraperUrl) && Boolean(scraperKey);

  const anyConfigured = serpConfigured || searchConfigured || scraperConfigured;

  if (!anyConfigured) {
    return {
      configured: false,
      allPaused: false,
      quotaExhausted: false,
      available: false,
      reason: 'No data sources configured. Please configure an API key or enable a data source in Settings.',
    };
  }

  if (settings.globalPause === 1) {
    return {
      configured: true,
      allPaused: true,
      quotaExhausted: false,
      available: false,
      reason: 'All data sources are currently paused (Global Pause is active).',
    };
  }

  const serpActive = serpConfigured && !isPaused(settings.serpApiPaused) && (settings.serpApiQuota === 0 || settings.serpApiUsed < settings.serpApiQuota);
  const searchActive = searchConfigured && !isPaused(settings.searchApiPaused) && (settings.searchApiQuota === 0 || settings.searchApiUsed < settings.searchApiQuota);
  const scraperActive = scraperConfigured && !isPaused(settings.openfareScraperPaused);

  const anyActive = serpActive || searchActive || scraperActive;

  if (!anyActive) {
    const serpExhausted = serpConfigured && settings.serpApiQuota > 0 && settings.serpApiUsed >= settings.serpApiQuota;
    const searchExhausted = searchConfigured && settings.searchApiQuota > 0 && settings.searchApiUsed >= settings.searchApiQuota;

    const allConfiguredMeteredExhausted = (!serpConfigured || serpExhausted) &&
                                          (!searchConfigured || searchExhausted);

    if (allConfiguredMeteredExhausted && !scraperConfigured) {
      return {
        configured: true,
        allPaused: false,
        quotaExhausted: true,
        available: false,
        reason: 'All configured data sources have exhausted their monthly API quota.',
      };
    }

    return {
      configured: true,
      allPaused: true,
      quotaExhausted: false,
      available: false,
      reason: 'All configured data sources are currently paused.',
    };
  }

  return {
    configured: true,
    allPaused: false,
    quotaExhausted: false,
    available: true,
  };
}

export function getOperatingAirlines(flight: {
  searchMode?: string | null;
  flightNumber?: string | null;
  latestMetadata?: string | null;
  includedAirlines?: string | null;
  airline?: string | null;
}): string[] {
  if (flight.searchMode === 'FlightNumber' && flight.flightNumber) {
    return [];
  }
  const set = new Set<string>();
  if (flight.latestMetadata) {
    try {
      const parsed = JSON.parse(flight.latestMetadata);
      if (Array.isArray(parsed)) {
        parsed.forEach((it: any) => {
          if (it.airline) set.add(it.airline.toUpperCase());
        });
      }
    } catch {
      // Ignored
    }
  }
  if (set.size === 0 && flight.includedAirlines) {
    flight.includedAirlines.split(',').forEach(code => {
      const clean = code.trim().toUpperCase();
      if (clean) set.add(clean);
    });
  }
  if (set.size === 0 && flight.airline) {
    const upper = flight.airline.toUpperCase();
    if (upper !== 'POINTS' && upper !== 'MANUAL') {
      set.add(upper);
    }
  }
  return Array.from(set).sort();
}

export function getCurrentPriceAirline(flight: {
  searchMode?: string | null;
  flightNumber?: string | null;
  latestMetadata?: string | null;
  currentPrice: number;
  airline?: string | null;
}): { code: string; flightNumber: string | null } | null {
  const isFlightNumMode = flight.searchMode === 'FlightNumber' && flight.flightNumber;
  if (isFlightNumMode) {
    return { code: flight.airline || '', flightNumber: flight.flightNumber || null };
  }
  if (flight.latestMetadata) {
    try {
      const parsed = JSON.parse(flight.latestMetadata);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const exactMatch = parsed.find((it: any) => it.price === flight.currentPrice && it.airline);
        if (exactMatch) {
          return { code: exactMatch.airline.toUpperCase(), flightNumber: exactMatch.flightNumber || null };
        }
        const sortedByPrice = [...parsed]
          .filter((it: any) => it.airline && typeof it.price === 'number')
          .sort((a: any, b: any) => a.price - b.price);
        if (sortedByPrice.length > 0) {
          return { code: sortedByPrice[0].airline.toUpperCase(), flightNumber: sortedByPrice[0].flightNumber || null };
        }
      }
    } catch {
      // Ignored
    }
  }
  if (flight.airline) {
    const upper = flight.airline.toUpperCase();
    if (upper !== 'POINTS' && upper !== 'MANUAL') {
      return { code: upper, flightNumber: null };
    }
  }
  return null;
}