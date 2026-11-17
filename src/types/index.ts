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
  bookingAirline?: string | null;
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
  taxesAmount?: number | null;
  taxesCurrency?: string | null;
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
  dataSourceStrategy: string; // e.g., "serpapi,searchapi,openfarescraper"
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
  openfareScraperEnabled: number;
  openfareScraperPrioritizeFirst?: number;
  openfareScraperUrl?: string | null;
  openfareScraperApiKey?: string | null;
  serpApiQuota: number;
  searchApiQuota: number;
  serpApiQuotaMode?: QuotaResetMode;
  searchApiQuotaMode?: QuotaResetMode;
  serpApiUsed: number;
  searchApiUsed: number;
  openfareScraperUsed: number;
  serpApiPaused: number;
  searchApiPaused: number;
  openfareScraperPaused: number;
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
  emailScannerEnabled?: number; // 0 (false) or 1 (true)
  emailScannerPollIntervalMinutes?: number;
  emailScannerNotifyEnabled?: number; // 0 (false) or 1 (true)
  appBaseUrl?: string | null;
}

export interface ImapAccount {
  id: number;
  label: string;
  host: string;
  port: number;
  tls: number; // 0 (false) or 1 (true)
  username: string;
  encryptedPassword: string;
  folder: string;
  enabled: number; // 0 (false) or 1 (true)
  lastUid: number;
  uidValidity?: number | null;
  baselineTimestamp: string;
  lastCheckedAt?: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ImapAccountPublic = Omit<ImapAccount, 'encryptedPassword'> & {
  hasPassword: boolean;
  maskedPassword: string;
};

export type EmailQueueEventType = 'new_booking' | 'schedule_change' | 'cancellation';
export type EmailQueueStatus = 'pending' | 'applied' | 'denied';
export type EmailParseConfidence = 'high' | 'medium' | 'low';
export type EmailParserSource = 'schema_org' | 'heuristic';

export interface ParsedFlightEmailEvent {
  eventType: EmailQueueEventType;
  pnr?: string | null;
  airline?: string | null;
  flightNumber?: string | null;
  origin?: string | null;
  destination?: string | null;
  departureDate?: string | null; // YYYY-MM-DD
  departureTime?: string | null; // HH:MM
  arrivalTime?: string | null; // HH:MM
  cabinClass?: CabinClass | null;
  fareTier?: FareTier | null;
  price?: number | null;
  currency?: string | null;
  isPoints?: number; // 0 (false) or 1 (true)
  taxesAmount?: number | null;
  taxesCurrency?: string | null;
  confidence: EmailParseConfidence;
  parserSource: EmailParserSource;
}

export interface EmailQueueItem {
  id: number;
  accountId: number | null;
  accountLabel: string;
  messageId?: string | null;
  emailSubject?: string | null;
  emailFrom?: string | null;
  emailDate?: string | null;
  eventType: EmailQueueEventType;
  dedupeKey: string;
  pnr?: string | null;
  airline?: string | null;
  flightNumber?: string | null;
  origin?: string | null;
  destination?: string | null;
  departureDate?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  cabinClass?: CabinClass | null;
  fareTier?: FareTier | null;
  price?: number | null;
  currency?: string | null;
  isPoints: number; // 0 (false) or 1 (true)
  taxesAmount?: number | null;
  taxesCurrency?: string | null;
  matchedFlightId?: number | null;
  confidence: EmailParseConfidence;
  parserSource: EmailParserSource;
  status: EmailQueueStatus;
  createdAt: string;
  resolvedAt?: string | null;
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

export interface AuthConfig {
  id: number;
  enabled: number; // 0 (false) or 1 (true)
  username: string;
  passwordHash: string | null;
  passwordSalt: string | null;
  sessionDurationDays: number;
  updatedAt: string;
}

export interface AuthSession {
  id: string;
  username: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  revokedAt?: string | null;
}

export interface AuthSessionPublic {
  id: string;
  username: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface AuthPasskey {
  id: number;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports?: string | null;
  deviceType?: string | null;
  backedUp: number; // 0 (false) or 1 (true)
  name: string;
  createdAt: string;
  lastUsedAt?: string | null;
}

export interface AuthPasskeyPublic {
  id: number;
  credentialId: string;
  deviceType: string | null;
  backedUp: boolean;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface AuthStatusResponse {
  authEnabled: boolean;
  authenticated: boolean;
  username: string;
  envManaged: boolean;
  hasPassword: boolean;
  hasPasskeys: boolean;
  passkeyCount: number;
  currentSessionId: string | null;
  sessionDurationDays: number;
}

export type AuthMethod = 'disabled' | 'session' | 'bearer';

export type ApiKeyScope = 'read' | 'write' | 'admin';

export interface ApiKeyRecord {
  id: number;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string; // JSON array of ApiKeyScope
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
}

export interface ApiKeyPublic {
  id: number;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  isExpired: boolean;
  isRevoked: boolean;
}

export interface ApiRequestLog {
  id: number;
  apiKeyId?: number | null;
  keyPrefix?: string | null;
  method: string;
  path: string;
  statusCode: number;
  ipAddress?: string | null;
  durationMs?: number | null;
  createdAt: string;
}

export interface PublicApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AuthContext {
  authenticated: boolean;
  method: AuthMethod;
  username?: string;
  sessionId?: string;
  apiKeyId?: number;
  apiKeyPrefix?: string;
  scopes?: ApiKeyScope[];
}