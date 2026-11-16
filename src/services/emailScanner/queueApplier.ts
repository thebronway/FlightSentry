import { EmailQueueItem, Flight } from '../../types';
import { emailQueueDb } from '../../db/emailQueue';
import { flightDb } from '../../db/flights';
import { historyDb } from '../../db/history';
import { settingsDb } from '../../db/settings';
import { isValidAirlineCode } from '../../utils/airline';
import { getTodayDateString } from '../../utils/date';

export interface ApplyQueueItemResult {
  queueItemId: number;
  flightId: number;
  eventType: EmailQueueItem['eventType'];
}

export interface BulkApplyQueueResult {
  applied: ApplyQueueItemResult[];
  failed: Array<{ id: number; error: string }>;
}

export function applyEmailQueueItem(
  queueItemId: number,
  overrides?: Partial<
    Pick<
      EmailQueueItem,
      | 'eventType'
      | 'pnr'
      | 'airline'
      | 'flightNumber'
      | 'origin'
      | 'destination'
      | 'departureDate'
      | 'departureTime'
      | 'arrivalTime'
      | 'cabinClass'
      | 'fareTier'
      | 'price'
      | 'currency'
      | 'matchedFlightId'
    >
  >
): ApplyQueueItemResult {
  const existing = emailQueueDb.getById(queueItemId);
  if (!existing) {
    throw new Error('Queued email item not found');
  }
  if (existing.status !== 'pending') {
    throw new Error(`Queued email item has already been ${existing.status}`);
  }

  if (overrides && Object.keys(overrides).length > 0) {
    emailQueueDb.updateFields(queueItemId, overrides);
  }

  const item = emailQueueDb.getById(queueItemId)!;
  const settings = settingsDb.get();

  if (item.eventType === 'new_booking') {
    const origin = (item.origin || '').trim().toUpperCase();
    const destination = (item.destination || '').trim().toUpperCase();
    const departureDate = (item.departureDate || '').trim();

    if (!/^[A-Z]{3}$/.test(origin)) {
      throw new Error('Origin 3-letter IATA airport code is required. Click "Edit Before Adding" to complete it.');
    }
    if (!/^[A-Z]{3}$/.test(destination)) {
      throw new Error('Destination 3-letter IATA airport code is required. Click "Edit Before Adding" to complete it.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(departureDate)) {
      throw new Error('Departure date (YYYY-MM-DD) is required. Click "Edit Before Adding" to complete it.');
    }

    const rawCarrier = (item.airline || '').trim().toUpperCase();
    const validCarrier = isValidAirlineCode(rawCarrier) ? rawCarrier : null;
    const rawFlightNum = (item.flightNumber || '').trim().replace(/\D+/g, '');
    const hasSpecificFlight = Boolean(validCarrier && rawFlightNum);

    const searchMode: Flight['searchMode'] = hasSpecificFlight ? 'FlightNumber' : 'Route';
    const airlineCode = validCarrier || 'MANUAL';
    const isManual = validCarrier ? 0 : 1;

    const paidPrice =
      typeof item.price === 'number' && !Number.isNaN(item.price) && item.price > 0
        ? item.price
        : null;
    const initialBaseline = paidPrice ?? 0;

    const cabinClass = item.cabinClass || settings.defaultCabinClass || 'economy';
    const fareTier = item.fareTier || settings.defaultFareTier || 'Standard';
    const currency = (item.currency || settings.currency || 'USD').trim().toUpperCase();
    const bookingDate =
      item.emailDate && /^\d{4}-\d{2}-\d{2}/.test(item.emailDate)
        ? item.emailDate.slice(0, 10)
        : getTodayDateString(settings.timezone);

    const scheduleNotes: string[] = [`Imported from email (${item.accountLabel})`];
    if (item.departureTime || item.arrivalTime) {
      scheduleNotes.push(
        `Scheduled ${item.departureTime || '?'} - ${item.arrivalTime || '?'}`
      );
    }

    const newFlightId = flightDb.create({
      searchMode,
      origin,
      destination,
      departureDate,
      airline: airlineCode,
      bookingAirline: validCarrier || null,
      flightNumber: hasSpecificFlight ? rawFlightNum : null,
      includedAirlines: !hasSpecificFlight && validCarrier ? validCarrier : null,
      excludedAirlines: null,
      pnr: item.pnr ? item.pnr.trim().toUpperCase() : null,
      fareTier,
      cabinClass,
      baselinePrice: initialBaseline,
      purchasePrice: paidPrice,
      originalPurchasePrice: paidPrice,
      targetPrice: null,
      currentPrice: initialBaseline,
      minDropDollar: null,
      minDropPercent: null,
      notes: scheduleNotes.join(' · '),
      scheduleOverride: null,
      disableNotifications: 0,
      nextCheckAt: isManual
        ? new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()
        : new Date().toISOString(),
      status: isManual ? 'Paused' : 'Booked',
      earliestDeparture: null,
      latestDeparture: null,
      noRedeye: 0,
      priceTrackingDirection: 'drop',
      minIncreaseDollar: null,
      minIncreasePercent: null,
      maxStops: null,
      currency,
      monitorRouteAlternatives: 0,
      bookingDate,
      isManual,
      maxLayoverMinutes: null,
      excludedConnectingAirports: null,
      maxTotalDurationMinutes: null,
      includedAlliances: null,
      excludedAlliances: null,
    });

    historyDb.insert(newFlightId, initialBaseline, 'Booked', {
      airline: validCarrier,
      flightNumber: hasSpecificFlight ? rawFlightNum : null,
      metadata: JSON.stringify({
        milestone: 'Imported from Email',
        accountLabel: item.accountLabel,
        pnr: item.pnr || null,
      }),
      sourceUsed: 'Email Scanner',
    });

    emailQueueDb.markApplied(queueItemId);
    return {
      queueItemId,
      flightId: newFlightId,
      eventType: 'new_booking',
    };
  }

  if (item.eventType === 'schedule_change') {
    if (!item.matchedFlightId) {
      throw new Error(
        'No existing tracked flight matched this schedule change. Click "Edit Before Adding" to select the flight to update.'
      );
    }

    const targetFlight = flightDb.getById(item.matchedFlightId);
    if (!targetFlight) {
      throw new Error(
        'The matched tracked flight no longer exists. Click "Edit Before Adding" to choose another flight.'
      );
    }

    const updatedCarrier =
      item.airline && isValidAirlineCode(item.airline)
        ? item.airline.trim().toUpperCase()
        : targetFlight.airline;
    const updatedFlightNum = item.flightNumber
      ? item.flightNumber.trim().replace(/\D+/g, '')
      : targetFlight.flightNumber;
    const updatedOrigin =
      item.origin && /^[A-Z]{3}$/.test(item.origin)
        ? item.origin.trim().toUpperCase()
        : targetFlight.origin;
    const updatedDest =
      item.destination && /^[A-Z]{3}$/.test(item.destination)
        ? item.destination.trim().toUpperCase()
        : targetFlight.destination;
    const updatedDate =
      item.departureDate && /^\d{4}-\d{2}-\d{2}$/.test(item.departureDate)
        ? item.departureDate.trim()
        : targetFlight.departureDate;
    const updatedPnr = item.pnr ? item.pnr.trim().toUpperCase() : targetFlight.pnr;

    const canTrackSpecificFlight = Boolean(
      isValidAirlineCode(updatedCarrier) && updatedFlightNum
    );

    const changeNote = `Schedule change applied from ${item.accountLabel}${
      item.departureTime ? ` (Dep ${item.departureTime})` : ''
    }`;
    const nextNotes = targetFlight.notes
      ? `${targetFlight.notes} | ${changeNote}`
      : changeNote;

    flightDb.update(targetFlight.id, {
      searchMode: canTrackSpecificFlight ? 'FlightNumber' : targetFlight.searchMode,
      airline: updatedCarrier,
      flightNumber: updatedFlightNum || null,
      origin: updatedOrigin,
      destination: updatedDest,
      departureDate: updatedDate,
      pnr: updatedPnr,
      notes: nextNotes,
    });

    historyDb.insert(
      targetFlight.id,
      targetFlight.currentPrice,
      targetFlight.status === 'Booked' ? 'Booked' : 'Success',
      {
        airline: updatedCarrier,
        flightNumber: updatedFlightNum || null,
        metadata: JSON.stringify({
          milestone: 'Schedule Change Applied',
          accountLabel: item.accountLabel,
          departureDate: updatedDate,
          departureTime: item.departureTime || null,
          arrivalTime: item.arrivalTime || null,
        }),
        sourceUsed: 'Email Scanner',
      }
    );

    emailQueueDb.markApplied(queueItemId);
    return {
      queueItemId,
      flightId: targetFlight.id,
      eventType: 'schedule_change',
    };
  }

  // eventType === 'cancellation'
  if (!item.matchedFlightId) {
    throw new Error(
      'No existing tracked flight matched this cancellation notice. Click "Edit Before Adding" to select the flight to pause.'
    );
  }

  const targetFlight = flightDb.getById(item.matchedFlightId);
  if (!targetFlight) {
    throw new Error(
      'The matched tracked flight no longer exists. Click "Edit Before Adding" to choose another flight.'
    );
  }

  const cancelNote = `Flight cancelled per email (${item.accountLabel})`;
  const nextNotes = targetFlight.notes
    ? targetFlight.notes.includes(cancelNote)
      ? targetFlight.notes
      : `${targetFlight.notes} | ${cancelNote}`
    : cancelNote;

  flightDb.update(targetFlight.id, {
    status: 'Paused',
    notes: nextNotes,
  });

  historyDb.insert(targetFlight.id, targetFlight.currentPrice, 'Paused', {
    airline: targetFlight.airline,
    flightNumber: targetFlight.flightNumber,
    metadata: JSON.stringify({
      milestone: 'Flight Cancelled (Email)',
      accountLabel: item.accountLabel,
      pnr: item.pnr || targetFlight.pnr || null,
    }),
    sourceUsed: 'Email Scanner',
  });

  emailQueueDb.markApplied(queueItemId);
  return {
    queueItemId,
    flightId: targetFlight.id,
    eventType: 'cancellation',
  };
}

export function applyBulkEmailQueueItems(ids: number[]): BulkApplyQueueResult {
  const applied: ApplyQueueItemResult[] = [];
  const failed: Array<{ id: number; error: string }> = [];

  for (const id of ids) {
    try {
      const res = applyEmailQueueItem(id);
      applied.push(res);
    } catch (err: any) {
      failed.push({
        id,
        error: err?.message || 'Unable to apply queue item',
      });
    }
  }

  return { applied, failed };
}