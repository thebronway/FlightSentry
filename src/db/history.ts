import db from './index';
import { PriceHistory } from '../types';

export const historyDb = {
  getByFlightId: (flightId: number): PriceHistory[] => {
    return db.prepare('SELECT * FROM price_history WHERE flightId = ? ORDER BY checkedAt DESC').all(flightId) as PriceHistory[];
  },

  insert: (flightId: number, price: number, status: string): void => {
    const stmt = db.prepare(`
      INSERT INTO price_history (flightId, price, status, checkedAt)
      VALUES (@flightId, @price, @status, @checkedAt)
    `);
    stmt.run({ 
      flightId, 
      price, 
      status, 
      checkedAt: new Date().toISOString() 
    });
  },
  
  deleteByFlightId: (flightId: number): void => {
    db.prepare('DELETE FROM price_history WHERE flightId = ?').run(flightId);
  }
};