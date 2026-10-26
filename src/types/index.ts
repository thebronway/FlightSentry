export type FlightStatus = 'Active' | 'Paused' | 'Expired';
export type FareTier = 'Basic Economy' | 'Standard';
export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';
export type SearchMode = 'Route' | 'FlightNumber';

export interface Flight {
  id: number;
  searchMode: SearchMode;
  origin?: string | null;
  destination?: string | null;
  departureDate: string; // YYYY-MM-DD
  airline: string;
  flightNumber?: string | null;
  includedAirlines?: string | null; // JSON array of strings
  excludedAirlines?: string | null; // JSON array of strings
  pnr?: string | null;
  fareTier: FareTier;
  cabinClass: CabinClass;
  baselinePrice: number;
  purchasePrice?: number | null;
  targetPrice?: number | null;
  currentPrice: number;
  minDropDollar?: number | null;
  minDropPercent?: number | null;
  notes?: string | null;
  scheduleOverride?: string | null; // JSON object for custom schedule cadences
  disableNotifications: number; // 0 (false) or 1 (true)
  nextCheckAt: string; // ISO DateTime for queue processing
  status: FlightStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistory {
  id: number;
  flightId: number;
  price: number;
  status: string; // e.g., 'Success', 'SoldOut', 'Error'
  checkedAt: string; // ISO DateTime
}

export interface Settings {
  id: number;
  serpApiKey?: string | null;
  searchApiKey?: string | null;
  dataSourceStrategy: string; // e.g., "serpapi,searchapi,fastflights"
  notificationsEnabled: number; // 0 (false) or 1 (true)
  appriseUrl?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  smtpFrom?: string | null;
  smtpTo?: string | null;
  timezone: string;
  circuitBreakerUntil?: string | null; // ISO DateTime
  scheduleFarOut: number; // Hours between checks (>90 days)
  scheduleStandard: number; // Hours between checks (14-90 days)
  scheduleFinalStretch: number; // Hours between checks (<14 days)
  operatingHoursStart: number; // e.g., 7 (7 AM)
  operatingHoursEnd: number; // e.g., 23 (11 PM)
  minDropDollar: number;
  minDropPercent: number;
  fallbackStrategyMode: string;
  serpApiEnabled: number;
  searchApiEnabled: number;
  fastFlightsEnabled: number;
  serpApiQuota: number;
  searchApiQuota: number;
  fastFlightsQuota: number;
  serpApiUsed: number;
  searchApiUsed: number;
  fastFlightsUsed: number;
  serpApiPaused: number;
  searchApiPaused: number;
  fastFlightsPaused: number;
  quotaResetDate: string; // YYYY-MM-DD
  globalPause: number; // 0 (false) or 1 (true)
}