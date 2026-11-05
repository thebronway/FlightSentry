import { z } from 'zod';

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
});

export const flightStatusSchema = z.object({
  status: z.enum(['Upcoming', 'Paused', 'Past']),
});

export const settingsSchema = z.object({
  serpApiKey: z.string().optional().nullable().or(z.literal('')),
  searchApiKey: z.string().optional().nullable().or(z.literal('')),
  hasdataApiKey: z.string().optional().nullable().or(z.literal('')),
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
  hasdataResetDate: z.string().optional().nullable().or(z.literal('')),
  quotaResetDay: z.number().int().min(1).max(31).optional(),
  serpApiResetDay: z.number().int().min(1).max(31).optional().nullable(),
  searchApiResetDay: z.number().int().min(1).max(31).optional().nullable(),
  hasdataResetDay: z.number().int().min(1).max(31).optional().nullable(),
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
  fallbackStrategyMode: z.enum(['sequential-query', 'balanced-usage', 'exhaust-quota']).optional(),
  roundRobinIndex: z.number().int().nonnegative().optional(),
  serpApiEnabled: z.number().min(0).max(1).optional(),
  searchApiEnabled: z.number().min(0).max(1).optional(),
  hasdataEnabled: z.number().min(0).max(1).optional(),
  fastFlightsEnabled: z.number().min(0).max(1).optional(),
  fliEnabled: z.number().min(0).max(1).optional(),
  serpApiQuota: z.number().min(0).optional(),
  searchApiQuota: z.number().min(0).optional(),
  hasdataQuota: z.number().min(0).optional(),
  fastFlightsQuota: z.number().min(0).optional(),
  serpApiPaused: z.number().min(0).max(1).optional(),
  searchApiPaused: z.number().min(0).max(1).optional(),
  hasdataPaused: z.number().min(0).max(1).optional(),
  fastFlightsPaused: z.number().min(0).max(1).optional(),
  fliPaused: z.number().min(0).max(1).optional(),
  globalPause: z.number().min(0).max(1),
});