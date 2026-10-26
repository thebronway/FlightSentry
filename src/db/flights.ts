import db from './index';
import { Flight } from '../types';

export const flightDb = {
  getAll: (): Flight[] => {
    return db.prepare('SELECT * FROM flights ORDER BY departureDate ASC').all() as Flight[];
  },

  getById: (id: number): Flight | undefined => {
    return db.prepare('SELECT * FROM flights WHERE id = ?').get(id) as Flight | undefined;
  },
  getNextDueFlight: (): Flight | undefined => {
    const now = new Date().toISOString();
    return db.prepare(`
      SELECT * FROM flights 
      WHERE status = 'Active' AND nextCheckAt <= @now 
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
        notes, scheduleOverride, disableNotifications, nextCheckAt, status, createdAt, updatedAt
      ) VALUES (
        @searchMode, @origin, @destination, @departureDate, @airline, @flightNumber, 
        @includedAirlines, @excludedAirlines, @pnr, @fareTier, @cabinClass, @baselinePrice, 
        @purchasePrice, @targetPrice, @currentPrice, @minDropDollar, @minDropPercent,
        @notes, @scheduleOverride, @disableNotifications, @nextCheckAt, @status, @now, @now
      )
    `);
    
    const now = new Date().toISOString();
    const currentPrice = flight.currentPrice !== undefined ? flight.currentPrice : flight.baselinePrice;
    const purchasePrice = flight.purchasePrice ?? null;
    const targetPrice = flight.targetPrice ?? null;
    const minDropDollar = flight.minDropDollar ?? null;
    const minDropPercent = flight.minDropPercent ?? null;
    const cabinClass = flight.cabinClass || 'economy';
    const result = stmt.run({ 
      ...flight, 
      currentPrice, 
      purchasePrice, 
      targetPrice, 
      minDropDollar, 
      minDropPercent, 
      cabinClass, 
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