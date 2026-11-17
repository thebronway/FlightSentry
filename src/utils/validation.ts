import { z } from 'zod';
import { isMetroCode } from './coLocations';
import { isValidAirlineCode } from './airline';
import { isAllianceKey } from './airlineThemes';

export const INVALID_AIRLINE_MESSAGE =
  "Carrier must be a valid 2-character IATA code (e.g. DL, B6, 9W) and cannot be 'XX' or 'UN'";

export const airlineCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((val) => isValidAirlineCode(val), INVALID_AIRLINE_MESSAGE);

const commaSeparatedAirlinesOrAlliancesSchema = z
  .string()
  .optional()
  .nullable()
  .refine((val) => {
    if (!val || !val.trim()) return true;
    const tokens = val
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    return tokens.every((token) => isAllianceKey(token) || isValidAirlineCode(token));
  }, "All airlines must be valid 2-character IATA codes (excluding 'XX' and 'UN') or recognized alliances");

export const flightSchema = z.object({
  searchMode: z.enum(['Route', 'FlightNumber']),
  origin: z
    .string()
    .regex(/^([A-Z]{3})(\s*,\s*[A-Z]{3})*$/, "Must be a 3-letter IATA code or comma-separated IATA codes (e.g. DCA, WAS, or DFW, DAL)")
    .toUpperCase()
    .optional()
    .nullable(),
  destination: z
    .string()
    .regex(/^([A-Z]{3})(\s*,\s*[A-Z]{3})*$/, "Must be a 3-letter IATA code or comma-separated IATA codes (e.g. DCA, WAS, or DFW, DAL)")
    .toUpperCase()
    .optional()
    .nullable(),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  airline: z.string().trim().toUpperCase().optional().nullable(),
  bookingAirline: z
    .string()
    .trim()
    .toUpperCase()
    .refine((val) => !val || isValidAirlineCode(val), INVALID_AIRLINE_MESSAGE)
    .optional()
    .nullable(),
  flightNumber: z.string().regex(/^\d+$/, "Flight number must be numbers only").optional().nullable(),
  includedAirlines: commaSeparatedAirlinesOrAlliancesSchema,
  excludedAirlines: commaSeparatedAirlinesOrAlliancesSchema,
  pnr: z.string().max(10).optional().nullable(),
  fareTier: z.enum(['Basic Economy', 'Standard']).default('Standard'),
  cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).default('economy'),
  baselinePrice: z.number().positive().optional().nullable(),
  purchasePrice: z.number().positive().optional().nullable(),
  originalPurchasePrice: z.number().positive().optional().nullable(),
  targetPrice: z.number().positive().optional().nullable(),
  minDropDollar: z.number().nonnegative().optional().nullable(),
  minDropPercent: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
  scheduleOverride: z.string().optional().nullable(),
  disableNotifications: z.number().min(0).max(1).optional().default(0),
  earliestDeparture: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:MM format").optional().nullable().or(z.literal('')),
  latestDeparture: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:MM format").optional().nullable().or(z.literal('')),
  noRedeye: z.number().min(0).max(1).optional().default(0),
  priceTrackingDirection: z.enum(['drop', 'increase', 'both']).default('drop'),
  minIncreaseDollar: z.number().nonnegative().optional().nullable(),
  minIncreasePercent: z.number().nonnegative().optional().nullable(),
  maxStops: z.number().int().min(0).max(2).optional().nullable(),
  currency: z.string().max(50).optional().nullable(),
  taxesAmount: z.number().nonnegative().optional().nullable(),
  taxesCurrency: z.string().trim().toUpperCase().max(10).optional().nullable().or(z.literal('')),
  monitorRouteAlternatives: z.number().min(0).max(1).optional().default(0),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").optional().nullable(),
  isManual: z.number().min(0).max(1).optional().default(0),
  maxLayoverMinutes: z.number().int().nonnegative().optional().nullable(),
  excludedConnectingAirports: z.string().optional().nullable(),
  maxTotalDurationMinutes: z.number().int().positive().optional().nullable(),
  includedAlliances: z.string().optional().nullable(),
  excludedAlliances: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  const cleanAirline = (data.airline || '').trim().toUpperCase();
  if (data.searchMode === 'FlightNumber') {
    if (!isValidAirlineCode(cleanAirline)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['airline'],
        message: INVALID_AIRLINE_MESSAGE,
      });
    }
    if (!data.flightNumber || !data.flightNumber.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['flightNumber'],
        message: 'Flight number is required when tracking a specific flight',
      });
    }
  } else if (cleanAirline && cleanAirline !== 'POINTS' && cleanAirline !== 'MANUAL' && !isValidAirlineCode(cleanAirline)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['airline'],
      message: INVALID_AIRLINE_MESSAGE,
    });
  }

  if (data.searchMode === 'FlightNumber' && data.monitorRouteAlternatives !== 1) {
    if (data.origin && (!/^[A-Z]{3}$/.test(data.origin) || isMetroCode(data.origin))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['origin'],
        message: 'Origin must be a single 3-letter IATA airport code unless monitoring route alternatives',
      });
    }
    if (data.destination && (!/^[A-Z]{3}$/.test(data.destination) || isMetroCode(data.destination))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['destination'],
        message: 'Destination must be a single 3-letter IATA airport code unless monitoring route alternatives',
      });
    }
  }
});

export const flightStatusSchema = z.object({
  status: z.enum(['Watching', 'Booked', 'Paused', 'Past']),
});

export const manualUsageSchema = z.discriminatedUnion('mode', [
  z.object({
    provider: z.enum(['serpapi', 'searchapi']),
    mode: z.literal('increment'),
    value: z.number().int().min(1).max(10000).optional().default(1),
  }),
  z.object({
    provider: z.enum(['serpapi', 'searchapi']),
    mode: z.literal('set'),
    value: z.number().int().min(0).max(1000000),
  }),
]);

const safeHttpUrlSchema = z
  .string()
  .trim()
  .url('Must be a valid URL')
  .refine((val) => {
    try {
      const parsed = new URL(val);
      return (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        !parsed.username &&
        !parsed.password
      );
    } catch {
      return false;
    }
  }, 'URL must use http or https protocol without embedded credentials');

const scraperUrlSchema = safeHttpUrlSchema
  .transform((val) => val.replace(/\/+$/, ''))
  .optional()
  .nullable()
  .or(z.literal(''));

const scraperApiKeySchema = z
  .string()
  .trim()
  .regex(/^ofs_[a-f0-9]{64}$/, 'API key must match ofs_<64 lowercase hex characters>')
  .optional()
  .nullable()
  .or(z.literal(''));

export const testScraperSchema = z.object({
  openfareScraperUrl: scraperUrlSchema,
  openfareScraperApiKey: scraperApiKeySchema,
});

export const settingsSchema = z.object({
  serpApiKey: z.string().optional().nullable().or(z.literal('')),
  searchApiKey: z.string().optional().nullable().or(z.literal('')),
  dataSourceStrategy: z.string().optional(),
  notificationsEnabled: z.number().min(0).max(1).optional(),
  discordEnabled: z.number().min(0).max(1).optional(),
  discordWebhookUrl: z.string().url().optional().nullable().or(z.literal('')),
  slackEnabled: z.number().min(0).max(1).optional(),
  slackWebhookUrl: z.string().url().optional().nullable().or(z.literal('')),
  genericWebhookEnabled: z.number().min(0).max(1).optional(),
  genericWebhookUrl: z.string().url().optional().nullable().or(z.literal('')),
  smtpEnabled: z.number().min(0).max(1).optional(),
  serpApiResetDate: z.string().optional().nullable().or(z.literal('')),
  searchApiResetDate: z.string().optional().nullable().or(z.literal('')),
  quotaResetDay: z.number().int().min(1).max(31).optional(),
  serpApiResetDay: z.number().int().min(1).max(31).optional().nullable(),
  searchApiResetDay: z.number().int().min(1).max(31).optional().nullable(),
  appriseUrl: z.string().url().optional().nullable().or(z.literal('')),
  smtpHost: z.string().optional().nullable().or(z.literal('')),
  smtpPort: z.number().optional().nullable(),
  smtpUser: z.string().optional().nullable().or(z.literal('')),
  smtpPass: z.string().optional().nullable().or(z.literal('')),
  smtpFrom: z.string().optional().nullable().or(z.literal('')),
  smtpTo: z.string().optional().nullable().or(z.literal('')),
  timezone: z.string().min(1),
  circuitBreakerUntil: z.string().optional().nullable(),
  scheduleFarOut: z.number().nonnegative(),
  scheduleStandard: z.number().nonnegative(),
  scheduleFinalStretch: z.number().nonnegative(),
  checkStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:MM format").optional().default('06:00'),
  operatingHoursStart: z.number().min(0).max(23).optional(),
  operatingHoursEnd: z.number().min(0).max(23).optional(),
  minDropDollar: z.number().nonnegative(),
  minDropPercent: z.number().nonnegative(),
  currency: z.string().min(1).max(5).optional(),
  minIncreaseDollar: z.number().nonnegative().optional(),
  minIncreasePercent: z.number().nonnegative().optional(),
  pointsCurrencies: z.union([
    z.string(),
    z.array(z.string()).transform(val => JSON.stringify(val))
  ]).optional().nullable(),
  defaultCabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).optional(),
  defaultFareTier: z.enum(['Basic Economy', 'Standard']).optional(),
  defaultNoRedeye: z.number().min(0).max(1).optional(),
  defaultMaxStops: z.number().int().min(0).max(2).optional().nullable(),
  defaultIncludedAirlines: commaSeparatedAirlinesOrAlliancesSchema,
  defaultExcludedAirlines: commaSeparatedAirlinesOrAlliancesSchema,
  maxStoredItineraries: z.number().int().min(6).max(24).optional(),
  carrierDiversityEnabled: z.number().min(0).max(1).optional(),
  defaultMaxLayoverMinutes: z.number().int().nonnegative().optional().nullable(),
  defaultExcludedConnectingAirports: z.string().optional().nullable(),
  defaultMaxTotalDurationMinutes: z.number().int().positive().optional().nullable(),
  fallbackStrategyMode: z.enum(['sequential-query', 'balanced-usage', 'exhaust-quota']).optional(),
  roundRobinIndex: z.number().int().nonnegative().optional(),
  serpApiEnabled: z.number().min(0).max(1).optional(),
  searchApiEnabled: z.number().min(0).max(1).optional(),
  openfareScraperEnabled: z.number().min(0).max(1).optional(),
  openfareScraperPrioritizeFirst: z.number().min(0).max(1).optional(),
  openfareScraperUrl: scraperUrlSchema,
  openfareScraperApiKey: scraperApiKeySchema,
  fliEnabled: z.number().min(0).max(1).optional(),
  serpApiQuota: z.number().min(0).optional(),
  searchApiQuota: z.number().min(0).optional(),
  serpApiQuotaMode: z.enum(['monthly', 'one-time']).optional(),
  searchApiQuotaMode: z.enum(['monthly', 'one-time']).optional(),
  serpApiPaused: z.number().min(0).max(1).optional(),
  searchApiPaused: z.number().min(0).max(1).optional(),
  openfareScraperPaused: z.number().min(0).max(1).optional(),
  fliPaused: z.number().min(0).max(1).optional(),
  globalPause: z.number().min(0).max(1),
  githubSyncEnabled: z.number().min(0).max(1).optional(),
  pastFlightRetentionDays: z.number().int().min(1).max(3650).optional().nullable(),
  emailScannerEnabled: z.number().min(0).max(1).optional(),
  emailScannerPollIntervalMinutes: z.number().int().min(5).max(1440).optional(),
  emailScannerNotifyEnabled: z.number().min(0).max(1).optional(),
  appBaseUrl: safeHttpUrlSchema.transform((val) => val.replace(/\/+$/, '')).optional().nullable().or(z.literal('')),
  onboardingCompleted: z.number().int().min(0).max(1).optional(),
});

const imapHostSchema = z
  .string()
  .trim()
  .min(1, 'IMAP host is required')
  .max(255)
  .regex(/^[a-zA-Z0-9.-]+$/, 'IMAP host must be a valid hostname or IP address');

const imapFolderSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .default('INBOX');

export const imapConnectionTestSchema = z.object({
  accountId: z.number().int().positive().optional().nullable(),
  host: imapHostSchema,
  port: z.number().int().min(1).max(65535).default(993),
  tls: z.number().min(0).max(1).default(1),
  username: z.string().trim().min(1, 'IMAP username is required').max(255),
  password: z.string().max(512).optional().nullable().or(z.literal('')),
  folder: imapFolderSchema,
});

export const imapAccountCreateSchema = z.object({
  label: z.string().trim().min(1, 'Account label is required').max(80),
  host: imapHostSchema,
  port: z.number().int().min(1).max(65535).default(993),
  tls: z.number().min(0).max(1).default(1),
  username: z.string().trim().min(1, 'IMAP username is required').max(255),
  password: z.string().min(1, 'IMAP password is required').max(512),
  folder: imapFolderSchema,
  enabled: z.number().min(0).max(1).default(1),
});

export const imapAccountUpdateSchema = z.object({
  label: z.string().trim().min(1, 'Account label is required').max(80).optional(),
  host: imapHostSchema.optional(),
  port: z.number().int().min(1).max(65535).optional(),
  tls: z.number().min(0).max(1).optional(),
  username: z.string().trim().min(1, 'IMAP username is required').max(255).optional(),
  password: z.string().max(512).optional().nullable().or(z.literal('')),
  folder: z.string().trim().min(1).max(128).optional(),
  enabled: z.number().min(0).max(1).optional(),
});

export const emailQueueItemEditSchema = z.object({
  eventType: z.enum(['new_booking', 'schedule_change', 'cancellation']).optional(),
  pnr: z.string().trim().toUpperCase().max(10).optional().nullable().or(z.literal('')),
  airline: z
    .string()
    .trim()
    .toUpperCase()
    .refine((val) => !val || isValidAirlineCode(val), INVALID_AIRLINE_MESSAGE)
    .optional()
    .nullable()
    .or(z.literal('')),
  flightNumber: z
    .string()
    .trim()
    .regex(/^\d*$/, 'Flight number must be digits only')
    .max(6)
    .optional()
    .nullable()
    .or(z.literal('')),
  origin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-Z]{3})?$/, 'Origin must be a 3-letter IATA airport code')
    .optional()
    .nullable()
    .or(z.literal('')),
  destination: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-Z]{3})?$/, 'Destination must be a 3-letter IATA airport code')
    .optional()
    .nullable()
    .or(z.literal('')),
  departureDate: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Departure date must be YYYY-MM-DD')
    .optional()
    .nullable()
    .or(z.literal('')),
  departureTime: z
    .string()
    .trim()
    .regex(/^(([01]\d|2[0-3]):[0-5]\d)?$/, 'Departure time must be HH:MM')
    .optional()
    .nullable()
    .or(z.literal('')),
  arrivalTime: z
    .string()
    .trim()
    .regex(/^(([01]\d|2[0-3]):[0-5]\d)?$/, 'Arrival time must be HH:MM')
    .optional()
    .nullable()
    .or(z.literal('')),
  cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).optional().nullable(),
  fareTier: z.enum(['Basic Economy', 'Standard']).optional().nullable(),
  price: z.number().nonnegative().optional().nullable(),
  currency: z.string().trim().max(50).optional().nullable().or(z.literal('')),
  isPoints: z.number().int().min(0).max(1).optional(),
  taxesAmount: z.number().nonnegative().optional().nullable(),
  taxesCurrency: z.string().trim().toUpperCase().max(10).optional().nullable().or(z.literal('')),
  matchedFlightId: z.number().int().positive().optional().nullable(),
});

export const emailQueueBulkSchema = z.object({
  action: z.enum(['apply', 'deny']),
  ids: z.array(z.number().int().positive()).min(1, 'Select at least one queue item').max(100),
});

export const cleanupPastFlightsSchema = z.discriminatedUnion('scope', [
  z.object({
    scope: z.literal('all'),
  }),
  z.object({
    scope: z.literal('retention'),
    retentionDays: z.number().int().min(1).max(3650),
  }),
]);

export const manualPriceEntrySchema = z.object({
  price: z.number().positive("Price or points must be greater than zero"),
  date: z
    .string()
    .min(1, "Date is required")
    .refine(
      val => {
        const time = new Date(val).getTime();
        return !isNaN(time) && time <= Date.now() + 60000;
      },
      "Date and time cannot be in the future"
    ),
  airline: airlineCodeSchema,
  flightNumber: z.string().regex(/^\d+$/, "Flight number must be numeric").optional().nullable().or(z.literal('')),
  origin: z.string().regex(/^([A-Z]{3})(\s*,\s*[A-Z]{3})*$/, "Origin must be a 3-letter IATA code or comma-separated IATA codes").optional().nullable().or(z.literal('')),
  destination: z.string().regex(/^([A-Z]{3})(\s*,\s*[A-Z]{3})*$/, "Destination must be a 3-letter IATA code or comma-separated IATA codes").optional().nullable().or(z.literal('')),
  isRebook: z.boolean().optional().default(false),
  pnr: z.string().max(10).optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
});

export const announcementItemSchema = z.object({
  id: z.string().trim().min(1).max(128),
  active: z.boolean(),
  severity: z.enum(['info', 'warning']).default('info'),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(2000),
  linkUrl: safeHttpUrlSchema.optional().nullable(),
  linkText: z.string().trim().max(80).optional().nullable(),
  expiresAt: z
    .string()
    .refine((val) => !Number.isNaN(Date.parse(val)), 'expiresAt must be a valid ISO date string')
    .optional()
    .nullable(),
  maxVersion: z
    .string()
    .regex(/^v?\d+\.\d+\.\d+$/, 'maxVersion must be numeric SemVer X.Y.Z')
    .optional()
    .nullable(),
});

export const announcementsFileSchema = z.array(announcementItemSchema).max(50);

export const bannerDismissSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('update'),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be X.Y.Z'),
    mode: z.enum(['24h', 'forever']),
  }),
  z.object({
    type: z.literal('announcement'),
    id: z.string().trim().min(1).max(128),
  }),
]);

export const devProviderIdSchema = z.enum([
  'serpapi',
  'searchapi',
  'openfarescraper',
]);

export const devProviderTestSchema = z.object({
  origin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^([A-Z]{3})(\s*,\s*[A-Z]{3})*$/,
      'Origin must be a 3-letter IATA code or comma-separated IATA codes (e.g. JFK or NYC)'
    ),
  destination: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^([A-Z]{3})(\s*,\s*[A-Z]{3})*$/,
      'Destination must be a 3-letter IATA code or comma-separated IATA codes (e.g. LAX or WAS)'
    ),
  departureDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Departure date must be YYYY-MM-DD'),
  cabinClass: z
    .enum(['economy', 'premium_economy', 'business', 'first'])
    .default('economy'),
  fareTier: z
    .enum(['Basic Economy', 'Standard'])
    .default('Standard'),
  airline: z
    .string()
    .trim()
    .max(32)
    .refine((val) => {
      if (!val || val.toUpperCase() === 'ALL') return true;
      const tokens = val
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      return tokens.every((token) => isAllianceKey(token) || isValidAirlineCode(token));
    }, INVALID_AIRLINE_MESSAGE)
    .optional()
    .nullable()
    .or(z.literal('')),
  flightNumber: z
    .string()
    .trim()
    .regex(/^(?:[A-Z0-9]{2}\s*)?\d{1,5}$/i, 'Flight number must be numeric (e.g. 452) or carrier + digits (e.g. DL452)')
    .optional()
    .nullable()
    .or(z.literal('')),
  providers: z
    .array(devProviderIdSchema)
    .min(1, 'Select at least one provider to test')
    .max(3)
    .transform((list) => Array.from(new Set(list))),
  overrides: z
    .object({
      serpapi: z
        .object({
          apiKey: z.string().trim().max(512).optional().nullable().or(z.literal('')),
        })
        .optional(),
      searchapi: z
        .object({
          apiKey: z.string().trim().max(512).optional().nullable().or(z.literal('')),
        })
        .optional(),
      openfarescraper: z
        .object({
          apiKey: scraperApiKeySchema,
          scraperUrl: scraperUrlSchema,
        })
        .optional(),
    })
    .optional()
    .default({}),
});

export type DevProviderTestInput = z.infer<typeof devProviderTestSchema>;

export const createApiKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'API key name is required')
    .max(80, 'API key name must be 80 characters or fewer'),
  scope: z.enum(['read', 'write', 'admin']).default('read'),
  expiresInDays: z
    .number()
    .int('Expiration must be a whole number of days')
    .min(1, 'Expiration must be at least 1 day')
    .max(3650, 'Expiration cannot exceed 3650 days')
    .optional()
    .nullable(),
});

export const publicFlightCreateSchema = flightSchema.and(
  z.object({
    status: z.enum(['Watching', 'Booked', 'Paused']).optional(),
    runInitialCheck: z.boolean().optional().default(true),
  })
);

export const publicFlightPatchSchema = z
  .object({
    searchMode: z.enum(['Route', 'FlightNumber']).optional(),
    origin: z
      .string()
      .regex(
        /^([A-Z]{3})(\s*,\s*[A-Z]{3})*$/,
        'Must be a 3-letter IATA code or comma-separated IATA codes'
      )
      .toUpperCase()
      .optional()
      .nullable(),
    destination: z
      .string()
      .regex(
        /^([A-Z]{3})(\s*,\s*[A-Z]{3})*$/,
        'Must be a 3-letter IATA code or comma-separated IATA codes'
      )
      .toUpperCase()
      .optional()
      .nullable(),
    departureDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
      .optional(),
    airline: z.string().trim().toUpperCase().optional().nullable(),
    bookingAirline: z
      .string()
      .trim()
      .toUpperCase()
      .refine((val) => !val || isValidAirlineCode(val), INVALID_AIRLINE_MESSAGE)
      .optional()
      .nullable(),
    flightNumber: z
      .string()
      .regex(/^\d+$/, 'Flight number must be numbers only')
      .optional()
      .nullable(),
    includedAirlines: commaSeparatedAirlinesOrAlliancesSchema,
    excludedAirlines: commaSeparatedAirlinesOrAlliancesSchema,
    pnr: z.string().max(10).optional().nullable(),
    fareTier: z.enum(['Basic Economy', 'Standard']).optional(),
    cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).optional(),
    baselinePrice: z.number().positive().optional().nullable(),
    purchasePrice: z.number().positive().optional().nullable(),
    originalPurchasePrice: z.number().positive().optional().nullable(),
    targetPrice: z.number().positive().optional().nullable(),
    minDropDollar: z.number().nonnegative().optional().nullable(),
    minDropPercent: z.number().nonnegative().optional().nullable(),
    notes: z.string().optional().nullable(),
    scheduleOverride: z.string().optional().nullable(),
    disableNotifications: z.number().int().min(0).max(1).optional(),
    status: z.enum(['Watching', 'Booked', 'Paused', 'Past']).optional(),
    earliestDeparture: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:MM format')
      .optional()
      .nullable()
      .or(z.literal('')),
    latestDeparture: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:MM format')
      .optional()
      .nullable()
      .or(z.literal('')),
    noRedeye: z.number().int().min(0).max(1).optional(),
    priceTrackingDirection: z.enum(['drop', 'increase', 'both']).optional(),
    minIncreaseDollar: z.number().nonnegative().optional().nullable(),
    minIncreasePercent: z.number().nonnegative().optional().nullable(),
    maxStops: z.number().int().min(0).max(2).optional().nullable(),
    currency: z.string().max(50).optional().nullable(),
    taxesAmount: z.number().nonnegative().optional().nullable(),
    taxesCurrency: z.string().trim().toUpperCase().max(10).optional().nullable().or(z.literal('')),
    monitorRouteAlternatives: z.number().int().min(0).max(1).optional(),
    bookingDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
      .optional()
      .nullable(),
    isManual: z.number().int().min(0).max(1).optional(),
    maxLayoverMinutes: z.number().int().nonnegative().optional().nullable(),
    excludedConnectingAirports: z.string().optional().nullable(),
    maxTotalDurationMinutes: z.number().int().positive().optional().nullable(),
    includedAlliances: z.string().optional().nullable(),
    excludedAlliances: z.string().optional().nullable(),
  })
  .strict();

export const publicFlightHistoryEntrySchema = z.object({
  price: z.number().positive('Price or points must be greater than zero'),
  date: z
    .string()
    .refine((val) => {
      const time = new Date(val).getTime();
      return !Number.isNaN(time) && time <= Date.now() + 60000;
    }, 'Date and time cannot be in the future')
    .optional(),
  airline: airlineCodeSchema,
  flightNumber: z
    .string()
    .regex(/^\d+$/, 'Flight number must be numeric')
    .optional()
    .nullable()
    .or(z.literal('')),
  origin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^([A-Z]{3})(\s*,\s*[A-Z]{3})*$/,
      'Origin must be a 3-letter IATA code or comma-separated IATA codes'
    )
    .optional()
    .nullable()
    .or(z.literal('')),
  destination: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^([A-Z]{3})(\s*,\s*[A-Z]{3})*$/,
      'Destination must be a 3-letter IATA code or comma-separated IATA codes'
    )
    .optional()
    .nullable()
    .or(z.literal('')),
});

export const publicFlightConvertSchema = z.object({
  purchasePrice: z.number().positive('Purchase price must be greater than zero'),
  airline: airlineCodeSchema,
  flightNumber: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Flight number must be numbers only')
    .min(1, 'Flight number is required'),
  pnr: z.string().trim().max(10).optional().nullable().or(z.literal('')),
  currency: z.string().trim().max(50).optional().nullable().or(z.literal('')),
  taxesAmount: z.number().nonnegative().optional().nullable(),
  taxesCurrency: z.string().trim().toUpperCase().max(10).optional().nullable().or(z.literal('')),
  monitorRouteAlternatives: z.number().int().min(0).max(1).optional().default(1),
  origin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-Z]{3})(\s*,\s*[A-Z]{3})*$/, 'Origin must be a 3-letter IATA code')
    .optional()
    .nullable(),
  destination: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-Z]{3})(\s*,\s*[A-Z]{3})*$/, 'Destination must be a 3-letter IATA code')
    .optional()
    .nullable(),
  includedAirlines: commaSeparatedAirlinesOrAlliancesSchema,
  excludedAirlines: commaSeparatedAirlinesOrAlliancesSchema,
  maxStops: z.number().int().min(0).max(2).optional().nullable(),
  earliestDeparture: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:MM format')
    .optional()
    .nullable()
    .or(z.literal('')),
  latestDeparture: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:MM format')
    .optional()
    .nullable()
    .or(z.literal('')),
  noRedeye: z.number().int().min(0).max(1).optional().default(0),
});

export const publicFlightRebookSchema = z.object({
  newPrice: z.number().positive('New rebooked price must be greater than zero'),
  airline: airlineCodeSchema.optional().nullable(),
  flightNumber: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Flight number must be numeric')
    .optional()
    .nullable()
    .or(z.literal('')),
  origin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Origin must be a 3-letter IATA airport code')
    .optional()
    .nullable()
    .or(z.literal('')),
  destination: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Destination must be a 3-letter IATA airport code')
    .optional()
    .nullable()
    .or(z.literal('')),
  pnr: z.string().trim().max(10).optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
  checkedAt: z
    .string()
    .refine((val) => {
      const time = new Date(val).getTime();
      return !Number.isNaN(time) && time <= Date.now() + 60000;
    }, 'Timestamp cannot be in the future')
    .optional(),
});

export const publicRouteLookupSchema = z.object({
  airline: airlineCodeSchema,
  flightNumber: z
    .string()
    .trim()
    .min(1, 'Flight number is required')
    .max(10, 'Flight number is too long'),
  departureDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Departure date must be YYYY-MM-DD')
    .optional()
    .nullable()
    .or(z.literal('')),
});