import { z } from 'zod';

export const flightSchema = z.object({
  origin: z.string().length(3).toUpperCase(),
  destination: z.string().length(3).toUpperCase(),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  airline: z.string().min(1),
  flightNumber: z.string().min(1),
  pnr: z.string().max(10).optional().nullable(),
  fareTier: z.enum(['Basic Economy', 'Standard']),
  baselinePrice: z.number().positive(),
  targetPrice: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const flightStatusSchema = z.object({
  status: z.enum(['Active', 'Paused', 'Expired']),
});

export const settingsSchema = z.object({
  serpApiKey: z.string().optional().nullable(),
  appriseUrl: z.string().url().optional().nullable().or(z.literal('')),
  timezone: z.string().min(1),
  checkHours: z.string().refine((val) => {
    try {
      const arr = JSON.parse(val);
      return Array.isArray(arr) && arr.every(n => typeof n === 'number' && n >= 0 && n <= 23);
    } catch {
      return false;
    }
  }, "Must be a valid JSON array of hours (0-23)"),
  minDropDollar: z.number().nonnegative(),
  minDropPercent: z.number().nonnegative(),
  monthlyQuota: z.number().positive(),
  globalPause: z.number().min(0).max(1),
});