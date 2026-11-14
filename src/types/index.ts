export type FlightStatus = 'Watching' | 'Booked' | 'Paused' | 'Past';
export type FareTier = 'Basic Economy' | 'Standard';
export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';
export type SearchMode = 'Route' | 'FlightNumber';
export type PriceTrackingDirection = 'drop' | 'increase' | 'both';
export type QuotaResetMode = 'monthly' | 'one-time';

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
  originalPurchasePrice?: number | null;
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
  currency?: string | null;
  monitorRouteAlternatives?: number; // 0 (false) or 1 (true)
  bookingDate?: string | null; // YYYY-MM-DD
  isManual?: number; // 0 (false) or 1 (true)
  maxLayoverMinutes?: number | null;
  excludedConnectingAirports?: string | null;
  maxTotalDurationMinutes?: number | null;
  includedAlliances?: string | null;
  excludedAlliances?: string | null;
}

export type CheckResultStatus = 'Success' | 'SoldOut' | 'Error' | 'RateLimited' | 'Paused';

export interface AdapterExecutionOptions {
  onRawPayload?: (raw: unknown) => void;
}

export interface RouteSegment {
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
}

export interface RouteItinerary {
  airline: string;
  airlineName?: string;
  flightNumber?: string;
  origin?: string;
  destination?: string;
  price: number;
  departureTime?: string;
  arrivalTime?: string;
  duration?: string;
  durationMinutes?: number;
  stops?: number;
  isNonstop?: boolean;
  layoverAirports?: string[];
  maxLayoverMinutes?: number | null;
  legs?: RouteSegment[];
}

export interface PriceHistory {
  id: number;
  flightId: number;
  price: number;
  status: CheckResultStatus | 'Booked' | string; // e.g., 'Success', 'SoldOut', 'Error', 'RateLimited', 'Paused'
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
  dataSourceStrategy: string; // e.g., "serpapi,searchapi,flightsentry-scraper"
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
  currency?: string;
  minIncreaseDollar?: number;
  minIncreasePercent?: number;
  fallbackStrategyMode: string;
  serpApiEnabled: number;
  searchApiEnabled: number;
  flightsentryScraperEnabled: number;
  flightsentryScraperPrioritizeFirst?: number;
  flightsentryScraperUrl?: string | null;
  flightsentryScraperApiKey?: string | null;
  serpApiQuota: number;
  searchApiQuota: number;
  serpApiQuotaMode?: QuotaResetMode;
  searchApiQuotaMode?: QuotaResetMode;
  serpApiUsed: number;
  searchApiUsed: number;
  flightsentryScraperUsed: number;
  serpApiPaused: number;
  searchApiPaused: number;
  flightsentryScraperPaused: number;
  roundRobinIndex: number;
  discordEnabled: number;
  discordWebhookUrl?: string | null;
  slackEnabled: number;
  slackWebhookUrl?: string | null;
  genericWebhookEnabled: number;
  genericWebhookUrl?: string | null;
  smtpEnabled: number;
  serpApiResetDate?: string | null; // YYYY-MM-DD
  searchApiResetDate?: string | null; // YYYY-MM-DD
  quotaResetDate: string; // YYYY-MM-DD
  quotaResetDay: number; // Day of the month (1-31)
  serpApiResetDay?: number | null; // Day of the month (1-31)
  searchApiResetDay?: number | null; // Day of the month (1-31)
  pointsCurrencies?: string | null;
  globalPause: number; // 0 (false) or 1 (true)
  defaultCabinClass?: CabinClass;
  defaultFareTier?: FareTier;
  defaultNoRedeye?: number; // 0 (false) or 1 (true)
  defaultMaxStops?: number | null;
  defaultIncludedAirlines?: string | null;
  defaultExcludedAirlines?: string | null;
  maxStoredItineraries?: number;
  carrierDiversityEnabled?: number; // 0 (false) or 1 (true)
  defaultMaxLayoverMinutes?: number | null;
  defaultExcludedConnectingAirports?: string | null;
  defaultMaxTotalDurationMinutes?: number | null;
  githubSyncEnabled?: number; // 0 (false) or 1 (true)
  pastFlightRetentionDays?: number | null;
}

export type AnnouncementSeverity = 'info' | 'warning';

export interface AnnouncementItem {
  id: string;
  active: boolean;
  severity: AnnouncementSeverity;
  title: string;
  message: string;
  linkUrl?: string | null;
  linkText?: string | null;
  expiresAt?: string | null;
  maxVersion?: string | null;
}

export interface ReleaseSyncState {
  id: number;
  latestVersion?: string | null;
  announcementsJson: string;
  lastCheckedAt?: string | null;
  lastSyncStatus: 'never' | 'ok' | 'offline' | 'error';
  dismissedUpdateVersion?: string | null;
  dismissedUpdateUntil?: string | null;
  dismissedAnnouncementIds: string;
}

export interface UpdateBannerStatus {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  showUpdateBanner: boolean;
  githubSyncEnabled: boolean;
  lastCheckedAt: string | null;
  lastSyncStatus: 'never' | 'ok' | 'offline' | 'error';
  announcements: AnnouncementItem[];
}