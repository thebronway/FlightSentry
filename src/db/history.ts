import db from './index';
import { PriceHistory } from '../types';

export const historyDb = {
  getByFlightId: (flightId: number): PriceHistory[] => {
    return db.prepare('SELECT * FROM price_history WHERE flightId = ? ORDER BY checkedAt DESC').all(flightId) as PriceHistory[];
  },

  insert: (
    flightId: number,
    price: number,
    status: string,
    details?: {
      airline?: string | null;
      flightNumber?: string | null;
      metadata?: string | null;
      sourceUsed?: string | null;
    }
  ): void => {
    const stmt = db.prepare(`
      INSERT INTO price_history (flightId, price, status, airline, flightNumber, metadata, sourceUsed, checkedAt)
      VALUES (@flightId, @price, @status, @airline, @flightNumber, @metadata, @sourceUsed, @checkedAt)
    `);
    stmt.run({
      flightId,
      price,
      status,
      airline: details?.airline ?? null,
      flightNumber: details?.flightNumber ?? null,
      metadata: details?.metadata ?? null,
      sourceUsed: details?.sourceUsed ?? null,
      checkedAt: new Date().toISOString(),
    });
  },
  
  deleteByFlightId: (flightId: number): void => {
    db.prepare('DELETE FROM price_history WHERE flightId = ?').run(flightId);
  }
};