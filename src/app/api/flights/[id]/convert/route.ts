import { NextRequest, NextResponse } from 'next/server';
import { flightDb } from '@/db/flights';
import { historyDb } from '@/db/history';
import { settingsDb } from '@/db/settings';
import { calculateNextCheck } from '@/utils/queue';
import { flightLegsInputSchema, INVALID_AIRLINE_MESSAGE } from '@/utils/validation';
import { isValidAirlineCode } from '@/utils/airline';
import { isAllianceKey } from '@/utils/airlineThemes';
import { isPointsCurrency } from '@/utils/format';
import { serializeFlightLegs } from '@/utils/flightLegs';
import { getTodayDateString } from '@/utils/date';
import { requireApiAuth } from '@/services/auth/apiGuard';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const convertAirlinesFilterSchema = z
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

const convertSchema = z
  .object({
    purchasePrice: z.number().positive('Purchase price must be greater than zero'),
    airline: z.string().trim().toUpperCase().optional().nullable(),
    flightNumber: z.string().regex(/^\d+$/, 'Flight number must be numbers only').optional().nullable().or(z.literal('')),
    legs: flightLegsInputSchema,
    bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional().nullable().or(z.literal('')),
    pnr: z.string().max(10).optional().nullable().or(z.literal('')),
    currency: z.string().max(50).optional().nullable().or(z.literal('')),
    taxesAmount: z.number().nonnegative().optional().nullable(),
    taxesCurrency: z.string().trim().toUpperCase().max(10).optional().nullable().or(z.literal('')),
    monitorRouteAlternatives: z.number().min(0).max(1).optional().default(1),
    origin: z.string().optional().nullable(),
    destination: z.string().optional().nullable(),
    includedAirlines: convertAirlinesFilterSchema,
    excludedAirlines: convertAirlinesFilterSchema,
    maxStops: z.number().int().min(0).max(2).optional().nullable(),
    earliestDeparture: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:MM format").optional().nullable().or(z.literal('')),
    latestDeparture: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:MM format").optional().nullable().or(z.literal('')),
    noRedeye: z.number().min(0).max(1).optional().default(0),
    maxLayoverMinutes: z.number().int().nonnegative().optional().nullable(),
    excludedConnectingAirports: z.string().optional().nullable(),
    maxTotalDurationMinutes: z.number().int().positive().optional().nullable(),
    includedAlliances: z.string().optional().nullable(),
    excludedAlliances: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const hasLegs = Array.isArray(data.legs) && data.legs.length >= 2;
    if (!hasLegs) {
      const cleanAirline = (data.airline || '').trim().toUpperCase();
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
          message: 'Flight number is required',
        });
      }
    }
  });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  try {
    const id = parseInt(params.id, 10);
    const existing = flightDb.getById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = convertSchema.parse(body);

    const normalizedLegs = Array.isArray(parsed.legs) && parsed.legs.length >= 2 ? parsed.legs : null;
    const serializedLegs = serializeFlightLegs(normalizedLegs);
    const cleanAirline = normalizedLegs
      ? normalizedLegs[0].airline.trim().toUpperCase()
      : (parsed.airline || '').trim().toUpperCase();
    const cleanFlightNumber = normalizedLegs
      ? normalizedLegs[0].flightNumber.trim()
      : parsed.flightNumber
      ? parsed.flightNumber.trim()
      : null;
    const cleanPnr = parsed.pnr ? parsed.pnr.trim().toUpperCase() : null;
    const settings = settingsDb.get();
    const todayStr = getTodayDateString(settings.timezone);
    const effectiveBookingDate =
      parsed.bookingDate && parsed.bookingDate.trim()
        ? parsed.bookingDate.trim()
        : existing.bookingDate || todayStr;
    if (effectiveBookingDate > todayStr) {
      return NextResponse.json({ error: 'Booking date cannot be in the future.' }, { status: 400 });
    }

    let pointsList: string[] = [];
    if (settings.pointsCurrencies) {
      try {
        const p = typeof settings.pointsCurrencies === 'string'
          ? JSON.parse(settings.pointsCurrencies)
          : settings.pointsCurrencies;
        if (Array.isArray(p)) pointsList = p;
      } catch {}
    }

    const searchMode = cleanFlightNumber || normalizedLegs ? 'FlightNumber' : existing.searchMode;
    const effectiveCurrency = parsed.currency || existing.currency;
    const isPointsBooking = Boolean(
      effectiveCurrency && (isPointsCurrency(effectiveCurrency) || pointsList.includes(effectiveCurrency))
    );
    const effectiveIsManual = isPointsBooking ? 1 : (existing.isManual ?? 0);
    const normalizedTaxesAmount =
      isPointsBooking && parsed.taxesAmount && parsed.taxesAmount > 0 ? parsed.taxesAmount : null;
    const normalizedTaxesCurrency = normalizedTaxesAmount
      ? (parsed.taxesCurrency || settings.currency || 'USD').trim().toUpperCase()
      : null;
    const effectiveOrigin = normalizedLegs
      ? normalizedLegs[0].origin
      : parsed.origin
      ? parsed.origin.trim().toUpperCase()
      : existing.origin;
    const effectiveDestination = normalizedLegs
      ? normalizedLegs[normalizedLegs.length - 1].destination
      : parsed.destination
      ? parsed.destination.trim().toUpperCase()
      : existing.destination;

    // Update flight record in place
    flightDb.update(id, {
      status: effectiveIsManual === 1 || existing.status === 'Paused' ? 'Paused' : 'Booked',
      isManual: effectiveIsManual,
      disableNotifications: effectiveIsManual === 1 ? 1 : existing.disableNotifications,
      purchasePrice: parsed.purchasePrice,
      originalPurchasePrice: existing.originalPurchasePrice ?? parsed.purchasePrice,
      bookingDate: effectiveBookingDate,
      priceTrackingDirection: 'drop',
      airline: cleanAirline,
      bookingAirline: existing.bookingAirline || cleanAirline,
      flightNumber: cleanFlightNumber,
      legs: serializedLegs,
      pnr: cleanPnr,
      searchMode,
      currency: effectiveCurrency,
      taxesAmount: normalizedTaxesAmount,
      taxesCurrency: normalizedTaxesCurrency,
      monitorRouteAlternatives: effectiveIsManual === 1 ? 0 : (parsed.monitorRouteAlternatives !== undefined ? parsed.monitorRouteAlternatives : 1),
      origin: effectiveOrigin,
      destination: effectiveDestination,
      includedAirlines: parsed.includedAirlines !== undefined ? parsed.includedAirlines : existing.includedAirlines,
      excludedAirlines: parsed.excludedAirlines !== undefined ? parsed.excludedAirlines : existing.excludedAirlines,
      maxStops: parsed.maxStops !== undefined ? parsed.maxStops : existing.maxStops,
      earliestDeparture: parsed.earliestDeparture !== undefined ? parsed.earliestDeparture : existing.earliestDeparture,
      latestDeparture: parsed.latestDeparture !== undefined ? parsed.latestDeparture : existing.latestDeparture,
      noRedeye: parsed.noRedeye !== undefined ? parsed.noRedeye : existing.noRedeye,
      maxLayoverMinutes: parsed.maxLayoverMinutes !== undefined ? parsed.maxLayoverMinutes : existing.maxLayoverMinutes,
      excludedConnectingAirports: parsed.excludedConnectingAirports !== undefined ? parsed.excludedConnectingAirports : existing.excludedConnectingAirports,
      maxTotalDurationMinutes: parsed.maxTotalDurationMinutes !== undefined ? parsed.maxTotalDurationMinutes : existing.maxTotalDurationMinutes,
      includedAlliances: parsed.includedAlliances !== undefined ? parsed.includedAlliances : existing.includedAlliances,
      excludedAlliances: parsed.excludedAlliances !== undefined ? parsed.excludedAlliances : existing.excludedAlliances,
    });

    // Record milestone entry in price_history
    historyDb.insert(id, parsed.purchasePrice, 'Booked', {
      airline: cleanAirline,
      flightNumber: cleanFlightNumber,
      metadata: JSON.stringify({
        milestone: isPointsBooking ? 'Purchased Flight (Points)' : 'Purchased Flight',
        pnr: cleanPnr,
        legs: normalizedLegs || undefined,
        taxesAmount: normalizedTaxesAmount,
        taxesCurrency: normalizedTaxesCurrency,
      }),
      sourceUsed: 'Price Paid',
    });

    // Recalculate schedule queue
    const updated = flightDb.getById(id);
    if (updated) {
      const nextCheckAt = calculateNextCheck(updated, settings);
      flightDb.updateNextCheckAt(id, nextCheckAt);
    }

    return NextResponse.json(flightDb.getById(id));
  } catch (error: any) {
    console.error('Error converting flight to booked:', error);
    return NextResponse.json(
      { error: error.errors?.[0]?.message || error.message || 'Invalid input' },
      { status: 400 }
    );
  }
}