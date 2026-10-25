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

  create: (flight: Omit<Flight, 'id' | 'createdAt' | 'updatedAt' | 'currentPrice'>): number => {
    const stmt = db.prepare(`
      INSERT INTO flights (
        searchMode, origin, destination, departureDate, airline, flightNumber, 
        includedAirlines, excludedAirlines, pnr, fareTier, baselinePrice, 
        targetPrice, currentPrice, notes, scheduleOverride, disableNotifications, nextCheckAt, status, createdAt, updatedAt
      ) VALUES (
        @searchMode, @origin, @destination, @departureDate, @airline, @flightNumber, 
        @includedAirlines, @excludedAirlines, @pnr, @fareTier, @baselinePrice, 
        @targetPrice, @baselinePrice, @notes, @scheduleOverride, @disableNotifications, @nextCheckAt, @status, @now, @now
      )
    `);
    
    const now = new Date().toISOString();
    const result = stmt.run({ ...flight, now });
    return result.lastInsertRowid as number;
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