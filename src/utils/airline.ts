export const AIRLINE_NAMES: Record<string, string> = {
  DL: 'Delta Air Lines',
  AA: 'American Airlines',
  UA: 'United Airlines',
  B6: 'JetBlue Airways',
  WN: 'Southwest Airlines',
  AS: 'Alaska Airlines',
  F9: 'Frontier Airlines',
  NK: 'Spirit Airlines',
  G4: 'Allegiant Air',
  HA: 'Hawaiian Airlines',
  AC: 'Air Canada',
  BA: 'British Airways',
  AF: 'Air France',
  LH: 'Lufthansa',
  KL: 'KLM',
};

export const BRAND_COLORS: Record<string, string> = {
  DL: '#E01A22', // Delta Crimson Red
  AA: '#38BDF8', // American Electric Sky Blue
  UA: '#1D4ED8', // United Deep Navy Blue
  B6: '#FF6633', // JetBlue Safety/Vibrant Orange
  WN: '#EAB308', // Southwest Bold Gold / Yellow
  AS: '#10B981', // Alaska Spruce Teal / Green
  F9: '#059669', // Frontier Pine Dark Green
};

export function normalizeAirlineCode(rawNameOrCode: string, rawFlightNum?: string): string {
  if (!rawNameOrCode && !rawFlightNum) return 'UN';

  // 1. Check if flight number string starts with a 2-character carrier code (e.g. "DL 523", "B6 142")
  if (rawFlightNum) {
    const match = rawFlightNum.trim().match(/^([A-Z0-9]{2})\s*\d+/i);
    if (match) return match[1].toUpperCase();
  }

  const input = (rawNameOrCode || '').trim();
  const upper = input.toUpperCase();

  // If already a 2-character code
  if (upper.length === 2) return upper;

  // Match common names
  const lower = input.toLowerCase();
  if (lower.includes('delta')) return 'DL';
  if (lower.includes('american')) return 'AA';
  if (lower.includes('united')) return 'UA';
  if (lower.includes('jetblue')) return 'B6';
  if (lower.includes('southwest')) return 'WN';
  if (lower.includes('alaska')) return 'AS';
  if (lower.includes('frontier')) return 'F9';
  if (lower.includes('spirit')) return 'NK';
  if (lower.includes('allegiant')) return 'G4';
  if (lower.includes('hawaiian')) return 'HA';
  if (lower.includes('air canada')) return 'AC';
  if (lower.includes('british')) return 'BA';
  if (lower.includes('air france')) return 'AF';
  if (lower.includes('lufthansa')) return 'LH';
  if (lower.includes('klm')) return 'KL';

  // Fallback: take first 2 letters if alphabetic
  const letters = input.replace(/[^A-Za-z]/g, '').toUpperCase();
  return letters.length >= 2 ? letters.slice(0, 2) : (letters || 'UN');
}

export function getAirlineName(code: string): string {
  const upper = (code || '').trim().toUpperCase();
  return AIRLINE_NAMES[upper] || upper || 'Unknown Airline';
}

export function cleanFlightNumber(rawFlightNumber: string, airlineCode?: string): string {
  let num = (rawFlightNumber || '').trim();
  if (airlineCode) {
    const prefixRegex = new RegExp(`^${airlineCode}\\s*`, 'i');
    num = num.replace(prefixRegex, '');
  }
  return num.replace(/^[A-Z0-9]{2}\s*/i, '').trim();
}

export function getAirlineColor(airlineCode: string): string {
  const code = (airlineCode || '').trim().toUpperCase();
  if (BRAND_COLORS[code]) return BRAND_COLORS[code];

  // Deterministic lightness-bounded HSL hash for international and regional carriers
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
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
  available: boolean;
  reason?: string;
} {
  if (!settings) {
    return { configured: true, allPaused: false, available: true };
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
      available: false,
      reason: 'No data sources configured. Please configure an API key or enable a data source in Settings.',
    };
  }

  if (settings.globalPause === 1) {
    return {
      configured: true,
      allPaused: true,
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
    return {
      configured: true,
      allPaused: true,
      available: false,
      reason: 'All configured data sources are paused or have exhausted their monthly quota.',
    };
  }

  return {
    configured: true,
    allPaused: false,
    available: true,
  };
}