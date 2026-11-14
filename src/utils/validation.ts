import { z } from 'zod';
import { isMetroCode } from './coLocations';

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
  airline: z.string().optional().nullable(),
  flightNumber: z.string().regex(/^\d+$/, "Flight number must be numbers only").optional().nullable(),
  includedAirlines: z.string().optional().nullable(),
  excludedAirlines: z.string().optional().nullable(),
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
  monitorRouteAlternatives: z.number().min(0).max(1).optional().default(0),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").optional().nullable(),
  isManual: z.number().min(0).max(1).optional().default(0),
  maxLayoverMinutes: z.number().int().nonnegative().optional().nullable(),
  excludedConnectingAirports: z.string().optional().nullable(),
  maxTotalDurationMinutes: z.number().int().positive().optional().nullable(),
  includedAlliances: z.string().optional().nullable(),
  excludedAlliances: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
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
  .regex(/^fss_[a-f0-9]{64}$/, 'API key must match fss_<64 lowercase hex characters>')
  .optional()
  .nullable()
  .or(z.literal(''));

export const testScraperSchema = z.object({
  flightsentryScraperUrl: scraperUrlSchema,
  flightsentryScraperApiKey: scraperApiKeySchema,
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
  defaultIncludedAirlines: z.string().optional().nullable(),
  defaultExcludedAirlines: z.string().optional().nullable(),
  maxStoredItineraries: z.number().int().min(6).max(24).optional(),
  carrierDiversityEnabled: z.number().min(0).max(1).optional(),
  defaultMaxLayoverMinutes: z.number().int().nonnegative().optional().nullable(),
  defaultExcludedConnectingAirports: z.string().optional().nullable(),
  defaultMaxTotalDurationMinutes: z.number().int().positive().optional().nullable(),
  fallbackStrategyMode: z.enum(['sequential-query', 'balanced-usage', 'exhaust-quota']).optional(),
  roundRobinIndex: z.number().int().nonnegative().optional(),
  serpApiEnabled: z.number().min(0).max(1).optional(),
  searchApiEnabled: z.number().min(0).max(1).optional(),
  flightsentryScraperEnabled: z.number().min(0).max(1).optional(),
  flightsentryScraperPrioritizeFirst: z.number().min(0).max(1).optional(),
  flightsentryScraperUrl: scraperUrlSchema,
  flightsentryScraperApiKey: scraperApiKeySchema,
  fliEnabled: z.number().min(0).max(1).optional(),
  serpApiQuota: z.number().min(0).optional(),
  searchApiQuota: z.number().min(0).optional(),
  serpApiQuotaMode: z.enum(['monthly', 'one-time']).optional(),
  searchApiQuotaMode: z.enum(['monthly', 'one-time']).optional(),
  serpApiPaused: z.number().min(0).max(1).optional(),
  searchApiPaused: z.number().min(0).max(1).optional(),
  flightsentryScraperPaused: z.number().min(0).max(1).optional(),
  fliPaused: z.number().min(0).max(1).optional(),
  globalPause: z.number().min(0).max(1),
  githubSyncEnabled: z.number().min(0).max(1).optional(),
  pastFlightRetentionDays: z.number().int().min(1).max(3650).optional().nullable(),
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
  airline: z.string().min(1, "Carrier code is required").toUpperCase(),
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
  'flightsentry-scraper',
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
      'flightsentry-scraper': z
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