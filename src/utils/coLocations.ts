/**
 * Co-location registry for metropolitan area airport codes (MACs)
 * and multi-airport regional clusters supported by Google Flights and flight search APIs.
 */

export interface CoLocationEntry {
  code: string;
  name: string;
  airports: string[];
}

export interface RegionalClusterEntry {
  name: string;
  airports: string[];
}

export interface CoLocationInfo {
  isMetro: boolean;
  name: string;
  airports: string[];
  description: string;
  suggestedCode?: string;
  suggestedActionLabel?: string;
}

/**
 * Official IATA Metropolitan Area Codes (MACs) and their constituent commercial airports.
 * Standardized international 3-letter codes accepted natively by Google Flights.
 */
export const METRO_AIRPORT_MAP: Record<string, CoLocationEntry> = {
  WAS: {
    code: 'WAS',
    name: 'Washington, D.C. Area',
    airports: ['DCA', 'IAD', 'BWI'],
  },
  NYC: {
    code: 'NYC',
    name: 'New York City Area',
    airports: ['JFK', 'LGA', 'EWR', 'SWF', 'HPN'],
  },
  CHI: {
    code: 'CHI',
    name: 'Chicago Area',
    airports: ['ORD', 'MDW'],
  },
  LON: {
    code: 'LON',
    name: 'London Area',
    airports: ['LHR', 'LGW', 'STN', 'LTN', 'LCY', 'SEN'],
  },
  PAR: {
    code: 'PAR',
    name: 'Paris Area',
    airports: ['CDG', 'ORY', 'BVA'],
  },
  TYO: {
    code: 'TYO',
    name: 'Tokyo Area',
    airports: ['HND', 'NRT'],
  },
  YTO: {
    code: 'YTO',
    name: 'Toronto Area',
    airports: ['YYZ', 'YTZ'],
  },
  YMQ: {
    code: 'YMQ',
    name: 'Montreal Area',
    airports: ['YUL', 'YHU'],
  },
  ROM: {
    code: 'ROM',
    name: 'Rome Area',
    airports: ['FCO', 'CIA'],
  },
  MIL: {
    code: 'MIL',
    name: 'Milan Area',
    airports: ['MXP', 'LIN', 'BGY'],
  },
  BJS: {
    code: 'BJS',
    name: 'Beijing Area',
    airports: ['PEK', 'PKX'],
  },
  OSA: {
    code: 'OSA',
    name: 'Osaka Area',
    airports: ['KIX', 'ITM', 'UKB'],
  },
  SEL: {
    code: 'SEL',
    name: 'Seoul Area',
    airports: ['ICN', 'GMP'],
  },
  SAO: {
    code: 'SAO',
    name: 'São Paulo Area',
    airports: ['GRU', 'CGH', 'VCP'],
  },
  RIO: {
    code: 'RIO',
    name: 'Rio de Janeiro Area',
    airports: ['GIG', 'SDU'],
  },
  BUE: {
    code: 'BUE',
    name: 'Buenos Aires Area',
    airports: ['EZE', 'AEP'],
  },
  STO: {
    code: 'STO',
    name: 'Stockholm Area',
    airports: ['ARN', 'BMA', 'NYO'],
  },
  MOW: {
    code: 'MOW',
    name: 'Moscow Area',
    airports: ['SVO', 'DME', 'VKO'],
  },
  REK: {
    code: 'REK',
    name: 'Reykjavik Area',
    airports: ['KEF', 'RKV'],
  },
  BHZ: {
    code: 'BHZ',
    name: 'Belo Horizonte Area',
    airports: ['CNF', 'PLU'],
  },
  SPK: {
    code: 'SPK',
    name: 'Sapporo Area',
    airports: ['CTS', 'OKD'],
  },
};

/**
 * Multi-airport regional clusters without a standalone 3-letter IATA MAC.
 * Includes DJT (President Donald J. Trump Intl) alongside PBI for South Florida / Palm Beach.
 */
export const REGIONAL_CLUSTERS: Record<string, RegionalClusterEntry> = {
  DFW: {
    name: 'Dallas–Fort Worth Area',
    airports: ['DFW', 'DAL'],
  },
  MIA: {
    name: 'South Florida / Miami Area',
    airports: ['MIA', 'FLL', 'PBI', 'DJT'],
  },
  LAX: {
    name: 'Greater Los Angeles Area',
    airports: ['LAX', 'BUR', 'LGB', 'SNA', 'ONT'],
  },
  SFO: {
    name: 'San Francisco Bay Area',
    airports: ['SFO', 'OAK', 'SJC'],
  },
  IAH: {
    name: 'Houston Area',
    airports: ['IAH', 'HOU'],
  },
};

// Reverse map: airport code -> metro code (e.g. DCA -> WAS, EWR -> NYC)
export const AIRPORT_TO_METRO: Record<string, string> = {};
Object.entries(METRO_AIRPORT_MAP).forEach(([metroCode, entry]) => {
  entry.airports.forEach(airport => {
    AIRPORT_TO_METRO[airport] = metroCode;
  });
});

/**
 * Checks whether an airport code is an official IATA metropolitan area code.
 */
export function isMetroCode(code?: string | null): boolean {
  if (!code) return false;
  return Boolean(METRO_AIRPORT_MAP[code.trim().toUpperCase()]);
}

/**
 * Returns whether two airport codes match either directly, as part of a multi-airport list,
 * or via an official metropolitan co-location (e.g. WAS matches DCA, but DCA does NOT match IAD).
 */
export function matchesAirportOrMetro(searchCode?: string | null, actualCode?: string | null): boolean {
  if (!searchCode || !actualCode) return false;

  const searchParts = searchCode.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  const actualParts = actualCode.split(',').map(a => a.trim().toUpperCase()).filter(Boolean);

  for (const s of searchParts) {
    for (const a of actualParts) {
      if (s === a) return true;
      // Search code is a metro code and actual flight departs from its constituent airport
      if (METRO_AIRPORT_MAP[s] && METRO_AIRPORT_MAP[s].airports.includes(a)) {
        return true;
      }
      // Actual flight has a metro code encompassing search
      if (METRO_AIRPORT_MAP[a] && METRO_AIRPORT_MAP[a].airports.includes(s)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Retrieves human-readable co-location or regional cluster guidance and explicit opt-in actions.
 */
export function getCoLocationInfo(code?: string | null): CoLocationInfo | null {
  if (!code) return null;
  const cleaned = code.trim().toUpperCase();
  const tokens = cleaned.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
  if (tokens.length === 0) return null;

  // Single airport code entered
  if (tokens.length === 1) {
    const token = tokens[0];

    // 1. Already an official Metro Code (e.g., WAS, NYC, CHI)
    if (METRO_AIRPORT_MAP[token]) {
      const entry = METRO_AIRPORT_MAP[token];
      return {
        isMetro: true,
        name: entry.name,
        airports: entry.airports,
        description: `Co-location (${entry.name}): includes ${entry.airports.join(', ')}`,
      };
    }

    // 2. Specific constituent airport of an official Metro Code (e.g., DCA, IAD, LGA)
    if (AIRPORT_TO_METRO[token]) {
      const metroCode = AIRPORT_TO_METRO[token];
      const entry = METRO_AIRPORT_MAP[metroCode];
      return {
        isMetro: false,
        name: entry.name,
        airports: entry.airports,
        description: `Part of ${entry.name} (${metroCode}: ${entry.airports.join(', ')})`,
        suggestedCode: metroCode,
        suggestedActionLabel: `Switch to ${metroCode} (All Area Airports)`,
      };
    }

    // 3. Member of a Regional Cluster without a single 3-letter code (e.g., DFW, MIA, SFO, LAX)
    for (const cluster of Object.values(REGIONAL_CLUSTERS)) {
      if (cluster.airports.includes(token)) {
        const others = cluster.airports.filter(a => a !== token);
        return {
          isMetro: false,
          name: cluster.name,
          airports: cluster.airports,
          description: `Nearby ${cluster.name} airports: ${others.join(', ')}`,
          suggestedCode: cluster.airports.join(', '),
          suggestedActionLabel: `Include ${others.join(', ')}`,
        };
      }
    }
  }

  // Multiple comma-separated codes already entered (e.g., DFW, DAL)
  if (tokens.length > 1) {
    for (const cluster of Object.values(REGIONAL_CLUSTERS)) {
      if (tokens.some(t => cluster.airports.includes(t))) {
        const missing = cluster.airports.filter(a => !tokens.includes(a));
        if (missing.length > 0) {
          return {
            isMetro: false,
            name: cluster.name,
            airports: cluster.airports,
            description: `Multi-airport search (${cluster.name}): ${tokens.join(', ')}`,
            suggestedCode: cluster.airports.join(', '),
            suggestedActionLabel: `Also include ${missing.join(', ')}`,
          };
        }
        return {
          isMetro: false,
          name: cluster.name,
          airports: cluster.airports,
          description: `Multi-airport search (${cluster.name}): all ${tokens.length} area airports included`,
        };
      }
    }
  }

  return null;
}

/**
 * Resolves an origin or destination string (single airport, metro code like WAS, or comma-separated list like "DFW, DAL")
 * into comma-separated commercial airport codes suitable for Google Flights / HasData / SerpApi / SearchApi.
 *
 * Examples:
 * - 'WAS' -> 'DCA,IAD,BWI'
 * - 'NYC' -> 'JFK,LGA,EWR,SWF,HPN'
 * - 'DFW, DAL' -> 'DFW,DAL'
 * - 'DCA' -> 'DCA'
 */
export function resolveToApiAirportCodes(input?: string | null): string {
  if (!input) return '';
  const tokens = input.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
  const resolvedAirports: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    if (METRO_AIRPORT_MAP[token]) {
      for (const a of METRO_AIRPORT_MAP[token].airports) {
        if (!seen.has(a)) {
          seen.add(a);
          resolvedAirports.push(a);
        }
      }
    } else {
      if (!seen.has(token)) {
        seen.add(token);
        resolvedAirports.push(token);
      }
    }
  }

  return resolvedAirports.join(',');
}

/**
 * Returns an array of individual airport codes for scraper engines that accept single airport queries.
 */
export function resolveToAirportList(input?: string | null): string[] {
  const resolved = resolveToApiAirportCodes(input);
  return resolved ? resolved.split(',') : [];
}

/**
 * Returns active co-location or multi-airport search description for display
 * ONLY when an airport string actively encompasses multiple airports
 * (either via an official IATA Metro Area Code like WAS/NYC or explicit comma-separated airports).
 *
 * Does NOT return suggestions for single physical airports (e.g. LAX, DCA).
 */
export function getActiveCoLocationBadge(code?: string | null): string | null {
  if (!code) return null;
  const cleaned = code.trim().toUpperCase();
  const tokens = cleaned.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
  if (tokens.length === 0) return null;

  // 1. Official Metro Area Code (e.g. WAS, NYC, CHI)
  if (tokens.length === 1 && METRO_AIRPORT_MAP[tokens[0]]) {
    const entry = METRO_AIRPORT_MAP[tokens[0]];
    return `Co-location (${entry.name}): includes ${entry.airports.join(', ')}`;
  }

  // 2. Multiple airports explicitly entered (e.g. "DFW, DAL" or "MIA, FLL")
  if (tokens.length > 1) {
    for (const cluster of Object.values(REGIONAL_CLUSTERS)) {
      if (tokens.some(t => cluster.airports.includes(t))) {
        return `Multi-airport search (${cluster.name}): ${tokens.join(', ')}`;
      }
    }
    return `Multi-airport search: ${tokens.join(', ')}`;
  }

  return null;
}