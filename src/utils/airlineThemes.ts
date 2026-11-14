export interface AirlineTheme {
  code: string;
  name: string;
  shortName: string;
  color: string;
  textColor?: string;
}

export const AIRLINE_ALIASES: Record<string, string> = {
  // Southwest
  SW: 'WN',
  SWA: 'WN',
  SOUTHWEST: 'WN',
  'SOUTH WEST': 'WN',
  LUV: 'WN',

  // JetBlue
  JB: 'B6',
  JBU: 'B6',
  JETBLUE: 'B6',
  'JET BLUE': 'B6',

  // Delta
  DELTA: 'DL',
  DAL: 'DL',

  // American
  AMERICAN: 'AA',
  AAL: 'AA',

  // United
  UNITED: 'UA',
  UAL: 'UA',

  // Alaska
  ALASKA: 'AS',
  ASA: 'AS',

  // Frontier
  FRONTIER: 'F9',
  FFT: 'F9',

  // Spirit
  SPIRIT: 'NK',
  NKS: 'NK',

  // Allegiant
  ALLEGIANT: 'G4',
  AAY: 'G4',

  // Hawaiian
  HAWAIIAN: 'HA',
  HAL: 'HA',

  // Sun Country
  SC: 'SY',
  SUNCOUNTRY: 'SY',
  'SUN COUNTRY': 'SY',

  // Breeze
  BREEZE: 'MX',

  // Avelo
  AVELO: 'XP',

  // Air Canada
  'AIR CANADA': 'AC',
  AIRCANADA: 'AC',
  ACA: 'AC',

  // WestJet
  WESTJET: 'WS',
  'WEST JET': 'WS',
  WJA: 'WS',

  // British Airways
  'BRITISH AIRWAYS': 'BA',
  BRITISH: 'BA',
  BAW: 'BA',

  // Air France
  'AIR FRANCE': 'AF',
  AIRFRANCE: 'AF',
  AFR: 'AF',

  // Lufthansa
  LUFTHANSA: 'LH',
  DLH: 'LH',

  // KLM
  KLM: 'KL',

  // Virgin Atlantic & Virgin Australia
  VIRGIN: 'VS',
  'VIRGIN ATLANTIC': 'VS',
  VIRGINATLANTIC: 'VS',
  VIR: 'VS',
  'VIRGIN AUSTRALIA': 'VA',
  VIRGINAUSTRALIA: 'VA',
  VOZ: 'VA',

  // Aeromexico
  AEROMEXICO: 'AM',
  AMX: 'AM',

  // Avianca
  AVIANCA: 'AV',
  AVA: 'AV',

  // Copa
  COPA: 'CM',
  CMP: 'CM',

  // LATAM
  LATAM: 'LA',
  LAN: 'LA',

  // Volaris
  VOLARIS: 'Y4',
  VOI: 'Y4',

  // VivaAerobus
  VIVAAEROBUS: 'VB',
  VIVA: 'VB',
  VIV: 'VB',

  // Emirates
  EMIRATES: 'EK',
  UAE: 'EK',

  // Qatar
  QATAR: 'QR',
  QTR: 'QR',

  // Singapore
  SINGAPORE: 'SQ',
  SIA: 'SQ',

  // Cathay
  CATHAY: 'CX',
  CPA: 'CX',

  // Qantas
  QANTAS: 'QF',
  QFA: 'QF',
};

export const AIRLINE_THEMES: Record<string, AirlineTheme> = {
  // US Major & Low-Cost Carriers
  DL: { code: 'DL', name: 'Delta Air Lines', shortName: 'Delta', color: '#E01A22' },
  AA: { code: 'AA', name: 'American Airlines', shortName: 'American', color: '#38BDF8' },
  UA: { code: 'UA', name: 'United Airlines', shortName: 'United', color: '#1D4ED8' },
  WN: { code: 'WN', name: 'Southwest Airlines', shortName: 'Southwest', color: '#EAB308' },
  B6: { code: 'B6', name: 'JetBlue Airways', shortName: 'JetBlue', color: '#FF6633' },
  AS: { code: 'AS', name: 'Alaska Airlines', shortName: 'Alaska', color: '#10B981' },
  F9: { code: 'F9', name: 'Frontier Airlines', shortName: 'Frontier', color: '#059669' },
  NK: { code: 'NK', name: 'Spirit Airlines', shortName: 'Spirit', color: '#FEE100', textColor: '#000000' },
  G4: { code: 'G4', name: 'Allegiant Air', shortName: 'Allegiant', color: '#005596' },
  HA: { code: 'HA', name: 'Hawaiian Airlines', shortName: 'Hawaiian', color: '#9C1F82' },
  SY: { code: 'SY', name: 'Sun Country Airlines', shortName: 'Sun Country', color: '#F26722' },
  MX: { code: 'MX', name: 'Breeze Airways', shortName: 'Breeze', color: '#009FE3' },
  XP: { code: 'XP', name: 'Avelo Airlines', shortName: 'Avelo', color: '#682B85' },

  // Canada & Transatlantic Carriers
  AC: { code: 'AC', name: 'Air Canada', shortName: 'Air Canada', color: '#D82F26' },
  WS: { code: 'WS', name: 'WestJet', shortName: 'WestJet', color: '#00828A' },
  BA: { code: 'BA', name: 'British Airways', shortName: 'British Airways', color: '#075AAA' },
  AF: { code: 'AF', name: 'Air France', shortName: 'Air France', color: '#002157' },
  LH: { code: 'LH', name: 'Lufthansa', shortName: 'Lufthansa', color: '#05164D' },
  KL: { code: 'KL', name: 'KLM Royal Dutch Airlines', shortName: 'KLM', color: '#00A1DE' },
  IB: { code: 'IB', name: 'Iberia', shortName: 'Iberia', color: '#D7192D' },
  EI: { code: 'EI', name: 'Aer Lingus', shortName: 'Aer Lingus', color: '#006272' },
  AZ: { code: 'AZ', name: 'ITA Airways', shortName: 'ITA', color: '#003B71' },
  LX: { code: 'LX', name: 'Swiss International Air Lines', shortName: 'SWISS', color: '#E30613' },
  OS: { code: 'OS', name: 'Austrian Airlines', shortName: 'Austrian', color: '#D81E05' },
  SK: { code: 'SK', name: 'SAS Scandinavian Airlines', shortName: 'SAS', color: '#000066' },
  TP: { code: 'TP', name: 'TAP Air Portugal', shortName: 'TAP', color: '#7FA837' },
  TK: { code: 'TK', name: 'Turkish Airlines', shortName: 'Turkish', color: '#E81932' },
  VS: { code: 'VS', name: 'Virgin Atlantic', shortName: 'Virgin Atlantic', color: '#C5003E' },

  // Middle East & Asia-Pacific Carriers
  QR: { code: 'QR', name: 'Qatar Airways', shortName: 'Qatar', color: '#5C0632' },
  EK: { code: 'EK', name: 'Emirates', shortName: 'Emirates', color: '#D71A21' },
  EY: { code: 'EY', name: 'Etihad Airways', shortName: 'Etihad', color: '#B59A57' },
  SQ: { code: 'SQ', name: 'Singapore Airlines', shortName: 'Singapore', color: '#B98B32' },
  CX: { code: 'CX', name: 'Cathay Pacific', shortName: 'Cathay Pacific', color: '#006564' },
  NH: { code: 'NH', name: 'All Nippon Airways', shortName: 'ANA', color: '#003594' },
  JL: { code: 'JL', name: 'Japan Airlines', shortName: 'JAL', color: '#C8102E' },
  KE: { code: 'KE', name: 'Korean Air', shortName: 'Korean Air', color: '#006FBA' },
  QF: { code: 'QF', name: 'Qantas', shortName: 'Qantas', color: '#E40000' },
  VA: { code: 'VA', name: 'Virgin Australia', shortName: 'Virgin Australia', color: '#E20025' },
  NZ: { code: 'NZ', name: 'Air New Zealand', shortName: 'Air NZ', color: '#1B1B1B' },

  // Latin America & Caribbean Carriers
  AM: { code: 'AM', name: 'Aeromexico', shortName: 'Aeromexico', color: '#0B2341' },
  AV: { code: 'AV', name: 'Avianca', shortName: 'Avianca', color: '#E31837' },
  CM: { code: 'CM', name: 'Copa Airlines', shortName: 'Copa', color: '#003865' },
  LA: { code: 'LA', name: 'LATAM Airlines', shortName: 'LATAM', color: '#E30613' },
  Y4: { code: 'Y4', name: 'Volaris', shortName: 'Volaris', color: '#7C2582' },
  VB: { code: 'VB', name: 'VivaAerobus', shortName: 'VivaAerobus', color: '#00A850' },
};

export function getAirlineTheme(code: string): AirlineTheme {
  const upper = (code || '').trim().toUpperCase();
  const resolved = AIRLINE_ALIASES[upper] || upper;
  if (AIRLINE_THEMES[resolved]) {
    return AIRLINE_THEMES[resolved];
  }

  // Deterministic lightness-bounded HSL fallback for unlisted carriers
  let hash = 0;
  for (let i = 0; i < upper.length; i++) {
    hash = upper.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const color = `hsl(${hue}, 70%, 60%)`;

  return {
    code: upper || 'UN',
    name: upper ? `Airline (${upper})` : 'Unknown Airline',
    shortName: upper || 'Unknown',
    color,
  };
}

export function getAirlineName(code: string): string {
  return getAirlineTheme(code).name;
}

export function getAirlineColor(code: string): string {
  return getAirlineTheme(code).color;
}

export const AIRLINE_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(AIRLINE_THEMES).map(([k, v]) => [k, v.name])
);

export const BRAND_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(AIRLINE_THEMES).map(([k, v]) => [k, v.color])
);

export type AirlineAllianceKey = 'STAR_ALLIANCE' | 'SKYTEAM' | 'ONEWORLD';

export interface AllianceDefinition {
  key: AirlineAllianceKey;
  name: string;
  shortName: string;
  memberCarriers: string[];
}

export const AIRLINE_ALLIANCES: Record<AirlineAllianceKey, AllianceDefinition> = {
  STAR_ALLIANCE: {
    key: 'STAR_ALLIANCE',
    name: 'Star Alliance',
    shortName: 'Star Alliance',
    memberCarriers: ['UA', 'AC', 'LH', 'SQ', 'NH', 'TK', 'LX', 'OS', 'TP', 'AV', 'CM', 'NZ', 'BR', 'OZ', 'A3', 'SN', 'LO', 'ET', 'AI', 'SA'],
  },
  SKYTEAM: {
    key: 'SKYTEAM',
    name: 'SkyTeam',
    shortName: 'SkyTeam',
    memberCarriers: ['DL', 'AF', 'KL', 'KE', 'AM', 'AZ', 'VS', 'SK', 'AR', 'CI', 'GA', 'ME', 'SV', 'RO', 'VN', 'MF'],
  },
  ONEWORLD: {
    key: 'ONEWORLD',
    name: 'oneworld',
    shortName: 'oneworld',
    memberCarriers: ['AA', 'AS', 'BA', 'CX', 'QR', 'QF', 'JL', 'IB', 'AY', 'MH', 'RJ', 'AT', 'UL', 'FJ'],
  },
};

export const ALLIANCE_ALIASES: Record<string, AirlineAllianceKey> = {
  STAR_ALLIANCE: 'STAR_ALLIANCE',
  STARALLIANCE: 'STAR_ALLIANCE',
  STAR: 'STAR_ALLIANCE',
  SA: 'STAR_ALLIANCE',
  'STAR ALLIANCE': 'STAR_ALLIANCE',

  SKYTEAM: 'SKYTEAM',
  SKY_TEAM: 'SKYTEAM',
  'SKY TEAM': 'SKYTEAM',
  ST: 'SKYTEAM',

  ONEWORLD: 'ONEWORLD',
  ONE_WORLD: 'ONEWORLD',
  'ONE WORLD': 'ONEWORLD',
  OW: 'ONEWORLD',
};

export function resolveAllianceKey(input?: string | null): AirlineAllianceKey | null {
  if (!input) return null;
  const upper = input.trim().toUpperCase();
  return ALLIANCE_ALIASES[upper] || null;
}

export function isAllianceKey(input?: string | null): boolean {
  return Boolean(resolveAllianceKey(input));
}

export function expandAlliancesToAirlines(alliancesOrAirlinesStr?: string | null): string[] {
  if (!alliancesOrAirlinesStr) return [];
  const tokens = alliancesOrAirlinesStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  const carriers = new Set<string>();
  for (const token of tokens) {
    const allianceKey = resolveAllianceKey(token);
    if (allianceKey && AIRLINE_ALLIANCES[allianceKey]) {
      AIRLINE_ALLIANCES[allianceKey].memberCarriers.forEach(c => carriers.add(c));
    } else {
      carriers.add(token);
    }
  }
  return Array.from(carriers);
}

export interface LoyaltyProgramDefinition {
  id: string;
  programLabel: string;
  keywords: string[];
  hostCarriers: string[];
  alliance: AirlineAllianceKey | null;
  partnerCarriers: string[];
}

export interface ResolvedLoyaltyProgram {
  id: string;
  programLabel: string;
  hostCarriers: string[];
  alliance: AirlineAllianceKey | null;
  allianceName: string | null;
  partnerCarriers: string[];
  allowedCarriers: string[];
}

export const LOYALTY_PROGRAMS: LoyaltyProgramDefinition[] = [
  {
    id: 'aadvantage',
    programLabel: 'American Airlines AAdvantage',
    keywords: ['aadvantage', 'aavantage', 'aa', 'american', 'oneworld'],
    hostCarriers: ['AA'],
    alliance: 'ONEWORLD',
    partnerCarriers: ['HA', 'EY', 'G3', 'GF', 'TN', 'WS', 'YX'],
  },
  {
    id: 'mileageplus',
    programLabel: 'United MileagePlus',
    keywords: ['mileageplus', 'mileage plus', 'ua', 'united', 'star alliance'],
    hostCarriers: ['UA'],
    alliance: 'STAR_ALLIANCE',
    partnerCarriers: ['B6', 'EI', 'VA', 'EY', 'EN', 'WK', '4Y', 'EW', 'YX', 'G3', 'AD', 'ZK'],
  },
  {
    id: 'trueblue',
    programLabel: 'JetBlue TrueBlue',
    keywords: ['trueblue', 'true blue', 'b6', 'jb', 'jetblue', 'jet blue'],
    hostCarriers: ['B6'],
    alliance: null,
    partnerCarriers: ['UA', 'AA', 'EI', 'EY', 'HA', 'AS', 'QR', 'SQ', 'TP', 'TK', 'WS', 'UX', 'JX'],
  },
  {
    id: 'skymiles',
    programLabel: 'Delta SkyMiles',
    keywords: ['skymiles', 'sky miles', 'dl', 'delta', 'skyteam'],
    hostCarriers: ['DL'],
    alliance: 'SKYTEAM',
    partnerCarriers: ['WS', 'LA', 'AM', 'KE', 'AF', 'KL', 'VS', 'VA', 'HA', 'G3', 'CM'],
  },
  {
    id: 'alaska_atmos',
    programLabel: 'Alaska Mileage Plan / Atmos',
    keywords: ['mileage plan', 'atmos', 'as', 'alaska'],
    hostCarriers: ['AS'],
    alliance: 'ONEWORLD',
    partnerCarriers: ['HA', 'DE', 'EI', 'FI', 'KE', 'LA', 'SQ', 'TN', 'JX', 'PR'],
  },
  {
    id: 'rapid_rewards',
    programLabel: 'Southwest Rapid Rewards',
    keywords: ['rapid rewards', 'wn', 'sw', 'southwest', 'south west'],
    hostCarriers: ['WN'],
    alliance: null,
    partnerCarriers: ['FI'],
  },
  {
    id: 'aeroplan',
    programLabel: 'Air Canada Aeroplan',
    keywords: ['aeroplan', 'ac', 'air canada'],
    hostCarriers: ['AC'],
    alliance: 'STAR_ALLIANCE',
    partnerCarriers: ['EY', 'EK', 'VA', 'GF', 'OM', 'G3', 'AD', '4Y', 'WK', 'EN', 'EW', 'EI'],
  },
  {
    id: 'avios',
    programLabel: 'Avios (oneworld)',
    keywords: ['avios', 'ba', 'qr', 'ib', 'ay', 'ei', 'british', 'qatar', 'iberia', 'finnair', 'aer lingus'],
    hostCarriers: ['BA', 'QR', 'IB', 'AY', 'EI'],
    alliance: 'ONEWORLD',
    partnerCarriers: ['LA', 'VY'],
  },
  {
    id: 'flying_blue',
    programLabel: 'Air France / KLM Flying Blue',
    keywords: ['flying blue', 'af', 'kl', 'air france', 'klm'],
    hostCarriers: ['AF', 'KL'],
    alliance: 'SKYTEAM',
    partnerCarriers: ['WS', 'JL', 'QF', 'EY', 'G3', 'CM'],
  },
  {
    id: 'miles_and_more',
    programLabel: 'Lufthansa Miles & More',
    keywords: ['miles & more', 'miles and more', 'lh', 'lx', 'os', 'lufthansa', 'swiss', 'austrian'],
    hostCarriers: ['LH', 'LX', 'OS'],
    alliance: 'STAR_ALLIANCE',
    partnerCarriers: ['EN', '4Y', 'EW', 'WK'],
  },
  {
    id: 'krisflyer',
    programLabel: 'Singapore KrisFlyer',
    keywords: ['krisflyer', 'kris flyer', 'sq', 'singapore'],
    hostCarriers: ['SQ'],
    alliance: 'STAR_ALLIANCE',
    partnerCarriers: ['AS', 'B6', 'VA', 'VS'],
  },
  {
    id: 'asia_miles',
    programLabel: 'Cathay Asia Miles',
    keywords: ['asia miles', 'cx', 'cathay'],
    hostCarriers: ['CX'],
    alliance: 'ONEWORLD',
    partnerCarriers: ['LH', 'LX', 'OS'],
  },
  {
    id: 'skywards',
    programLabel: 'Emirates Skywards',
    keywords: ['skywards', 'ek', 'emirates'],
    hostCarriers: ['EK'],
    alliance: null,
    partnerCarriers: ['UA', 'AC', 'QF', 'B6', 'AS', 'KE', 'MH', 'TP', 'JL'],
  },
  {
    id: 'etihad_guest',
    programLabel: 'Etihad Guest',
    keywords: ['etihad', 'ey'],
    hostCarriers: ['EY'],
    alliance: null,
    partnerCarriers: ['AA', 'AC', 'AF', 'KL', 'B6', 'KE', 'SK', 'SV', 'VA'],
  },
  {
    id: 'virgin_points',
    programLabel: 'Virgin Atlantic Flying Club',
    keywords: ['virgin', 'flying club', 'vs'],
    hostCarriers: ['VS'],
    alliance: 'SKYTEAM',
    partnerCarriers: ['NH', 'NZ', 'SQ', 'VA', 'HA'],
  },
  {
    id: 'lifemiles',
    programLabel: 'Avianca LifeMiles',
    keywords: ['lifemiles', 'life miles', 'av', 'avianca'],
    hostCarriers: ['AV'],
    alliance: 'STAR_ALLIANCE',
    partnerCarriers: ['IB', 'AM'],
  },
  {
    id: 'hawaiianmiles',
    programLabel: 'HawaiianMiles',
    keywords: ['hawaiian', 'ha'],
    hostCarriers: ['HA'],
    alliance: 'ONEWORLD',
    partnerCarriers: ['AA', 'AS', 'B6', 'DL', 'JL', 'KE', 'VA'],
  },
];

const TRANSFERABLE_BANK_KEYWORDS = [
  'chase',
  'ultimate rewards',
  'amex',
  'american express',
  'membership rewards',
  'capital one',
  'citi',
  'thankyou',
  'thank you',
  'bilt',
  'wells fargo',
];

function buildResolvedLoyaltyProgram(def: LoyaltyProgramDefinition): ResolvedLoyaltyProgram {
  const allowed = new Set<string>(def.hostCarriers);
  let allianceName: string | null = null;
  if (def.alliance && AIRLINE_ALLIANCES[def.alliance]) {
    allianceName = AIRLINE_ALLIANCES[def.alliance].name;
    AIRLINE_ALLIANCES[def.alliance].memberCarriers.forEach(c => allowed.add(c));
  }
  def.partnerCarriers.forEach(c => allowed.add(c));

  return {
    id: def.id,
    programLabel: def.programLabel,
    hostCarriers: def.hostCarriers,
    alliance: def.alliance,
    allianceName,
    partnerCarriers: def.partnerCarriers,
    allowedCarriers: Array.from(allowed),
  };
}

export function resolveLoyaltyProgram(currencyName?: string | null): ResolvedLoyaltyProgram | null {
  if (!currencyName) return null;
  const trimmed = currencyName.trim();
  if (!trimmed || trimmed.toUpperCase() === 'PTS') return null;
  const lower = trimmed.toLowerCase();

  // Exclude transferable bank currencies (e.g., Chase UR, Amex MR, Capital One, Bilt)
  if (TRANSFERABLE_BANK_KEYWORDS.some(kw => lower.includes(kw))) {
    return null;
  }

  const wordTokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
  for (const def of LOYALTY_PROGRAMS) {
    const matched = def.keywords.some(kw =>
      kw.length <= 2 ? wordTokens.includes(kw) : lower.includes(kw)
    );
    if (matched) {
      return buildResolvedLoyaltyProgram(def);
    }
  }

  // Fallback: check if currency starts with a known 2-letter IATA airline code (e.g. "JL miles", "HA points")
  const prefixMatch = trimmed.toUpperCase().match(/^([A-Z0-9]{2})\b/);
  if (prefixMatch) {
    const code = AIRLINE_ALIASES[prefixMatch[1]] || prefixMatch[1];
    if (AIRLINE_THEMES[code]) {
      const matchedAlliance = (Object.keys(AIRLINE_ALLIANCES) as AirlineAllianceKey[]).find(k =>
        AIRLINE_ALLIANCES[k].memberCarriers.includes(code)
      ) || null;
      return buildResolvedLoyaltyProgram({
        id: `carrier_${code.toLowerCase()}`,
        programLabel: `${AIRLINE_THEMES[code].name} (${code})`,
        keywords: [],
        hostCarriers: [code],
        alliance: matchedAlliance,
        partnerCarriers: [],
      });
    }
  }

  return null;
}

export function checkLoyaltyCarrierCompatibility(
  currencyName?: string | null,
  operatingCarrier?: string | null,
  bookingCarrier?: string | null
): {
  hasWarning: boolean;
  program: ResolvedLoyaltyProgram | null;
  message: string | null;
} {
  const program = resolveLoyaltyProgram(currencyName);
  if (!program) {
    return { hasWarning: false, program: null, message: null };
  }

  const opCode = (operatingCarrier || '').trim().toUpperCase();
  const bookCode = (bookingCarrier || '').trim().toUpperCase();

  if (!opCode && !bookCode) {
    return { hasWarning: false, program, message: null };
  }

  const opAllowed = opCode ? program.allowedCarriers.includes(opCode) : null;
  const bookAllowed = bookCode ? program.allowedCarriers.includes(bookCode) : null;

  // If operating carrier is entered, it must be in the loyalty program's allowed alliance/partner network
  if (opCode && opAllowed) {
    return { hasWarning: false, program, message: null };
  }
  if (!opCode && bookCode && bookAllowed) {
    return { hasWarning: false, program, message: null };
  }

  const networkDesc = program.allianceName
    ? `${program.allianceName} alliance or partner airline`
    : program.partnerCarriers.length > 0
    ? `${program.hostCarriers.join('/')} or an eligible partner airline`
    : `${program.hostCarriers.join('/')}`;

  const sampleCarriers = program.allowedCarriers.slice(0, 8).join(', ');
  const enteredLabel = opCode && !opAllowed ? opCode : bookCode;

  return {
    hasWarning: true,
    program,
    message: `${currencyName} (${program.programLabel}) typically requires a ${networkDesc} (e.g. ${sampleCarriers}). "${enteredLabel}" is not listed as an eligible alliance or partner carrier. You can still save if this is a special partner redemption.`,
  };
}