import { resolveToAirportList } from './coLocations';
import { isPointsCurrency } from './format';

export interface GoogleFlightsUrlInput {
  origin?: string | string[] | null;
  destination?: string | string[] | null;
  departureDate: string;
  cabinClass?: string | null;
  fareTier?: string | null;
  currency?: string | null;
}

export interface BuildGoogleFlightsUrlOptions {
  excludeBasicEconomy?: boolean;
  fallbackCurrency?: string | null;
}

function normalizeAirportCodes(input?: string | string[] | null): string[] {
  if (!input) return [];
  const rawList = Array.isArray(input) ? input : resolveToAirportList(input);
  const unique: string[] = [];
  for (const item of rawList) {
    const code = item.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(code) && !unique.includes(code)) {
      unique.push(code);
    }
  }
  return unique.slice(0, 8);
}

function encodeVarint(value: number): number[] {
  const bytes: number[] = [];
  let v = value >>> 0;
  while (v > 0x7f) {
    bytes.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  bytes.push(v & 0x7f);
  return bytes;
}

function fieldVarint(fieldNumber: number, value: number): number[] {
  return [...encodeVarint((fieldNumber << 3) | 0), ...encodeVarint(value)];
}

function fieldBytes(fieldNumber: number, payload: number[]): number[] {
  return [
    ...encodeVarint((fieldNumber << 3) | 2),
    ...encodeVarint(payload.length),
    ...payload,
  ];
}

function fieldString(fieldNumber: number, text: string): number[] {
  const encoded = new TextEncoder().encode(text);
  return fieldBytes(fieldNumber, Array.from(encoded));
}

function encodeCabinEnum(cabin?: string | null): number {
  switch ((cabin || 'economy').toLowerCase()) {
    case 'premium_economy':
      return 2;
    case 'business':
      return 3;
    case 'first':
      return 4;
    case 'economy':
    default:
      return 1;
  }
}

function toBase64Url(bytes: number[]): string {
  const uint8 = new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(uint8).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function resolveFiatCurrency(
  currency?: string | null,
  fallbackCurrency?: string | null
): string {
  const candidate = (currency || '').trim().toUpperCase();
  if (candidate && /^[A-Z]{3}$/.test(candidate) && !isPointsCurrency(candidate)) {
    return candidate;
  }
  const fallback = (fallbackCurrency || '').trim().toUpperCase();
  if (fallback && /^[A-Z]{3}$/.test(fallback) && !isPointsCurrency(fallback)) {
    return fallback;
  }
  return 'USD';
}

export function buildGoogleFlightsUrl(
  req: GoogleFlightsUrlInput,
  options?: BuildGoogleFlightsUrlOptions
): string {
  const originAirports = normalizeAirportCodes(req.origin);
  const destAirports = normalizeAirportCodes(req.destination);
  const departureDate = (req.departureDate || '').trim();

  if (originAirports.length === 0 || destAirports.length === 0 || !departureDate) {
    return 'https://www.google.com/travel/flights';
  }

  const normalizedCabin = (req.cabinClass || 'economy').toLowerCase();
  const normalizedTier = (req.fareTier || 'Standard').toLowerCase();
  const isBasicFare = normalizedTier === 'basic economy' || normalizedTier === 'basic';

  const excludeBasic =
    options?.excludeBasicEconomy ??
    (normalizedCabin === 'economy' && !isBasicFare);

  const flightSliceParts: number[] = [...fieldString(2, departureDate)];

  for (const originCode of originAirports) {
    flightSliceParts.push(
      ...fieldBytes(13, [...fieldVarint(1, 1), ...fieldString(2, originCode)])
    );
  }

  for (const destCode of destAirports) {
    flightSliceParts.push(
      ...fieldBytes(14, [...fieldVarint(1, 1), ...fieldString(2, destCode)])
    );
  }

  const rootParts: number[] = [
    ...fieldVarint(1, 28),
    ...fieldVarint(2, 2), // One-way trip
    ...fieldBytes(3, flightSliceParts),
    ...fieldVarint(8, 1), // 1 adult passenger
    ...fieldVarint(9, encodeCabinEnum(normalizedCabin)),
  ];

  // Encode Google Flights native "Economy (exclude Basic)" flag (field 25 = 1)
  if (excludeBasic) {
    rootParts.push(...fieldVarint(25, 1));
  }

  rootParts.push(...fieldVarint(19, 2));

  const tfsToken = toBase64Url(rootParts);
  const url = new URL('https://www.google.com/travel/flights/search');
  url.searchParams.set('tfs', tfsToken);
  if (excludeBasic) {
    url.searchParams.set('tfu', 'EgYIABAAGAA');
  }
  url.searchParams.set('hl', 'en');
  url.searchParams.set('curr', resolveFiatCurrency(req.currency, options?.fallbackCurrency));

  return url.toString();
}