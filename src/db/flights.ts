import db from './index';
import { Flight } from '../types';

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
      WHERE status = 'Upcoming' AND nextCheckAt <= @now 
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
        purchasePrice, targetPrice, currentPrice, minDropDollar, minDropPercent,
        notes, scheduleOverride, disableNotifications, nextCheckAt, status,
        earliestDeparture, latestDeparture, noRedeye, priceTrackingDirection,
        minIncreaseDollar, minIncreasePercent, maxStops, currency, createdAt, updatedAt
      ) VALUES (
        @searchMode, @origin, @destination, @departureDate, @airline, @flightNumber, 
        @includedAirlines, @excludedAirlines, @pnr, @fareTier, @cabinClass, @baselinePrice, 
        @purchasePrice, @targetPrice, @currentPrice, @minDropDollar, @minDropPercent,
        @notes, @scheduleOverride, @disableNotifications, @nextCheckAt, @status,
        @earliestDeparture, @latestDeparture, @noRedeye, @priceTrackingDirection,
        @minIncreaseDollar, @minIncreasePercent, @maxStops, @currency, @now, @now
      )
    `);
    
    const now = new Date().toISOString();
    const currentPrice = flight.currentPrice !== undefined ? flight.currentPrice : flight.baselinePrice;
    const purchasePrice = flight.purchasePrice ?? null;
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

    const result = stmt.run({
      ...flight, 
      currentPrice, 
      purchasePrice, 
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

  delete: (id: number): void => {
    db.prepare('DELETE FROM flights WHERE id = ?').run(id);
  }
};