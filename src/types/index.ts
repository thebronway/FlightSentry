export type FlightStatus = 'Upcoming' | 'Paused' | 'Past';
export type FareTier = 'Basic Economy' | 'Standard';
export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';
export type SearchMode = 'Route' | 'FlightNumber';
export type PriceTrackingDirection = 'drop' | 'increase' | 'both';

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
  allTimeLow?: number | null;
  allTimeHigh?: number | null;
  latestMetadata?: string | null;
  earliestDeparture?: string | null; // HH:MM
  latestDeparture?: string | null; // HH:MM
  noRedeye?: number; // 0 (false) or 1 (true)
  priceTrackingDirection: PriceTrackingDirection; // 'drop' | 'increase' | 'both'
  minIncreaseDollar?: number | null;
  minIncreasePercent?: number | null;
  maxStops?: number | null;
}

export interface RouteItinerary {
  airline: string;
  airlineName?: string;
  flightNumber?: string;
  price: number;
  departureTime?: string;
  arrivalTime?: string;
  duration?: string;
  stops?: number;
  isNonstop?: boolean;
}

export interface PriceHistory {
  id: number;
  flightId: number;
  price: number;
  status: string; // e.g., 'Success', 'SoldOut', 'Error'
  checkedAt: string; // ISO DateTime
  airline?: string | null;
  flightNumber?: string | null;
  metadata?: string | null; // JSON-encoded RouteItinerary[]
  sourceUsed?: string | null;
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
  checkStartTime?: string | null; // e.g., '06:00' (HH:MM 24h format)
  operatingHoursStart?: number | null;
  operatingHoursEnd?: number | null;
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
  roundRobinIndex: number;
  hasdataApiKey?: string | null;
  hasdataEnabled: number;
  hasdataQuota: number;
  hasdataUsed: number;
  hasdataPaused: number;
  discordEnabled: number;
  discordWebhookUrl?: string | null;
  slackEnabled: number;
  slackWebhookUrl?: string | null;
  genericWebhookEnabled: number;
  genericWebhookUrl?: string | null;
  smtpEnabled: number;
  serpApiResetDate?: string | null; // YYYY-MM-DD
  searchApiResetDate?: string | null; // YYYY-MM-DD
  hasdataResetDate?: string | null; // YYYY-MM-DD
  quotaResetDate: string; // YYYY-MM-DD
  quotaResetDay: number; // Day of the month (1-31)
  serpApiResetDay?: number | null; // Day of the month (1-31)
  searchApiResetDay?: number | null; // Day of the month (1-31)
  hasdataResetDay?: number | null; // Day of the month (1-31)
  globalPause: number; // 0 (false) or 1 (true)
}