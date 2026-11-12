export * from './airlineThemes';
import { AIRLINE_NAMES, BRAND_COLORS, AIRLINE_THEMES, AIRLINE_ALIASES, getAirlineName, getAirlineColor } from './airlineThemes';

export function normalizeAirlineCode(rawNameOrCode: string, rawFlightNum?: string): string {
  if (!rawNameOrCode && !rawFlightNum) return 'UN';

  // 1. Check if flight number string starts with a 2-character carrier code containing at least one letter (e.g. "DL 523", "B6 142")
  if (rawFlightNum) {
    const match = rawFlightNum.trim().match(/^((?:[A-Z]{2}|[A-Z]\d|\d[A-Z]))\s*\d+/i);
    if (match) return match[1].toUpperCase();
  }

  const input = (rawNameOrCode || '').trim();
  const upper = input.toUpperCase();

  // 2. Check explicit common aliases and catchalls (e.g. SW -> WN, JB -> B6, DELTA -> DL)
  if (AIRLINE_ALIASES[upper]) return AIRLINE_ALIASES[upper];

  // 3. Known official 2-character codes in the airline theme catalog
  if (AIRLINE_THEMES[upper]) return upper;

  // 4. Substring matching for full/partial airline names
  const lower = input.toLowerCase();
  if (lower.includes('delta')) return 'DL';
  if (lower.includes('american')) return 'AA';
  if (lower.includes('united')) return 'UA';
  if (lower.includes('jetblue') || lower.includes('jet blue')) return 'B6';
  if (lower.includes('southwest') || lower.includes('south west')) return 'WN';
  if (lower.includes('alaska')) return 'AS';
  if (lower.includes('frontier')) return 'F9';
  if (lower.includes('spirit')) return 'NK';
  if (lower.includes('allegiant')) return 'G4';
  if (lower.includes('hawaiian')) return 'HA';
  if (lower.includes('sun country') || lower.includes('suncountry')) return 'SY';
  if (lower.includes('breeze')) return 'MX';
  if (lower.includes('avelo')) return 'XP';
  if (lower.includes('air canada')) return 'AC';
  if (lower.includes('westjet') || lower.includes('west jet')) return 'WS';
  if (lower.includes('british')) return 'BA';
  if (lower.includes('air france')) return 'AF';
  if (lower.includes('lufthansa')) return 'LH';
  if (lower.includes('klm')) return 'KL';
  if (lower.includes('virgin')) return 'VS';

  // 5. If already a 2-character code
  if (upper.length === 2) return upper;

  // Fallback: take first 2 letters if alphabetic
  const letters = input.replace(/[^A-Za-z]/g, '').toUpperCase();
  return letters.length >= 2 ? letters.slice(0, 2) : (letters || 'UN');
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

export function getGoogleFlightsUrl(flight: {
  origin?: string | null;
  destination?: string | null;
  departureDate: string;
  airline?: string | null;
  flightNumber?: string | null;
  cabinClass?: string | null;
  searchMode?: string | null;
}): string {
  const isFlightNumMode = flight.searchMode === 'FlightNumber' && flight.flightNumber;
  const cabinClassQuery = flight.cabinClass === 'premium_economy'
    ? '%20premium%20economy'
    : flight.cabinClass === 'business'
    ? '%20business'
    : flight.cabinClass === 'first'
    ? '%20first%20class'
    : '';

  const flightNumQuery = isFlightNumMode && flight.flightNumber && flight.airline
    ? `%20${encodeURIComponent(flight.airline)}%20${encodeURIComponent(flight.flightNumber)}`
    : '';

  return `https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(flight.destination || '')}%20from%20${encodeURIComponent(flight.origin || '')}%20on%20${flight.departureDate}${flightNumQuery}${cabinClassQuery}%20oneway`;
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
  const hasdataKey = (settings.hasdataApiKey || '').trim();

  const serpConfigured = isEnabled(settings.serpApiEnabled) && Boolean(serpKey);
  const searchConfigured = isEnabled(settings.searchApiEnabled) && Boolean(searchKey);
  const hasdataConfigured = isEnabled(settings.hasdataEnabled) && Boolean(hasdataKey);
  const fastConfigured = isEnabled(settings.fastFlightsEnabled);

  const anyConfigured = serpConfigured || searchConfigured || hasdataConfigured || fastConfigured;

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
  const hasdataActive = hasdataConfigured && !isPaused(settings.hasdataPaused) && (settings.hasdataQuota === 0 || settings.hasdataUsed < settings.hasdataQuota);
  const fastActive = fastConfigured && !isPaused(settings.fastFlightsPaused);

  const anyActive = serpActive || searchActive || hasdataActive || fastActive;

  if (!anyActive) {
    const serpExhausted = serpConfigured && settings.serpApiQuota > 0 && settings.serpApiUsed >= settings.serpApiQuota;
    const searchExhausted = searchConfigured && settings.searchApiQuota > 0 && settings.searchApiUsed >= settings.searchApiQuota;
    const hasdataExhausted = hasdataConfigured && settings.hasdataQuota > 0 && settings.hasdataUsed >= settings.hasdataQuota;

    const allConfiguredMeteredExhausted = (!serpConfigured || serpExhausted) &&
                                          (!searchConfigured || searchExhausted) &&
                                          (!hasdataConfigured || hasdataExhausted);

    if (allConfiguredMeteredExhausted && !fastConfigured) {
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