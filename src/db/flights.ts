import db from './index';
import { Flight } from '../types';
import { historyDb } from './history';

export const flightDb = {
  getAll: (): Flight[] => {
    return db.prepare(`
      SELECT f.*,
        (SELECT MIN(price) FROM price_history WHERE flightId = f.id AND status IN ('Success', 'Booked')) as allTimeLow,
        (SELECT MAX(price) FROM price_history WHERE flightId = f.id AND status IN ('Success', 'Booked')) as allTimeHigh,
        (SELECT metadata FROM price_history WHERE flightId = f.id AND status IN ('Success', 'Booked') AND metadata IS NOT NULL ORDER BY checkedAt DESC LIMIT 1) as latestMetadata
      FROM flights f
      ORDER BY f.departureDate ASC
    `).all() as Flight[];
  },

  getById: (id: number): Flight | undefined => {
    return db.prepare(`
      SELECT f.*,
        (SELECT MIN(price) FROM price_history WHERE flightId = f.id AND status IN ('Success', 'Booked')) as allTimeLow,
        (SELECT MAX(price) FROM price_history WHERE flightId = f.id AND status IN ('Success', 'Booked')) as allTimeHigh,
        (SELECT metadata FROM price_history WHERE flightId = f.id AND status IN ('Success', 'Booked') AND metadata IS NOT NULL ORDER BY checkedAt DESC LIMIT 1) as latestMetadata
      FROM flights f
      WHERE f.id = ?
    `).get(id) as Flight | undefined;
  },
  getNextDueFlight: (): Flight | undefined => {
    const now = new Date().toISOString();
    return db.prepare(`
      SELECT * FROM flights 
      WHERE status IN ('Watching', 'Booked') AND nextCheckAt <= @now 
      ORDER BY nextCheckAt ASC LIMIT 1
    `).get({ now }) as Flight | undefined;
  },
  updateNextCheckAt: (id: number, nextCheckAt: string): void => {
    db.prepare('UPDATE flights SET nextCheckAt = @nextCheckAt, updatedAt = @now WHERE id = @id')
      .run({ id, nextCheckAt, now: new Date().toISOString() });
  },

  create: (flight: Omit<Flight, 'id' | 'createdAt' | 'updatedAt' | 'currentPrice'> & { currentPrice?: number }): number => {
    const stmt = db.prepare(`
      INSERT INTO flights (
        searchMode, origin, destination, departureDate, airline, flightNumber, 
        includedAirlines, excludedAirlines, pnr, fareTier, cabinClass, baselinePrice, 
        purchasePrice, originalPurchasePrice, targetPrice, currentPrice, minDropDollar, minDropPercent,
        notes, scheduleOverride, disableNotifications, nextCheckAt, status,
        earliestDeparture, latestDeparture, noRedeye, priceTrackingDirection,
        minIncreaseDollar, minIncreasePercent, maxStops, currency,
        monitorRouteAlternatives, bookingDate, isManual,
        maxLayoverMinutes, excludedConnectingAirports, maxTotalDurationMinutes,
        includedAlliances, excludedAlliances, createdAt, updatedAt
      ) VALUES (
        @searchMode, @origin, @destination, @departureDate, @airline, @flightNumber, 
        @includedAirlines, @excludedAirlines, @pnr, @fareTier, @cabinClass, @baselinePrice, 
        @purchasePrice, @originalPurchasePrice, @targetPrice, @currentPrice, @minDropDollar, @minDropPercent,
        @notes, @scheduleOverride, @disableNotifications, @nextCheckAt, @status,
        @earliestDeparture, @latestDeparture, @noRedeye, @priceTrackingDirection,
        @minIncreaseDollar, @minIncreasePercent, @maxStops, @currency,
        @monitorRouteAlternatives, @bookingDate, @isManual,
        @maxLayoverMinutes, @excludedConnectingAirports, @maxTotalDurationMinutes,
        @includedAlliances, @excludedAlliances, @now, @now
      )
    `);
    
    const now = new Date().toISOString();
    const currentPrice = flight.currentPrice !== undefined ? flight.currentPrice : flight.baselinePrice;
    const purchasePrice = flight.purchasePrice ?? null;
    const originalPurchasePrice = flight.originalPurchasePrice ?? purchasePrice;
    const targetPrice = flight.targetPrice ?? null;
    const minDropDollar = flight.minDropDollar ?? null;
    const minDropPercent = flight.minDropPercent ?? null;
    const cabinClass = flight.cabinClass || 'economy';
    const earliestDeparture = flight.earliestDeparture || null;
    const latestDeparture = flight.latestDeparture || null;
    const noRedeye = flight.noRedeye ? 1 : 0;
    const priceTrackingDirection = flight.priceTrackingDirection || 'drop';
    const minIncreaseDollar = flight.minIncreaseDollar ?? null;
    const minIncreasePercent = flight.minIncreasePercent ?? null;
    const maxStops = flight.maxStops ?? null;
    const currency = flight.currency || null;
    const monitorRouteAlternatives = flight.monitorRouteAlternatives ? 1 : 0;
    const bookingDate = flight.bookingDate ?? null;
    const isManual = flight.isManual ? 1 : 0;
    const maxLayoverMinutes = flight.maxLayoverMinutes ?? null;
    const excludedConnectingAirports = flight.excludedConnectingAirports ?? null;
    const maxTotalDurationMinutes = flight.maxTotalDurationMinutes ?? null;
    const includedAlliances = flight.includedAlliances ?? null;
    const excludedAlliances = flight.excludedAlliances ?? null;

    const result = stmt.run({
      ...flight, 
      currentPrice, 
      purchasePrice, 
      originalPurchasePrice,
      targetPrice, 
      minDropDollar,
      minDropPercent, 
      cabinClass,
      earliestDeparture,
      latestDeparture,
      noRedeye,
      priceTrackingDirection,
      minIncreaseDollar,
      minIncreasePercent,
      maxStops,
      currency,
      monitorRouteAlternatives,
      bookingDate,
      isManual,
      maxLayoverMinutes,
      excludedConnectingAirports,
      maxTotalDurationMinutes,
      includedAlliances,
      excludedAlliances,
      now 
    });
    return result.lastInsertRowid as number;
  },

  update: (id: number, data: Partial<Flight>): void => {
    const current = flightDb.getById(id);
    if (!current) return;
    const merged = { ...current, ...data, updatedAt: new Date().toISOString() };
    const stmt = db.prepare(`
      UPDATE flights SET
        searchMode = @searchMode,
        origin = @origin,
        destination = @destination,
        departureDate = @departureDate,
        airline = @airline,
        flightNumber = @flightNumber,
        includedAirlines = @includedAirlines,
        excludedAirlines = @excludedAirlines,
        pnr = @pnr,
        fareTier = @fareTier,
        cabinClass = @cabinClass,
        baselinePrice = @baselinePrice,
        purchasePrice = @purchasePrice,
        originalPurchasePrice = @originalPurchasePrice,
        minDropDollar = @minDropDollar,
        minDropPercent = @minDropPercent,
        notes = @notes,
        scheduleOverride = @scheduleOverride,
        disableNotifications = @disableNotifications,
        status = @status,
        earliestDeparture = @earliestDeparture,
        latestDeparture = @latestDeparture,
        noRedeye = @noRedeye,
        priceTrackingDirection = @priceTrackingDirection,
        minIncreaseDollar = @minIncreaseDollar,
        minIncreasePercent = @minIncreasePercent,
        maxStops = @maxStops,
        currency = @currency,
        monitorRouteAlternatives = @monitorRouteAlternatives,
        bookingDate = @bookingDate,
        isManual = @isManual,
        maxLayoverMinutes = @maxLayoverMinutes,
        excludedConnectingAirports = @excludedConnectingAirports,
        maxTotalDurationMinutes = @maxTotalDurationMinutes,
        includedAlliances = @includedAlliances,
        excludedAlliances = @excludedAlliances,
        updatedAt = @updatedAt
      WHERE id = @id
    `);
    stmt.run(merged);
  },
  
  updatePrice: (id: number, currentPrice: number): void => {
    const stmt = db.prepare(`
      UPDATE flights 
      SET currentPrice = @currentPrice, updatedAt = @now 
      WHERE id = @id
    `);
    stmt.run({ id, currentPrice, now: new Date().toISOString() });
  },

  updateStatus: (id: number, status: Flight['status']): void => {
    const stmt = db.prepare('UPDATE flights SET status = @status, updatedAt = @now WHERE id = @id');
    stmt.run({ id, status, now: new Date().toISOString() });
  },

  rebook: (
    id: number,
    newPrice: number,
    details?: {
      airline?: string | null;
      flightNumber?: string | null;
      origin?: string | null;
      destination?: string | null;
      pnr?: string | null;
      notes?: string | null;
      checkedAt?: string | null;
    }
  ): Flight | undefined => {
    const flight = flightDb.getById(id);
    if (!flight) return undefined;

    const oldPurchasePrice = flight.purchasePrice || flight.baselinePrice;
    const originalPurchasePrice = flight.originalPurchasePrice || oldPurchasePrice;
    const now = new Date().toISOString();
    const checkedAt = details?.checkedAt || now;
    const creditClaimed = Math.max(0, oldPurchasePrice - newPrice);

    const rebookTx = db.transaction(() => {
      const stmt = db.prepare(`
        UPDATE flights SET
          originalPurchasePrice = @originalPurchasePrice,
          purchasePrice = @newPrice,
          currentPrice = @newPrice,
          airline = COALESCE(@airline, airline),
          flightNumber = COALESCE(@flightNumber, flightNumber),
          origin = COALESCE(@origin, origin),
          destination = COALESCE(@destination, destination),
          pnr = COALESCE(@pnr, pnr),
          notes = COALESCE(@notes, notes),
          updatedAt = @now
        WHERE id = @id
      `);
      stmt.run({
        id,
        originalPurchasePrice,
        newPrice,
        airline: details?.airline ? details.airline.trim().toUpperCase() : null,
        flightNumber: details?.flightNumber ? details.flightNumber.trim() : null,
        origin: details?.origin ? details.origin.trim().toUpperCase() : null,
        destination: details?.destination ? details.destination.trim().toUpperCase() : null,
        pnr: details?.pnr ? details.pnr.trim().toUpperCase() : null,
        notes: details?.notes !== undefined ? details.notes : null,
        now,
      });

      historyDb.insert(id, newPrice, 'Booked', {
        airline: details?.airline || flight.airline,
        flightNumber: details?.flightNumber || flight.flightNumber,
        metadata: JSON.stringify({
          milestone: 'Rebooked Flight',
          previousPrice: oldPurchasePrice,
          creditClaimed,
          pnr: details?.pnr || flight.pnr || null,
        }),
        sourceUsed: 'Price Paid',
        checkedAt,
      });
    });

    rebookTx();
    return flightDb.getById(id);
  },

  countPastFlights: (cutoffDepartureDate?: string | null): number => {
    if (cutoffDepartureDate) {
      const row = db
        .prepare("SELECT COUNT(*) as count FROM flights WHERE status = 'Past' AND departureDate < ?")
        .get(cutoffDepartureDate) as { count: number } | undefined;
      return row?.count ?? 0;
    }
    const row = db
      .prepare("SELECT COUNT(*) as count FROM flights WHERE status = 'Past'")
      .get() as { count: number } | undefined;
    return row?.count ?? 0;
  },

  purgePastFlights: (cutoffDepartureDate?: string | null): number => {
    if (cutoffDepartureDate) {
      const info = db
        .prepare("DELETE FROM flights WHERE status = 'Past' AND departureDate < ?")
        .run(cutoffDepartureDate);
      return info.changes;
    }
    const info = db.prepare("DELETE FROM flights WHERE status = 'Past'").run();
    return info.changes;
  },

  delete: (id: number): void => {
    db.prepare('DELETE FROM flights WHERE id = ?').run(id);
  }
};